import { createServerFn } from "@tanstack/react-start";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX = 5 * 1024 * 1024;

// Visitors have no account, so their photos are uploaded server-side after validation.
export const uploadPublicPhoto = createServerFn({ method: "POST" })
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
      console.error("public upload failed", error);
      throw new Error("No se pudo subir la foto.");
    }
    return { path };
  });
