const PHOTO_QUALITY = 0.82;

export async function optimizePhoto(
  source: CanvasImageSource,
  {
    width,
    height,
    maxDimension,
  }: {
    width: number;
    height: number;
    maxDimension: number;
  },
) {
  const scale = Math.min(maxDimension / width, maxDimension / height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  return (
    (await getTypedCanvasBlob(canvas, "image/webp")) ??
    (await getTypedCanvasBlob(canvas, "image/jpeg"))
  );
}

async function getTypedCanvasBlob(canvas: HTMLCanvasElement, type: string) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, PHOTO_QUALITY);
  });
  return blob?.type === type && blob.size > 0 ? blob : null;
}
