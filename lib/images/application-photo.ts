import { optimizePhoto } from "./optimize-photo";

export const APPLICATION_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
export const APPLICATION_PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024;

const APPLICATION_PHOTO_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const APPLICATION_PHOTO_MAX_DIMENSION = 512;
const APPLICATION_PHOTO_OUTPUT_TYPE = "image/webp";

export type ApplicationPhotoErrorCode =
  "invalidType" | "maxSize" | "decodeFailed" | "optimizeFailed";

export class ApplicationPhotoError extends Error {
  constructor(readonly code: ApplicationPhotoErrorCode) {
    super(code);
  }
}

export async function prepareApplicationPhoto(
  file: File,
  maxSizeBytes = APPLICATION_PHOTO_MAX_SIZE_BYTES,
) {
  validateApplicationPhoto(file, maxSizeBytes);

  const image = await loadImage(file);
  const blob = await optimizePhoto(image, {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    maxDimension: APPLICATION_PHOTO_MAX_DIMENSION,
  });

  if (!blob) {
    throw new ApplicationPhotoError("optimizeFailed");
  }

  return new File([blob], getOptimizedFileName(file.name, blob.type), {
    type: blob.type,
    lastModified: Date.now(),
  });
}

function validateApplicationPhoto(file: File, maxSizeBytes: number) {
  if (!APPLICATION_PHOTO_ALLOWED_TYPES.has(file.type)) {
    throw new ApplicationPhotoError("invalidType");
  }

  if (file.size > maxSizeBytes) {
    throw new ApplicationPhotoError("maxSize");
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ApplicationPhotoError("decodeFailed"));
    };
    image.src = url;
  });
}

function getOptimizedFileName(fileName: string, type: string) {
  const extension = type === APPLICATION_PHOTO_OUTPUT_TYPE ? "webp" : "jpg";
  const baseName = fileName.replace(/\.[^/.]+$/, "") || "application-photo";

  return `${baseName}.${extension}`;
}
