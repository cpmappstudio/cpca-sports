export async function downloadDocument(source: Blob | string, name: string) {
  let blob: Blob;
  if (typeof source === "string") {
    const response = await fetch(source);
    if (!response.ok) throw new Error("DOCUMENT_DOWNLOAD_FAILED");
    blob = await response.blob();
  } else blob = source;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
