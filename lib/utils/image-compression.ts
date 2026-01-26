/**
 * Compresses an image file using the Canvas API.
 * Reduces dimensions and quality to optimize file size.
 */

export interface CompressionOptions {
  /** Maximum width or height in pixels. Default: 1920 */
  maxWidthOrHeight?: number;
  /** Quality for JPEG/WebP compression (0-1). Default: 0.8 */
  quality?: number;
  /** Output format. Default: 'image/jpeg' */
  outputType?: "image/jpeg" | "image/webp" | "image/png";
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidthOrHeight: 1920,
  quality: 0.8,
  outputType: "image/jpeg",
};

/**
 * Compresses an image file using Canvas API.
 * Returns the compressed file, or the original if compression fails or isn't beneficial.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {},
): Promise<File> {
  const { maxWidthOrHeight, quality, outputType } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // Skip compression for non-image files
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Skip compression for GIFs (would lose animation)
  if (file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
        if (width > height) {
          height = Math.round((height * maxWidthOrHeight) / width);
          width = maxWidthOrHeight;
        } else {
          width = Math.round((width * maxWidthOrHeight) / height);
          height = maxWidthOrHeight;
        }
      }

      // Create canvas and draw resized image
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Only use compressed version if it's smaller
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }

          // Create new file with same name but potentially different extension
          const extension = outputType.split("/")[1];
          const baseName = file.name.replace(/\.[^/.]+$/, "");
          const newFile = new File([blob], `${baseName}.${extension}`, {
            type: outputType,
            lastModified: Date.now(),
          });

          resolve(newFile);
        },
        outputType,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
