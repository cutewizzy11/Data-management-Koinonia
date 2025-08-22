// Utility for interacting with Google Cloud Storage via signed URLs or direct uploads
export interface SignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  headers?: Record<string, string>;
}

export async function getSignedUploadUrl(filename: string, contentType: string): Promise<SignedUrlResponse> {
  const res = await fetch(`/api/gcs/signed-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`);
  if (!res.ok) {
    throw new Error(`Failed to get signed URL: ${res.status}`);
  }
  return res.json();
}

export async function uploadWithSignedUrl(uploadUrl: string, file: File, headers: Record<string, string> = {}) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      ...headers,
    },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }
}