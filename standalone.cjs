#!/usr/bin/env node
/*
 Standalone server to host the built React app (dist) and open the default browser.
 This script can be compiled into a single Windows .exe using `pkg`.
 Also provides an image download endpoint for displaying pictures.
*/
const http = require('http');
const path = require('path');
const fs = require('fs');
const handler = require('serve-handler');
const os = require('os');
const { URL } = require('url');
const { setTimeout: delay } = require('timers/promises');
const crypto = require('crypto');
const formidable = require('formidable');

// ---------- Helpers for image downloading ----------
const fsp = fs.promises;
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw9Nqqbd0uxeXhNV3Bt4EZppM6ib7DD1knuvPjZIQZBxsEpBQ0jQCRXZU1iAOFbbPjEsg/exec';

// Google Cloud Storage configuration
const GCS_CONFIG = {
  bucketName: process.env.GCS_BUCKET_NAME || 'applicant-connect-images',
  projectId: process.env.GCS_PROJECT_ID || 'your-project-id',
  keyFilename: process.env.GCS_KEY_FILE || path.join(__dirname, 'gcs-key.json'),
  keyJson: process.env.GCS_KEY_JSON || null, // For Netlify deployment
  baseUrl: process.env.GCS_BASE_URL || 'https://storage.googleapis.com'
};

// Hold a singleton bucket handle when credentials are valid
let gcsBucket = null;

// Initialize GCS credentials for Netlify deployment
async function initializeGCSCredentials() {
  // If GCS_KEY_JSON is provided (Netlify), write it to a temp file
  if (GCS_CONFIG.keyJson) {
    try {
      const tempKeyPath = path.join(os.tmpdir(), 'gcs-key-temp.json');
      await fsp.writeFile(tempKeyPath, GCS_CONFIG.keyJson);
      GCS_CONFIG.keyFilename = tempKeyPath;
      console.log('[GCS] Using JSON key from environment variable');
    } catch (error) {
      console.error('[GCS] Failed to write temporary key file:', error);
      // continue to try key file path
    }
  }
  
  // Check if key file exists locally
  const hasKeyFile = await fileExists(GCS_CONFIG.keyFilename).catch(() => false);
  if (!hasKeyFile) {
    console.log('[GCS] No credentials found, using local emulation mode');
    return false;
  }
  try {
    const { Storage } = require('@google-cloud/storage');
    const storage = new Storage({
      projectId: GCS_CONFIG.projectId,
      keyFilename: GCS_CONFIG.keyFilename
    });
    gcsBucket = storage.bucket(GCS_CONFIG.bucketName);
    // Lazy check: do not perform network call here; defer to first upload
    console.log(`[GCS] Initialized Storage client for bucket: ${GCS_CONFIG.bucketName}`);
    return true;
  } catch (e) {
    console.warn('[GCS] Failed to initialize Storage client, falling back to local emulation:', e?.message || e);
    gcsBucket = null;
    return false;
  }
}

function extractDriveId(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('drive.google.com')) return null;
  let match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    match = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  }
  return match ? match[1] : null;
}

function toLocalImageFilename(fileId) {
  return `drive_${fileId}.jpg`;
}

function isValidImageBuffer(buffer, contentType = '') {
  if (!buffer || buffer.length < 100) return false;
  const b = buffer;
  const isJPEG = b[0] === 0xFF && b[1] === 0xD8;
  const isPNG = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
  const isGIF = b.subarray(0, 3).toString() === 'GIF';
  const isWebP = b.length > 12 && b.subarray(8, 12).toString() === 'WEBP';
  const typeLooksOk = /image\//i.test(contentType || '');
  return (isJPEG || isPNG || isGIF || isWebP) && (typeLooksOk || true);
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function fileExists(filepath) {
  try {
    await fsp.access(filepath);
    return true;
  } catch {
    return false;
  }
}

async function downloadDriveFile(fileId, destPath) {
  const strategies = [
    // Screenshot-like thumbnail works for many Drive file types (images, PDFs, Docs, etc.)
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
    // Fallbacks to direct download endpoints
    `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
    `https://drive.google.com/uc?id=${fileId}&export=download`,
    `https://drive.google.com/uc?export=download&id=${fileId}`
  ];
  let lastErr;
  for (const url of strategies) {
    try {
      const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'ApplicantConnect/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const contentType = res.headers.get('content-type') || '';
      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      if (!isValidImageBuffer(buf, contentType)) {
        throw new Error(`Downloaded content is not a valid image (type=${contentType || 'unknown'}, size=${buf.length})`);
      }
      await fsp.writeFile(destPath, buf);
      return; // success
    } catch (e) {
      lastErr = e;
      await delay(200);
    }
  }
  throw new Error(`Failed all strategies for ${fileId}: ${lastErr?.message || lastErr}`);
}

function pickFirstTruthy(obj, keys) {
  for (const key of keys) {
    if (key in obj && obj[key]) return obj[key];
  }
  return undefined;
}

function getApplicantPhotoUrl(applicant) {
  const candidateKeys = [
    '  Upload a recent passport photo  ',
    'Upload a recent passport photo',
    'photourl', 'photo', 'image', 'Image URL', 'Photo URL', 'Picture',
  ];
  return pickFirstTruthy(applicant, candidateKeys);
}

// ---------- Google Cloud Storage helpers ----------
function generateGCSSignedUrl(filename, contentType, expiresIn = 60 * 60) {
  // This is a simplified version. In production, use @google-cloud/storage library
  // For now, we'll handle uploads via server-side upload endpoint
  const timestamp = Math.floor(Date.now() / 1000) + expiresIn;
  const objectName = `uploads/${Date.now()}-${filename}`;
  
  return {
    objectName,
    publicUrl: `${GCS_CONFIG.baseUrl}/${GCS_CONFIG.bucketName}/${objectName}`,
    uploadUrl: `/api/upload-direct`, // We'll handle the actual GCS upload server-side
    expiresAt: timestamp
  };
}

async function gcsUpload(filePath, objectName, contentType) {
  if (!gcsBucket) throw new Error('GCS bucket not initialized');
  const destFile = gcsBucket.file(objectName);
  // Use file.save to stream data and set metadata
  const data = await fsp.readFile(filePath);
  await destFile.save(data, {
    resumable: false,
    metadata: { contentType }
  });
  // Automatically make the object public
  try {
    await destFile.makePublic();
  } catch (e) {
    console.warn('[GCS] makePublic failed (check bucket IAM or uniform access):', e?.message || e);
  }
  // Build public URL
  const publicUrl = `${GCS_CONFIG.baseUrl}/${GCS_CONFIG.bucketName}/${objectName}`;
  return { success: true, publicUrl, objectName, bucket: GCS_CONFIG.bucketName };
}

async function uploadToGCS(filePath, objectName, contentType) {
  try {
    if (gcsBucket) {
      console.log('[GCS] Uploading to real GCS bucket...');
      return await gcsUpload(filePath, objectName, contentType);
    }
    // Local emulation fallback
    console.log('[GCS] No credentials, using local emulation for uploads');
    const gcsUploadsDir = path.join(__dirname, 'gcs-uploads');
    await ensureDir(gcsUploadsDir);
    const destPath = path.join(gcsUploadsDir, objectName.replace(/\//g, '_'));
    await fsp.copyFile(filePath, destPath);
    const publicUrl = `/gcs-uploads/${path.basename(destPath)}`;
    return { success: true, publicUrl, objectName, bucket: GCS_CONFIG.bucketName };
  } catch (error) {
    console.error('GCS upload failed:', error);
    throw error;
  }
}

// Database for tracking backed up Google Drive images
const gcsBackupDb = new Map(); // In production, use a real database

async function backupGoogleDriveImageToGCS(googleDriveUrl, driveId, metadata = {}) {
  // Check if already backed up
  if (gcsBackupDb.has(driveId)) {
    return gcsBackupDb.get(driveId);
  }

  try {
    // Download from Google Drive using existing logic
    const tempDir = path.join(__dirname, 'temp');
    await ensureDir(tempDir);
    const tempPath = path.join(tempDir, `drive_${driveId}_temp.jpg`);
    
    await downloadDriveFile(driveId, tempPath);
    
    // Upload to GCS
    const objectName = `google-drive-backup/${driveId}.jpg`;
    const uploadResult = await uploadToGCS(tempPath, objectName, 'image/jpeg');
    
    // Clean up temp file
    try {
      await fsp.unlink(tempPath);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    // Store result in backup database
    const result = {
      driveId,
      originalUrl: googleDriveUrl,
      gcsUrl: uploadResult.publicUrl,
      localUrl: `/images/drive_${driveId}.jpg`,
      backedUpAt: new Date().toISOString(),
      metadata
    };
    
    gcsBackupDb.set(driveId, result);
    return result;
    
  } catch (error) {
    console.error(`Failed to backup Google Drive image ${driveId}:`, error);
    throw error;
  }
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
}

function getSignatureUrl(record) {
  const candidateKeys = [
    'Upload a scanned copy of your Signature',
    'Signature', 'signature'
  ];
  return pickFirstTruthy(record, candidateKeys);
}

async function fetchFormsData() {
  const res = await fetch(APPS_SCRIPT_URL, { method: 'GET' });
  if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);
  return res.json();
}

// Build download tasks with optional filtering
function buildDownloadTasks(data, outDir, onlySet) {
  const applicants = Array.isArray(data?.applicants) ? data.applicants : [];
  const referees = Array.isArray(data?.referees) ? data.referees : [];
  const associates = Array.isArray(data?.associates) ? data.associates : [];

  const onlyHas = (type) => !onlySet || onlySet.has(type);
  const tasks = [];

  if (onlyHas('applicants')) {
    for (const app of applicants) {
      const url = getApplicantPhotoUrl(app);
      const id = extractDriveId(url);
      if (!id) continue;
      const destPath = path.join(outDir, toLocalImageFilename(id));
      tasks.push({ id, destPath, who: `applicant:${app.name || app.id || 'unknown'}` });
    }
  }
  if (onlyHas('referees')) {
    for (const ref of referees) {
      const url = getSignatureUrl(ref);
      const id = extractDriveId(url);
      if (!id) continue;
      const destPath = path.join(outDir, toLocalImageFilename(id));
      tasks.push({ id, destPath, who: `referee:${ref.name || ref.id || 'unknown'}` });
    }
  }
  if (onlyHas('associates')) {
    for (const assoc of associates) {
      const url = getSignatureUrl(assoc);
      const id = extractDriveId(url);
      if (!id) continue;
      const destPath = path.join(outDir, toLocalImageFilename(id));
      tasks.push({ id, destPath, who: `associate:${assoc.name || assoc.id || 'unknown'}` });
    }
  }

  // De-duplicate by destination path
  const uniqueMap = new Map();
  for (const t of tasks) {
    if (!uniqueMap.has(t.destPath)) uniqueMap.set(t.destPath, t);
  }
  return Array.from(uniqueMap.values());
}

// Database for tracking failed GCS uploads for retry
const failedGCSUploads = new Map(); // In production, use a real database

async function ensureImages(data, outDir, onlySet, force = false) {
  const tasks = buildDownloadTasks(data, outDir, onlySet);
  let ensured = 0;
  let skipped = 0;
  let gcsUploaded = 0;
  let localFallbacks = 0;
  
  for (const task of tasks) {
    try {
      // Check if already exists locally (skip unless forced)
      const localExists = await fileExists(task.destPath);
      
      // Check if already exists in GCS
      let gcsExists = false;
      let gcsUrl = null;
      if (gcsBackupDb.has(task.id)) {
        const record = gcsBackupDb.get(task.id);
        gcsExists = !!record.gcsUrl;
        gcsUrl = record.gcsUrl;
      }
      
      // Skip if both exist and not forced
      if (localExists && gcsExists && !force) {
        skipped++;
        continue;
      }
      
      // Priority 1: Try GCS upload first (primary method)
      let gcsSuccess = false;
      try {
        if (!gcsExists || force) {
          console.log(`[GCS-First] Attempting GCS upload for ${task.id}...`);
          
          // Download to temp location first
          const tempDir = path.join(__dirname, 'temp');
          await ensureDir(tempDir);
          const tempPath = path.join(tempDir, `drive_${task.id}_temp.jpg`);
          
          await downloadDriveFile(task.id, tempPath);
          
          // Upload to GCS
          const objectName = `google-drive-backup/${task.id}.jpg`;
          const uploadResult = await uploadToGCS(tempPath, objectName, 'image/jpeg');
          
          // Store in backup database
          const gcsRecord = {
            driveId: task.id,
            originalUrl: `https://drive.google.com/file/d/${task.id}/view`,
            gcsUrl: uploadResult.publicUrl,
            localUrl: `/images/drive_${task.id}.jpg`,
            backedUpAt: new Date().toISOString(),
            metadata: { who: task.who }
          };
          gcsBackupDb.set(task.id, gcsRecord);
          
          // Clean up temp file
          try {
            await fsp.unlink(tempPath);
          } catch (e) {
            // Ignore cleanup errors
          }
          
          gcsSuccess = true;
          gcsUploaded++;
          console.log(`[GCS-First] Successfully uploaded ${task.id} to GCS: ${uploadResult.publicUrl}`);
          
          // Remove from failed uploads if it was there
          failedGCSUploads.delete(task.id);
        } else {
          gcsSuccess = true; // Already exists
        }
      } catch (gcsError) {
        console.warn(`[GCS-First] GCS upload failed for ${task.id}:`, gcsError.message);
        
        // Track failed upload for retry
        failedGCSUploads.set(task.id, {
          driveId: task.id,
          who: task.who,
          lastAttempt: new Date().toISOString(),
          error: gcsError.message,
          retryCount: (failedGCSUploads.get(task.id)?.retryCount || 0) + 1
        });
        
        gcsSuccess = false;
      }
      
      // Priority 2: Local fallback (robust fallback)
      let localSuccess = false;
      try {
        if (!localExists || force || !gcsSuccess) {
          console.log(`[GCS-First] ${gcsSuccess ? 'Also ensuring' : 'Falling back to'} local storage for ${task.id}...`);
          await downloadDriveFile(task.id, task.destPath);
          localSuccess = true;
          localFallbacks++;
          console.log(`[GCS-First] Successfully saved ${task.id} locally: ${task.destPath}`);
        } else {
          localSuccess = true; // Already exists
        }
      } catch (localError) {
        console.error(`[GCS-First] Local fallback also failed for ${task.id}:`, localError.message);
        localSuccess = false;
      }
      
      // Count as ensured if either method succeeded
      if (gcsSuccess || localSuccess) {
        ensured++;
      } else {
        skipped++;
      }
      
      await delay(150);
    } catch (e) {
      console.error(`[GCS-First] Unexpected error processing ${task.id}:`, e.message);
      skipped++;
    }
  }
  
  return { 
    ensured, 
    skipped, 
    total: tasks.length, 
    gcsUploaded, 
    localFallbacks,
    failedGCSCount: failedGCSUploads.size
  };
}

// Determine the content directory (built files)
function resolveDistDir() {
  // 1) When running from source
  let tryPaths = [
    path.join(__dirname, 'dist'),
    path.join(process.cwd(), 'dist'),
    path.join(path.dirname(process.execPath || ''), 'dist')
  ];
  for (const p of tryPaths) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
    } catch {}
  }
  return null;
}

function findAvailablePort(preferredPorts = [8080, 8081, 3000, 5173]) {
  return new Promise((resolve) => {
    const tryPort = (ports) => {
      if (ports.length === 0) {
        resolve(0);
        return;
      }
      const port = ports[0];
      const server = http.createServer(() => {});
      server.once('error', () => {
        server.close(() => tryPort(ports.slice(1)));
      });
      server.once('listening', () => {
        server.close(() => resolve(port));
      });
      server.listen(port, '0.0.0.0');
    };
    tryPort(preferredPorts);
  });
}

async function openBrowser(url) {
  try {
    // Use Windows start command
    if (process.platform === 'win32') {
      const { spawn } = require('child_process');
      spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref();
      return;
    }
    // Fallback: try `open` module if available
    try {
      const open = require('open');
      await open(url);
      return;
    } catch {}
  } catch {}
}

(async () => {
  const distDir = resolveDistDir();
  if (!distDir) {
    console.error('[standalone] Could not find dist folder. Please build first: `npm run build`');
    process.exit(1);
  }

  const port = await findAvailablePort();
  if (!port) {
    console.error('[standalone] Could not find an available port (tried 8080,8081,3000,5173).');
    process.exit(1);
  }

  // Initialize GCS credentials before starting server
  await initializeGCSCredentials();

  const server = http.createServer(async (request, response) => {
    // Simple routing for the image download endpoint
    try {
      const reqUrl = new URL(request.url, 'http://localhost');
      const pathname = reqUrl.pathname;

      if (pathname === '/api/gcs/signed-url' && request.method === 'GET') {
        const filename = sanitizeFilename((reqUrl.searchParams.get('filename') || 'image').toString());
        const contentType = (reqUrl.searchParams.get('contentType') || 'image/jpeg').toString();
        const result = generateGCSSignedUrl(filename, contentType);
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/gcs/check-backup' && request.method === 'GET') {
        const driveId = (reqUrl.searchParams.get('driveId') || '').toString();
        if (!driveId) {
          response.statusCode = 400;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ exists: false, error: 'driveId required' }));
          return;
        }
        const record = gcsBackupDb.get(driveId);
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ exists: !!record, gcsUrl: record?.gcsUrl }));
        return;
      }

      if (pathname === '/api/gcs/backup-drive-image' && request.method === 'POST') {
        let body = '';
        request.on('data', chunk => { body += chunk.toString(); });
        request.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}');
            const googleDriveUrl = payload.googleDriveUrl || '';
            const driveId = payload.driveId || extractDriveId(googleDriveUrl);
            const metadata = payload.metadata || {};

            if (!googleDriveUrl || !driveId) {
              response.statusCode = 400;
              response.setHeader('Content-Type', 'application/json');
              response.end(JSON.stringify({ error: 'googleDriveUrl and driveId required' }));
              return;
            }

            const result = await backupGoogleDriveImageToGCS(googleDriveUrl, driveId, metadata);
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ ok: true, ...result }));
          } catch (e) {
            response.statusCode = 500;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ error: e.message || 'Backup failed' }));
          }
        });
        return;
      }

      if (pathname === '/api/gcs/retry-failed-uploads' && request.method === 'POST') {
        let body = '';
        request.on('data', chunk => { body += chunk.toString(); });
        request.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}');
            const maxRetries = payload.maxRetries || 3;
            const specificDriveIds = payload.driveIds || []; // Optional: retry specific IDs only
            
            if (failedGCSUploads.size === 0) {
              response.statusCode = 200;
              response.setHeader('Content-Type', 'application/json');
              response.end(JSON.stringify({ 
                success: true, 
                message: 'No failed uploads to retry',
                results: []
              }));
              return;
            }

            const toRetry = Array.from(failedGCSUploads.entries())
              .filter(([driveId, record]) => {
                // Filter by specific IDs if provided
                if (specificDriveIds.length > 0 && !specificDriveIds.includes(driveId)) {
                  return false;
                }
                // Skip if already retried too many times
                return record.retryCount < maxRetries;
              });

            const retryResults = [];
            let successCount = 0;
            let failureCount = 0;

            for (const [driveId, failedRecord] of toRetry) {
              try {
                console.log(`[Retry] Attempting to retry GCS upload for ${driveId} (attempt ${failedRecord.retryCount + 1})`);
                
                const googleDriveUrl = `https://drive.google.com/file/d/${driveId}/view`;
                const result = await backupGoogleDriveImageToGCS(googleDriveUrl, driveId, failedRecord.metadata || {});
                
                retryResults.push({
                  driveId,
                  success: true,
                  gcsUrl: result.gcsUrl,
                  retriedAt: new Date().toISOString()
                });
                
                successCount++;
                // Remove from failed map after successful retry
                failedGCSUploads.delete(driveId);
                console.log(`[Retry] Successfully uploaded ${driveId} to GCS on retry`);
                
              } catch (retryError) {
                console.warn(`[Retry] Failed to retry GCS upload for ${driveId}:`, retryError.message);
                
                // Update failed record with new retry attempt
                failedGCSUploads.set(driveId, {
                  ...failedRecord,
                  lastAttempt: new Date().toISOString(),
                  error: retryError.message,
                  retryCount: failedRecord.retryCount + 1
                });
                
                retryResults.push({
                  driveId,
                  success: false,
                  error: retryError.message,
                  retriedAt: new Date().toISOString()
                });
                
                failureCount++;
              }
              
              // Add delay between retries to avoid overwhelming GCS
              await delay(300);
            }

            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({
              success: true,
              message: `Retry completed: ${successCount} succeeded, ${failureCount} failed`,
              results: retryResults,
              totalRetried: retryResults.length,
              successCount,
              failureCount,
              remainingFailed: failedGCSUploads.size
            }));

          } catch (e) {
            response.statusCode = 500;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ 
              success: false, 
              error: e.message || 'Retry operation failed' 
            }));
          }
        });
        return;
      }

      if (pathname === '/api/upload-image' && request.method === 'POST') {
        // Accept multipart form-data and upload to GCS server-side
        const form = formidable({ multiples: false, keepExtensions: true });
        form.parse(request, async (err, fields, files) => {
          if (err) {
            response.statusCode = 400;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ error: 'Invalid form data' }));
            return;
          }
          try {
            const file = files.image && (Array.isArray(files.image) ? files.image[0] : files.image);
            if (!file || !file.filepath) {
              response.statusCode = 400;
              response.setHeader('Content-Type', 'application/json');
              response.end(JSON.stringify({ error: 'No image file provided' }));
              return;
            }
            const origName = sanitizeFilename(file.originalFilename || 'image.jpg');
            const objectName = `uploads/${Date.now()}-${origName}`;
            const contentType = file.mimetype || 'application/octet-stream';

            const uploadResult = await uploadToGCS(file.filepath, objectName, contentType);
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ ok: true, imageUrl: uploadResult.publicUrl, objectName: uploadResult.objectName }));
          } catch (e) {
            response.statusCode = 500;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ error: e.message || 'Upload failed' }));
          }
        });
        return;
      }

      if (pathname === '/download-images' && (request.method === 'POST' || request.method === 'GET')) {
        const outDir = path.join(distDir, 'images');
        await ensureDir(outDir);

        // Parse optional filters: only=applicants,referees,associates & force=true
        const onlyParam = reqUrl.searchParams.get('only');
        const onlySet = onlyParam ? new Set(onlyParam.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) : null;
        const forceParam = reqUrl.searchParams.get('force');
        const force = forceParam === '1' || (forceParam || '').toLowerCase() === 'true';

        let data;
        try {
          data = await fetchFormsData();
        } catch (e) {
          response.statusCode = 500;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ ok: false, error: `Failed to fetch data: ${e?.message || e}` }));
          return;
        }

        const { ensured, skipped, total } = await ensureImages(data, outDir, onlySet, force);

        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ ok: true, ensured, skipped, total, outputDir: path.relative(process.cwd(), outDir) }));
        return;
      }

      // Add git commit endpoint for push to web functionality
      if (pathname === '/dev/git-commit' && request.method === 'POST') {
        try {
          // Read request body
          let body = '';
          request.on('data', chunk => { body += chunk.toString(); });
          request.on('end', async () => {
            try {
              const { message } = JSON.parse(body || '{}');
              const safeMsg = (message || 'Update via standalone app').replace(/["`$\\]/g, '');

              // Read .env file for Netlify build hooks
              let netlifyHooks = [];
              try {
                const envFile = path.join(process.cwd(), '.env');
                if (await fileExists(envFile)) {
                  const envContent = await fsp.readFile(envFile, 'utf8');
                  const hooks = [];
                  envContent.split('\n').forEach(line => {
                    const match = line.match(/^VITE_NETLIFY_BUILD_HOOK(_2)?=(.+)$/);
                    if (match && match[2].trim()) {
                      hooks.push(match[2].trim());
                    }
                  });
                  netlifyHooks = hooks;
                }
              } catch (e) {
                console.log('[standalone] Could not read .env for Netlify hooks:', e.message);
              }

              // If we have Netlify hooks, trigger them instead of git
              if (netlifyHooks.length > 0) {
                try {
                  const fetch = require('node-fetch');
                  const results = await Promise.allSettled(
                    netlifyHooks.map(url => fetch(url, { method: 'POST' }))
                  );
                  const successCount = results.reduce((acc, r) => acc + (r.status === 'fulfilled' && r.value?.ok ? 1 : 0), 0);
                  
                  response.statusCode = 200;
                  response.setHeader('Content-Type', 'application/json');
                  response.end(JSON.stringify({ 
                    success: true, 
                    message: `Build triggered via ${successCount} Netlify build hook${successCount > 1 ? 's' : ''}. Netlify will run the build(s), download fresh images during build, and deploy the site(s).`
                  }));
                  return;
                } catch (hookError) {
                  console.error('[standalone] Netlify hook trigger failed:', hookError);
                  // Fall back to git if hooks fail
                }
              }

              const { execSync } = require('child_process');
              const cwd = process.cwd();

              // Check if git is available and repository exists
              try {
                execSync('git status', { cwd, stdio: 'pipe' });
              } catch (e) {
                throw new Error('Not a git repository or git not available');
              }

              // Add all changes
              execSync('git add .', { cwd });

              // Check if there are changes to commit
              try {
                const status = execSync('git status --porcelain', { cwd, encoding: 'utf8' });
                if (!status.trim()) {
                  response.statusCode = 200;
                  response.setHeader('Content-Type', 'application/json');
                  response.end(JSON.stringify({ 
                    success: true, 
                    message: 'No changes to commit. Repository is already up to date.' 
                  }));
                  return;
                }
              } catch (e) {
                // If status check fails, continue with commit anyway
              }

              // Commit changes
              execSync(`git commit -m "${safeMsg}"`, { cwd });

              // Try to push to remote (if configured)
              try {
                execSync('git push', { cwd, stdio: 'pipe' });
                response.statusCode = 200;
                response.setHeader('Content-Type', 'application/json');
                response.end(JSON.stringify({ 
                  success: true, 
                  message: 'Changes committed and pushed to remote repository successfully.' 
                }));
              } catch (pushError) {
                // Push failed, but commit succeeded
                response.statusCode = 200;
                response.setHeader('Content-Type', 'application/json');
                response.end(JSON.stringify({ 
                  success: true, 
                  message: 'Changes committed locally. Push to remote failed (check git configuration).',
                  pushError: pushError.message 
                }));
              }
            } catch (error) {
              response.statusCode = 500;
              response.setHeader('Content-Type', 'application/json');
              response.end(JSON.stringify({ 
                success: false, 
                error: error.message || 'Git operation failed' 
              }));
            }
          });
        } catch (error) {
          response.statusCode = 500;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ 
            success: false, 
            error: error.message || 'Failed to process git commit request' 
          }));
        }
        return;
      }
    } catch (err) {
      // fall through to static handler on any routing error
    }

    // Add simple header and serve static SPA
    response.setHeader('X-Powered-By', 'Applicant Connect');
    return handler(request, response, {
      public: distDir,
      // Also serve pseudo GCS uploads dir (local emulation)
      redirects: [
        { source: '/gcs-uploads/:file', destination: '/gcs-uploads/:file' }
      ],
      cleanUrls: true,
      headers: [
        {
          source: '**/*',
          headers: [
            { key: 'Cache-Control', value: 'no-cache' },
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
            { key: 'Access-Control-Allow-Headers', value: 'Content-Type' }
          ]
        }
      ],
      rewrites: [
        // Serve local emulated gcs uploads from dist/gcs-uploads as static files
        // and SPA fallback to index.html
        { source: '/gcs-uploads/**', destination: '/gcs-uploads/:splat' },
        { source: '**', destination: '/index.html' }
      ]
    });
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}/`;
    console.log(`[standalone] Serving ${distDir} at ${url}`);
    openBrowser(url);

    // Auto-download applicant pictures on startup (non-blocking)
    (async () => {
      try {
        const outDir = path.join(distDir, 'images');
        await ensureDir(outDir);
        const data = await fetchFormsData();
        const onlyApplicants = new Set(['applicants']);
        const { ensured, skipped, total } = await ensureImages(data, outDir, onlyApplicants, false);
        console.log(`[standalone] Auto image ensure on start -> ensured:${ensured} skipped:${skipped} total:${total} in ${path.relative(process.cwd(), outDir)}`);
      } catch (e) {
        console.warn('[standalone] Auto image ensure failed:', e?.message || e);
      }
    })();

    // Background scheduler to retry failed GCS uploads when available
    const RETRY_INTERVAL_MS = 60000;
    setInterval(async () => {
      try {
        if (failedGCSUploads.size === 0) return;
        // Ensure GCS is initialized
        if (!gcsBucket) {
          await initializeGCSCredentials().catch(() => {});
          if (!gcsBucket) return; // Still unavailable
        }
        // Retry a small batch each interval to avoid spikes
        const batch = Array.from(failedGCSUploads.entries()).slice(0, 5);
        for (const [driveId, record] of batch) {
          try {
            const googleDriveUrl = `https://drive.google.com/file/d/${driveId}/view`;
            const result = await backupGoogleDriveImageToGCS(googleDriveUrl, driveId, record.metadata || {});
            failedGCSUploads.delete(driveId);
            console.log(`[Retry-Scheduler] Successfully uploaded ${driveId} to GCS: ${result.gcsUrl}`);
          } catch (e) {
            failedGCSUploads.set(driveId, {
              ...record,
              lastAttempt: new Date().toISOString(),
              error: e?.message || String(e),
              retryCount: (record.retryCount || 0) + 1
            });
            console.warn(`[Retry-Scheduler] Failed to upload ${driveId} on retry: ${e?.message || e}`);
          }
          await delay(300);
        }
      } catch (err) {
        console.warn('[Retry-Scheduler] Error during retry cycle:', err?.message || err);
      }
    }, RETRY_INTERVAL_MS);

  });
})();
