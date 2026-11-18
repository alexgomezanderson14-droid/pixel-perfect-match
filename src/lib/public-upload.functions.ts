import { uploadMediaFile } from "@/lib/media-upload";

// Public submissions are validated and uploaded by the Cloudflare Worker to a private B2 bucket.
export async function uploadPublicPhoto({ data }: { data: FormData }): Promise<{ path: string; url: string }> {
  const file = data.get("file");
  const folder = data.get("folder");
  if (!(file instanceof File)) throw new Error("Falta la foto.");
  if (folder !== "penyes" && folder !== "eventos") throw new Error("Carpeta no válida.");
  return uploadMediaFile(file, folder);
}
