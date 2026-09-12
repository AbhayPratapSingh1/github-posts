import { request } from './client';

/**
 * Request signed upload parameters from backend
 */
export async function getUploadSignature(postId, mediaData) {
  return request(`/posts/${postId}/media/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mediaData),
  });
}

/**
 * Upload file directly to Cloudinary
 */
export async function uploadToCloudinary(signatureData, file, onProgress) {
  const { cloudName, apiKey, timestamp, signature, folder, resourceType } = signatureData;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('api_key', apiKey);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    const resourceTypePath = resourceType === 'video' ? 'video' : 'image';
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/${resourceTypePath}/upload`);
    xhr.send(formData);
  });
}

/**
 * Confirm upload with backend
 */
export async function confirmUpload(postId, confirmData) {
  return request(`/posts/${postId}/media/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(confirmData),
  });
}

/**
 * Finalize post media (resolve placeholders)
 */
export async function finalizePostMedia(postId) {
  return request(`/posts/${postId}/finalize`, {
    method: 'POST',
  });
}

/**
 * Get media list for a post
 */
export async function getPostMedia(postId) {
  return request(`/posts/${postId}/media`);
}

/**
 * Generate a unique client media ID
 */
export function generateClientMediaId() {
  return `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract media references from HTML content
 */
export function extractMediaFromContent(content) {
  const mediaRegex = /\{\{media:([^}]+)\}\}/g;
  const mediaIds = [];
  let match;

  while ((match = mediaRegex.exec(content)) !== null) {
    mediaIds.push(match[1]);
  }

  return mediaIds;
}

/**
 * Upload media batch with concurrency limit
 */
export async function uploadMediaBatch(postId, mediaItems, onProgress, concurrency = 3) {
  const results = [];
  const queue = [...mediaItems];
  let completed = 0;
  const total = mediaItems.length;

  const uploadNext = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      try {
        // Get signature
        const signature = await getUploadSignature(postId, {
          clientMediaId: item.clientMediaId,
          type: item.type,
          mimeType: item.file.type,
          fileSize: item.file.size,
          originalFilename: item.file.name,
        });

        // Upload to Cloudinary
        const cloudinaryResult = await uploadToCloudinary(
          signature,
          item.file,
          (percent) => {
            if (onProgress) {
              onProgress({
                clientMediaId: item.clientMediaId,
                percent,
                status: 'uploading',
              });
            }
          }
        );

        // Confirm with backend
        await confirmUpload(postId, {
          clientMediaId: item.clientMediaId,
          cloudinaryPublicId: cloudinaryResult.public_id,
          resourceType: cloudinaryResult.resource_type,
          secureUrl: cloudinaryResult.secure_url,
        });

        completed++;
        results.push({
          clientMediaId: item.clientMediaId,
          status: 'uploaded',
          url: cloudinaryResult.secure_url,
        });

        if (onProgress) {
          onProgress({
            clientMediaId: item.clientMediaId,
            percent: 100,
            status: 'uploaded',
            completed,
            total,
          });
        }
      } catch (error) {
        completed++;
        results.push({
          clientMediaId: item.clientMediaId,
          status: 'failed',
          error: error.message,
        });

        if (onProgress) {
          onProgress({
            clientMediaId: item.clientMediaId,
            percent: 0,
            status: 'failed',
            error: error.message,
            completed,
            total,
          });
        }
      }
    }
  };

  // Start concurrent uploads
  const workers = Array(concurrency).fill(null).map(() => uploadNext());
  await Promise.all(workers);

  return results;
}
