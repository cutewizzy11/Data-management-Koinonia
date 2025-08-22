// Service for backing up Google Drive images to Google Cloud Storage
export interface GCSBackupResult {
  success: boolean;
  gcsUrl?: string;
  localUrl?: string;
  error?: string;
  cached?: boolean;
}

/**
 * Extract Google Drive file ID from various URL formats
 */
export function extractGoogleDriveId(url: string): string | null {
  if (!url || !url.includes('drive.google.com')) {
    return null;
  }
  
  // Handle /d/ format
  let match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    // Handle open?id= format
    match = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  }
  
  return match ? match[1] : null;
}

/**
 * Check if a Google Drive URL has already been backed up to GCS
 */
export async function checkGCSBackupStatus(driveId: string): Promise<{ exists: boolean; gcsUrl?: string }> {
  try {
    const response = await fetch(`/api/gcs/check-backup?driveId=${driveId}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('Failed to check GCS backup status:', error);
  }
  return { exists: false };
}

/**
 * Backup a Google Drive image to Google Cloud Storage
 */
export async function backupGoogleDriveToGCS(googleDriveUrl: string, metadata: {
  personId?: string;
  personName?: string;
  type?: 'applicant' | 'referee' | 'associate';
}): Promise<GCSBackupResult> {
  try {
    const driveId = extractGoogleDriveId(googleDriveUrl);
    if (!driveId) {
      return {
        success: false,
        error: 'Invalid Google Drive URL - could not extract file ID'
      };
    }

    // Check if already backed up
    const backupStatus = await checkGCSBackupStatus(driveId);
    if (backupStatus.exists && backupStatus.gcsUrl) {
      return {
        success: true,
        gcsUrl: backupStatus.gcsUrl,
        localUrl: `/images/drive_${driveId}.jpg`,
        cached: true
      };
    }

    // Trigger backup via API
    const response = await fetch('/api/gcs/backup-drive-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        googleDriveUrl,
        driveId,
        metadata
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Backup failed: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      gcsUrl: result.gcsUrl,
      localUrl: result.localUrl || `/images/drive_${driveId}.jpg`
    };

  } catch (error) {
    console.error('GCS backup failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown backup error',
      localUrl: `/images/drive_${extractGoogleDriveId(googleDriveUrl)}.jpg` // Fallback to local
    };
  }
}

/**
 * Get the best available image URL (GCS, local, or Google Drive fallback)
 */
export async function getBestImageUrl(googleDriveUrl: string, metadata?: {
  personId?: string;
  personName?: string;
  type?: 'applicant' | 'referee' | 'associate';
}): Promise<string> {
  if (!googleDriveUrl || !googleDriveUrl.includes('drive.google.com')) {
    return googleDriveUrl;
  }

  const driveId = extractGoogleDriveId(googleDriveUrl);
  if (!driveId) {
    return googleDriveUrl;
  }

  // Try to get from GCS first
  try {
    const backupStatus = await checkGCSBackupStatus(driveId);
    if (backupStatus.exists && backupStatus.gcsUrl) {
      return backupStatus.gcsUrl;
    }
  } catch (error) {
    console.warn('Failed to check GCS status, falling back to local:', error);
  }

  // Fall back to local path (for standalone/local development)
  return `/images/drive_${driveId}.jpg`;
}

/**
 * Batch backup multiple Google Drive URLs
 */
export async function batchBackupGoogleDriveImages(
  urls: Array<{ url: string; metadata: any }>
): Promise<GCSBackupResult[]> {
  const results = await Promise.allSettled(
    urls.map(({ url, metadata }) => backupGoogleDriveToGCS(url, metadata))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        success: false,
        error: result.reason?.message || 'Backup failed',
        localUrl: `/images/drive_${extractGoogleDriveId(urls[index].url)}.jpg`
      };
    }
  });
}

/**
 * Retry failed GCS uploads
 */
export async function retryFailedGCSUploads(options?: {
  maxRetries?: number;
  driveIds?: string[];
}): Promise<{
  success: boolean;
  message: string;
  results: Array<{
    driveId: string;
    success: boolean;
    gcsUrl?: string;
    error?: string;
    retriedAt: string;
  }>;
  totalRetried: number;
  successCount: number;
  failureCount: number;
  remainingFailed: number;
}> {
  try {
    const response = await fetch('/api/gcs/retry-failed-uploads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options || {})
    });

    if (!response.ok) {
      throw new Error(`Retry request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to retry GCS uploads:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Retry operation failed',
      results: [],
      totalRetried: 0,
      successCount: 0,
      failureCount: 0,
      remainingFailed: 0
    };
  }
}

/**
 * Batch retry for enhanced recovery support
 */
export async function batchRetryFailedUploads(
  driveIds: string[],
  maxRetries = 3
): Promise<GCSBackupResult[]> {
  if (driveIds.length === 0) {
    return [];
  }

  const retryResult = await retryFailedGCSUploads({
    maxRetries,
    driveIds
  });

  return retryResult.results.map(result => ({
    success: result.success,
    gcsUrl: result.gcsUrl,
    localUrl: `/images/drive_${result.driveId}.jpg`,
    error: result.error,
    cached: false
  }));
}