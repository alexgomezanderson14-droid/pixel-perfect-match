export type UploadedMedia = { path: string; url: string };

export async function uploadMediaFile(file: File, folder: string): Promise<UploadedMedia> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const response = await fetch("/api/media/upload", { method: "POST", body: form, credentials: "same-origin" });
  const result = await response.json().catch(() => null) as { path?: string; url?: string; error?: string } | null;
  if (!response.ok || !result?.path || !result.url) {
    throw new Error(result?.error || "No se pudo subir el archivo.");
  }
  return { path: result.path, url: result.url };
}
