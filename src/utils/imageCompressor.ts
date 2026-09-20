/**
 * Image compression and Cloudinary URL optimization utility.
 * Compresses client-side images before uploading to save storage & bandwidth.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * Typically reduces a 4-8 MB camera photo down to 150-350 KB with crisp visual quality.
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.82 } = options;

  // If not an image, return original
  if (!file || !file.type.startsWith('image/')) {
    return file;
  }

  // If already under 180 KB and not SVG/GIF, return original
  if (file.size < 180 * 1024 && !file.type.includes('png')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Maintain aspect ratio while bounding within maxWidth & maxHeight
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG for optimal photographic size reduction
        const outputMime = 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // If compression somehow didn't reduce size, fallback to original
              resolve(file);
              return;
            }

            const cleanFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], cleanFileName, {
              type: outputMime,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          outputMime,
          quality
        );
      };

      img.onerror = () => {
        resolve(file);
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => {
      resolve(file);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Transforms Cloudinary URLs on the fly to deliver modern compressed formats (WebP/AVIF)
 * and scaled dimensions. This optimizes even previously uploaded 4-5MB images.
 */
export function getOptimizedCloudinaryUrl(url: string, targetWidth: number = 800): string {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) {
    return url;
  }

  // If transformations are already present, avoid duplicate insertion
  if (url.includes('/f_auto') || url.includes('q_auto')) {
    return url;
  }

  // Insert f_auto,q_auto,w_${targetWidth},c_limit after /image/upload/
  const transform = `f_auto,q_auto,w_${targetWidth},c_limit/`;
  return url.replace('/image/upload/', `/image/upload/${transform}`);
}
