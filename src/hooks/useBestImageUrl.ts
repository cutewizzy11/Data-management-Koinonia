// React hook for resolving the best available image URL (GCS, local, or fallback)
import { useState, useEffect, useCallback } from 'react';
import { getBestImageUrl } from '../services/gcsBackupService';

interface UseBestImageUrlReturn {
  resolvedUrl: string | null;
  isResolving: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Hook to resolve the best available image URL
 * Prioritizes GCS URLs, falls back to local paths, then original URL
 */
export const useBestImageUrl = (
  originalUrl: string | null | undefined,
  metadata?: {
    personId?: string;
    personName?: string;
    type?: 'applicant' | 'referee' | 'associate';
  }
): UseBestImageUrlReturn => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveUrl = useCallback(async () => {
    if (!originalUrl) {
      setResolvedUrl(null);
      setIsResolving(false);
      setError(null);
      return;
    }

    // If it's not a Google Drive URL, return as-is
    if (!originalUrl.includes('drive.google.com')) {
      setResolvedUrl(originalUrl);
      setIsResolving(false);
      setError(null);
      return;
    }

    setIsResolving(true);
    setError(null);

    try {
      const bestUrl = await getBestImageUrl(originalUrl, metadata);
      setResolvedUrl((prev) => (prev !== bestUrl ? bestUrl : prev));
    } catch (err) {
      console.warn('Failed to resolve best image URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve URL');
      // Fallback to original URL on error
      setResolvedUrl(originalUrl);
    } finally {
      setIsResolving(false);
    }
  }, [originalUrl, metadata]);

  const retry = useCallback(() => {
    resolveUrl();
  }, [resolveUrl]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      await resolveUrl();
    };
    if (isMounted) run();
    return () => {
      isMounted = false;
    };
  }, [resolveUrl]);

  return {
    resolvedUrl,
    isResolving,
    error,
    retry
  };
};

/**
 * Hook for multiple image URLs (e.g., both image and signature)
 */
export const useBestImageUrls = (
  urls: Array<{
    key: string;
    url: string | null | undefined;
    metadata?: {
      personId?: string;
      personName?: string;
      type?: 'applicant' | 'referee' | 'associate';
    };
  }>
): {
  resolvedUrls: Record<string, string | null>;
  isResolving: boolean;
  errors: Record<string, string | null>;
  retryAll: () => void;
} => {
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string | null>>({});
  const [isResolving, setIsResolving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const resolveUrls = useCallback(async () => {
    if (urls.length === 0) {
      setResolvedUrls((prev) => (Object.keys(prev).length ? {} : prev));
      setIsResolving(false);
      setErrors((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }

    setIsResolving(true);
    const newResolvedUrls: Record<string, string | null> = {};
    const newErrors: Record<string, string | null> = {};

    try {
      await Promise.all(
        urls.map(async ({ key, url, metadata }) => {
          try {
            if (!url) {
              newResolvedUrls[key] = null;
              newErrors[key] = null;
              return;
            }

            if (!url.includes('drive.google.com')) {
              newResolvedUrls[key] = url;
              newErrors[key] = null;
              return;
            }

            const bestUrl = await getBestImageUrl(url, metadata);
            newResolvedUrls[key] = bestUrl;
            newErrors[key] = null;
          } catch (err) {
            console.warn(`Failed to resolve URL for ${key}:`, err);
            newErrors[key] = err instanceof Error ? err.message : 'Failed to resolve URL';
            newResolvedUrls[key] = url; // Fallback to original
          }
        })
      );
    } finally {
      // Only update state if values actually changed to avoid loops
      setResolvedUrls((prev) => {
        const sameKeys = Object.keys(prev).length === Object.keys(newResolvedUrls).length &&
          Object.keys(prev).every((k) => prev[k] === newResolvedUrls[k]);
        return sameKeys ? prev : newResolvedUrls;
      });
      setErrors((prev) => {
        const sameKeys = Object.keys(prev).length === Object.keys(newErrors).length &&
          Object.keys(prev).every((k) => prev[k] === newErrors[k]);
        return sameKeys ? prev : newErrors;
      });
      setIsResolving(false);
    }
  }, [urls]);

  const retryAll = useCallback(() => {
    resolveUrls();
  }, [resolveUrls]);

  useEffect(() => {
    resolveUrls();
  }, [resolveUrls]);

  return {
    resolvedUrls,
    isResolving,
    errors,
    retryAll
  };
};