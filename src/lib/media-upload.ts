export type UploadedMedia = { path: string; url: string };

export async function uploadMediaFile(file: File, folder: string): Promise<UploadedMedia> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const headers = new Headers();
  if (folder === "actuaciones" || folder === "noticias" || folder === "site" || folder.startsWith("penyes/perfiles/")) {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) throw new Error("Inicia sesión como administrador antes de subir archivos.");
    headers.set("Authorization", "Bearer " + data.session.access_token);
  }
  const response = await fetch("/api/media/upload", { method: "POST", body: form, headers, credentials: "same-origin" });
  const result = await response.json().catch(() => null) as { path?: string; url?: string; error?: string } | null;
  if (!response.ok || !result?.path || !result.url) {
    throw new Error(result?.error || "No se pudo subir el archivo.");
  }
  return { path: result.path, url: result.url };
}
