export type UploadedMedia = { path: string; url: string };

export class B2UnavailableError extends Error {
  constructor(message = "El almacenamiento Backblaze todavía no está configurado en este entorno.") {
    super(message);
    this.name = "B2UnavailableError";
  }
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/ogg": "ogg",
};

export async function uploadMediaFile(file: File, folder: string, fallbackToSupabase = true): Promise<UploadedMedia> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const headers = new Headers();
  if (folder === "actuaciones" || folder === "noticias" || folder === "site" || (folder.startsWith("penyes/perfiles/") || folder.startsWith("penyes/tarjetas/"))) {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) throw new Error("Inicia sesión como administrador antes de subir archivos.");
    headers.set("Authorization", "Bearer " + data.session.access_token);
  }
  const response = await fetch("/api/media/upload", { method: "POST", body: form, headers, credentials: "same-origin" });
  const result = await response.json().catch(() => null) as { path?: string; url?: string; error?: string } | null;
  if (response.ok && result?.path && result.url) return { path: result.path, url: result.url };

  const unavailable = response.status === 404 || /almacenamiento de archivos no está configurado/i.test(result?.error ?? "");
  if (unavailable && fallbackToSupabase) {
    const extension = EXTENSIONS[file.type];
    if (!extension) throw new Error("Formato de archivo no admitido.");
    const { supabase } = await import("@/integrations/supabase/client");
    const path = folder + "/" + crypto.randomUUID() + "." + extension;
    const { error } = await supabase.storage.from("penyes").upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    return { path, url: supabase.storage.from("penyes").getPublicUrl(path).data.publicUrl };
  }
  if (unavailable) throw new B2UnavailableError(result?.error);
  throw new Error(result?.error || "No se pudo subir el archivo.");
}
