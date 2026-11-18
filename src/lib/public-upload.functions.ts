import { createServerFn } from "@tanstack/react-start";
import { B2UnavailableError, uploadMediaFile } from "@/lib/media-upload";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX = 5 * 1024 * 1024;

// Legacy fallback keeps public photo submissions working on the existing Vercel deployment
// until the Cloudflare Worker has the Backblaze secrets configured.
const uploadLegacyPublicPhoto = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Datos no válidos");
    const file = data.get("file");
    const folder = data.get("folder");
    if (!(file instanceof File)) throw new Error("Falta la foto");
    if (folder !== "penyes" && folder !== "eventos") throw new Error("Carpeta no válida");
    if (!TYPES[file.type]) throw new Error("La foto debe ser JPG, PNG o WEBP.");
    if (file.size <= 0 || file.size > MAX) throw new Error("La foto no puede superar los 5 MB.");
    return { file, folder };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = data.folder + "/" + crypto.randomUUID() + "." + TYPES[data.file.type];
    const { error } = await supabaseAdmin.storage
      .from("penyes")
      .upload(path, await data.file.arrayBuffer(), { contentType: data.file.type, upsert: false });
    if (error) {
      console.error("legacy public upload failed", error);
      throw new Error("No se pudo subir la foto.");
    }
    const { supabase } = await import("@/integrations/supabase/client.server");
    return { path, url: supabaseAdmin.storage.from("penyes").getPublicUrl(path).data.publicUrl };
  });

// Use B2 when the Worker is configured; otherwise preserve the existing Supabase upload path.
export async function uploadPublicPhoto({ data }: { data: FormData }): Promise<{ path: string; url: string }> {
  const file = data.get("file");
  const folder = data.get("folder");
  if (!(file instanceof File)) throw new Error("Falta la foto.");
  if (folder !== "penyes" && folder !== "eventos") throw new Error("Carpeta no válida.");
  try {
    return await uploadMediaFile(file, folder, false);
  } catch (error) {
    if (error instanceof B2UnavailableError) return uploadLegacyPublicPhoto({ data });
    throw error;
  }
}
