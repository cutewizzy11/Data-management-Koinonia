// Download images from Google Drive links and save them into public/images
// ESM script (package.json has type: module)
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw9Nqqbd0uxeXhNV3Bt4EZppM6ib7DD1knuvPjZIQZBxsEpBQ0jQCRXZU1iAOFbbPjEsg/exec';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'images');
const ARGV = process.argv.slice(2);
const FORCE = ARGV.includes('--force');
const VERIFY = ARGV.includes('--verify');
const RETRIES = (() => { try { const v = ARGV.find(a => a.startsWith('--retries=')); return v ? Math.max(0, parseInt(v.split('=')[1], 10)) || 3 : 3; } catch { return 3; } })();
const DATA_URL_ARG = (() => { try { const v = ARGV.find(a => a.startsWith('--data-url=')); return v ? v.split('=')[1] : null; } catch { return null; } })();
const FROM_FILE = (() => { try { const v = ARGV.find(a => a.startsWith('--from-file=')); return v ? v.split('=')[1] : null; } catch { return null; } })();
// NEW: allow filtering which entities to download via --only=applicants[,referees,associates]
const ONLY = (() => { try { const v = ARGV.find(a => a.startsWith('--only=')); if (!v) return null; return v.split('=')[1].split(',').map(s => s.trim().toLowerCase()).filter(Boolean); } catch { return null; } })();
const onlyHas = (type) => !ONLY || ONLY.includes(type);

const log = {
  info: (...args) => console.log('[download-images]', ...args),
  warn: (...args) => console.warn('[download-images]', ...args),
  error: (...args) => console.error('[download-images]', ...args),
};

function extractDriveId(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('drive.google.com')) return null;
  let match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    match = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  }
  return match ? match[1] : null;
}

function toLocalImagePathFromId(fileId) {
  return `/images/drive_${fileId}.jpg`;
}

// Validate that buffer represents a real image (JPEG/PNG/GIF/WEBP)
function isValidImageBuffer(buffer, contentType = '') {
  if (!buffer || buffer.length < 100) return false;
  const b = buffer;
  const magic0 = b[0];
  const magic1 = b[1];
  const magic2 = b[2];
  const magic3 = b[3];
  const isJPEG = magic0 === 0xFF && magic1 === 0xD8;
  const isPNG = magic0 === 0x89 && magic1 === 0x50 && magic2 === 0x4E && magic3 === 0x47;
  const isGIF = b.subarray(0, 3).toString() === 'GIF';
  const isWebP = b.length > 12 && b.subarray(8, 12).toString() === 'WEBP';
  const typeLooksOk = /image\//i.test(contentType || '')
  return (isJPEG || isPNG || isGIF || isWebP) && (typeLooksOk || true);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fileExists(filepath) {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

async function isZeroByteFile(filepath) {
  try {
    const stats = await fs.stat(filepath);
    return stats.size === 0;
  } catch {
    return false;
  }
}

async function downloadDriveFile(fileId, destPath) {
  // Prefer Google Drive thumbnail which acts like a screenshot for most file types (images, PDFs, Docs, etc.)
  const strategies = [
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
    // Fallbacks to direct download endpoints
    `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
    `https://drive.google.com/uc?id=${fileId}&export=download`,
    `https://drive.google.com/uc?export=download&id=${fileId}`
  ];
  let lastErr;
  for (let i = 0; i < strategies.length; i++) {
    const url = strategies[i];
    try {
      const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'ApplicantConnect/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const contentType = res.headers.get('content-type') || '';
      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      if (!isValidImageBuffer(buf, contentType)) {
        throw new Error(`Downloaded content is not a valid image (type=${contentType || 'unknown'}, size=${buf.length})`);
      }
      await fs.writeFile(destPath, buf);
      return; // success
    } catch (e) {
      lastErr = e;
      await delay(250);
      continue;
    }
  }
  throw new Error(`Failed all strategies for ${fileId}: ${lastErr?.message || lastErr}`);
}

async function headCheckDriveFile(fileId) {
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    const contentType = res.headers.get('content-type') || '';
    const contentLengthStr = res.headers.get('content-length');
    const contentLength = contentLengthStr ? parseInt(contentLengthStr, 10) : 0;
    return { ok: res.ok, contentType, contentLength: Number.isFinite(contentLength) ? contentLength : 0 };
  } catch (e) {
    return { ok: false, error: e };
  }
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
  ].concat(['\nFirst Name', '\nPhone Numbers', '\nResidential Address'].map(() => '')); // keep structure stable
  return pickFirstTruthy(applicant, candidateKeys);
}

function getSignatureUrl(record) {
  const candidateKeys = [
    'Upload a scanned copy of your Signature',
    'Signature', 'signature'
  ];
  return pickFirstTruthy(record, candidateKeys);
}

async function fetchWithRetries(url, retries) {
  let lastErr;
  for (let attempt = 1; attempt <= Math.max(1, retries); attempt++) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        const waitMs = Math.min(5000, 500 * attempt);
        log.warn(`Data fetch failed (attempt ${attempt}/${retries}). Retrying in ${waitMs}ms...`, e.message || e);
        await delay(waitMs);
      }
    }
  }
  throw lastErr || new Error('Fetch failed');
}

async function fetchData() {
  const primaryUrl = DATA_URL_ARG || process.env.DOWNLOAD_DATA_URL || APPS_SCRIPT_URL;
  try {
    log.info(`Fetching data from: ${primaryUrl} (retries=${RETRIES})`);
    return await fetchWithRetries(primaryUrl, RETRIES);
  } catch (err) {
    if (FROM_FILE) {
      try {
        log.warn(`Primary data source failed. Falling back to local file: ${FROM_FILE}`);
        const txt = await fs.readFile(FROM_FILE, 'utf8');
        return JSON.parse(txt);
      } catch (e) {
        log.error('Failed to read fallback file:', e.message || e);
      }
    }
    throw err;
  }
}

async function main() {
  log.info('Starting image download...');
  await ensureDir(OUTPUT_DIR);
  log.info(`Options => force=${FORCE} verify=${VERIFY} only=${ONLY ? ONLY.join(',') : 'all'}`);

  let data;
  try {
    data = await fetchData();
  } catch (err) {
    log.error('Failed to fetch data from Apps Script. Nothing to download.', err.message || err);
    process.exitCode = 1;
    return;
  }

  const applicants = Array.isArray(data?.applicants) ? data.applicants : [];
  const referees = Array.isArray(data?.referees) ? data.referees : [];
  const associates = Array.isArray(data?.associates) ? data.associates : [];

  const tasks = [];

  // Applicants photos
  if (onlyHas('applicants')) {
    for (const app of applicants) {
      const url = getApplicantPhotoUrl(app);
      const id = extractDriveId(url);
      if (!id) continue;
      const filename = `drive_${id}.jpg`;
      const destPath = path.join(OUTPUT_DIR, filename);
      tasks.push({ id, destPath, who: `applicant:${app.name || app.id || 'unknown'}` });
    }
  }

  // Referees signatures
  if (onlyHas('referees')) {
    for (const ref of referees) {
      const url = getSignatureUrl(ref);
      const id = extractDriveId(url);
      if (!id) continue;
      const filename = `drive_${id}.jpg`;
      const destPath = path.join(OUTPUT_DIR, filename);
      tasks.push({ id, destPath, who: `referee:${ref.name || ref.id || 'unknown'}` });
    }
  }

  // Associates signatures
  if (onlyHas('associates')) {
    for (const assoc of associates) {
      const url = getSignatureUrl(assoc);
      const id = extractDriveId(url);
      if (!id) continue;
      const filename = `drive_${id}.jpg`;
      const destPath = path.join(OUTPUT_DIR, filename);
      tasks.push({ id, destPath, who: `associate:${assoc.name || assoc.id || 'unknown'}` });
    }
  }

  // De-duplicate by destination
  const uniqueMap = new Map();
  for (const t of tasks) {
    if (!uniqueMap.has(t.destPath)) uniqueMap.set(t.destPath, t);
  }
  const uniqueTasks = Array.from(uniqueMap.values());

  log.info(`Found ${uniqueTasks.length} image(s) to ensure locally.`);

  let completed = 0;
  for (const task of uniqueTasks) {
    try {
      if (await fileExists(task.destPath)) {
        let shouldRedownload = false;
        if (FORCE) {
          log.warn(`Force re-download enabled, redownloading: ${path.basename(task.destPath)}`);
          shouldRedownload = true;
        } else {
          const zero = await isZeroByteFile(task.destPath);
          if (zero) {
            log.warn(`Existing file is zero bytes, re-downloading: ${path.basename(task.destPath)}`);
            shouldRedownload = true;
          } else if (VERIFY) {
            const head = await headCheckDriveFile(task.id);
            if (!head.ok || head.contentLength === 0 || (head.contentType && !head.contentType.includes('image'))) {
              log.warn(`Verification failed for ${path.basename(task.destPath)} (ok=${head.ok}, type=${head.contentType}, length=${head.contentLength}), re-downloading.`);
              shouldRedownload = true;
            }
          }
        }
        if (!shouldRedownload) {
          completed++;
          continue;
        }
      }
      log.info(`Downloading ${task.who} -> ${path.basename(task.destPath)}`);
      await downloadDriveFile(task.id, task.destPath);
      completed++;
      // small delay to avoid triggering rate limits
      await delay(200);
    } catch (err) {
      log.warn(`Failed to download ${task.who}:`, err.message || err);
    }
  }

  log.info(`Done. ${completed}/${uniqueTasks.length} files ensured in ${OUTPUT_DIR}`);
}

main().catch(err => {
  log.error('Unexpected error', err);
  process.exit(1);
});