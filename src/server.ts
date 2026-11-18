import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};


type NewsRow = { id: string; titulo: string; resumen: string | null; imagen_url: string | null; publicado: number | boolean };
type D1Database = { prepare: (query: string) => { bind: (...values: unknown[]) => { first: <T>() => Promise<T | null> } } };
type CloudflareEnv = { DB?: D1Database } & B2Env;


type B2Env = {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  B2_APPLICATION_KEY_ID?: string;
  B2_APPLICATION_KEY?: string;
  B2_BUCKET_ID?: string;
  B2_BUCKET_NAME?: string;
};
type B2Authorization = {
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
};
let cachedB2Authorization: { value: B2Authorization; expiresAt: number } | null = null;

async function authorizeB2(env: CloudflareEnv & B2Env): Promise<B2Authorization> {
  if (cachedB2Authorization && cachedB2Authorization.expiresAt > Date.now()) return cachedB2Authorization.value;
  if (!env.B2_APPLICATION_KEY_ID || !env.B2_APPLICATION_KEY || !env.B2_BUCKET_ID || !env.B2_BUCKET_NAME) {
    throw new Error("El almacenamiento de archivos no está configurado en Cloudflare.");
  }
  const credentials = btoa(env.B2_APPLICATION_KEY_ID + ":" + env.B2_APPLICATION_KEY);
  const response = await fetch("https://api.backblazeb2.com/b2api/v4/b2_authorize_account", {
    headers: { Authorization: "Basic " + credentials },
  });
  if (!response.ok) throw new Error("No se pudo autenticar con el almacenamiento de archivos.");
  const data = await response.json() as {
    authorizationToken: string;
    apiInfo?: { storageApi?: { apiUrl?: string; downloadUrl?: string } };
  };
  const apiUrl = data.apiInfo?.storageApi?.apiUrl;
  const downloadUrl = data.apiInfo?.storageApi?.downloadUrl;
  if (!data.authorizationToken || !apiUrl || !downloadUrl) throw new Error("Respuesta de almacenamiento no válida.");
  const value = { authorizationToken: data.authorizationToken, apiUrl, downloadUrl };
  cachedB2Authorization = { value, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return value;
}

async function isAuthorizedAdminUpload(request: Request, env: CloudflareEnv): Promise<boolean> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ") || !env.SUPABASE_URL) return false;
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) return false;
  try {
    const response = await fetch(env.SUPABASE_URL.replace(/\/$/, "") + "/auth/v1/user", {
      headers: { apikey: publishableKey, Authorization: authorization },
    });
    if (!response.ok) return false;
    const user = await response.json() as { email?: string };
    return user.email?.toLowerCase() === "gomezandersonalex@gmail.com";
  } catch {
    return false;
  }
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

async function handleB2Request(request: Request, env: CloudflareEnv & B2Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method === "POST" && url.pathname === "/api/media/upload") {
    const origin = request.headers.get("origin");
    if (!origin || origin !== url.origin) return jsonResponse({ error: "Solicitud no permitida." }, 403);
    if (!(request.headers.get("content-type") ?? "").includes("multipart/form-data")) return jsonResponse({ error: "Formato de envío no válido." }, 415);
    try {
      const form = await request.formData();
      const file = form.get("file");
      const folder = form.get("folder");
      if (!(file instanceof File) || typeof folder !== "string") return jsonResponse({ error: "Falta el archivo o la carpeta." }, 400);
      const validFolder = folder === "penyes" || folder === "eventos" || folder === "actuaciones" || folder === "noticias" || folder === "site" || /^penyes\/perfiles\/[a-zA-Z0-9_-]{1,100}$/.test(folder);
      if (!validFolder) return jsonResponse({ error: "Carpeta de destino no válida." }, 400);
      const adminOnlyFolder = folder === "actuaciones" || folder === "noticias" || folder === "site" || folder.startsWith("penyes/perfiles/");
      if (adminOnlyFolder && !(await isAuthorizedAdminUpload(request, env))) return jsonResponse({ error: "Necesitas iniciar sesión con la cuenta administradora para subir este archivo." }, 401);
      const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov", "video/ogg": "ogg" };
      const extension = extensions[file.type];
      if (!extension) return jsonResponse({ error: "Formato no admitido. Usa JPG, PNG, WEBP, MP4, WEBM, OGG o MOV." }, 415);
      const isVideo = file.type.startsWith("video/");
      const maxBytes = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size <= 0 || file.size > maxBytes) return jsonResponse({ error: isVideo ? "El vídeo no puede superar los 100 MB." : "La imagen no puede superar los 5 MB." }, 413);

      const authorization = await authorizeB2(env);
      const uploadUrlResponse = await fetch(authorization.apiUrl + "/b2api/v4/b2_get_upload_url?bucketId=" + encodeURIComponent(env.B2_BUCKET_ID!), {
        headers: { Authorization: authorization.authorizationToken },
      });
      if (!uploadUrlResponse.ok) throw new Error("No se pudo preparar la subida del archivo.");
      const uploadInfo = await uploadUrlResponse.json() as { uploadUrl?: string; authorizationToken?: string };
      if (!uploadInfo.uploadUrl || !uploadInfo.authorizationToken) throw new Error("La dirección de subida no es válida.");

      const bytes = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-1", bytes);
      const sha1 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const path = folder + "/" + crypto.randomUUID() + "." + extension;
      const uploaded = await fetch(uploadInfo.uploadUrl, {
        method: "POST",
        headers: {
          Authorization: uploadInfo.authorizationToken,
          "X-Bz-File-Name": path.split("/").map(encodeURIComponent).join("/"),
          "Content-Type": file.type,
          "Content-Length": String(bytes.byteLength),
          "X-Bz-Content-Sha1": sha1,
        },
        body: bytes,
      });
      if (!uploaded.ok) {
        cachedB2Authorization = null;
        throw new Error("Backblaze no ha aceptado el archivo. Comprueba los permisos de la clave y vuelve a intentarlo.");
      }
      const mediaUrl = new URL("/media/" + path.split("/").map(encodeURIComponent).join("/"), url.origin).toString();
      return jsonResponse({ path, url: mediaUrl });
    } catch (error) {
      console.error("[B2 upload]", error);
      return jsonResponse({ error: error instanceof Error ? error.message : "No se pudo subir el archivo." }, 500);
    }
  }

  if ((request.method === "GET" || request.method === "HEAD") && url.pathname.startsWith("/media/")) {
    try {
      const path = url.pathname.slice("/media/".length).split("/").map((part) => decodeURIComponent(part)).join("/");
      if (!path || path.split("/").some((part) => !part || part === "." || part === ".." || part.includes("\\"))) return new Response("Archivo no encontrado", { status: 404 });
      const authorization = await authorizeB2(env);
      const fileUrl = authorization.downloadUrl.replace(/\/$/, "") + "/file/" + encodeURIComponent(env.B2_BUCKET_NAME!) + "/" + path.split("/").map(encodeURIComponent).join("/");
      const headers = new Headers({ Authorization: authorization.authorizationToken });
      const range = request.headers.get("range");
      if (range) headers.set("Range", range);
      const fileResponse = await fetch(fileUrl, { method: request.method, headers });
      if (!fileResponse.ok) return new Response(fileResponse.status === 404 ? "Archivo no encontrado" : "No se pudo recuperar el archivo", { status: fileResponse.status });
      const responseHeaders = new Headers();
      for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
        const value = fileResponse.headers.get(name);
        if (value) responseHeaders.set(name, value);
      }
      responseHeaders.set("cache-control", "public, max-age=86400, stale-while-revalidate=604800");
      responseHeaders.set("x-content-type-options", "nosniff");
      return new Response(request.method === "HEAD" ? null : fileResponse.body, { status: fileResponse.status, headers: responseHeaders });
    } catch (error) {
      console.error("[B2 download]", error);
      return new Response("Almacenamiento no disponible", { status: 503 });
    }
  }
  return null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function isSocialCrawler(userAgent: string): boolean {
  return /facebookexternalhit|facebot|whatsapp|telegrambot|twitterbot|linkedinbot|slackbot|discordbot|pinterest|vkshare|skypeuripreview/i.test(userAgent);
}

async function handleNewsShare(request: Request, env: CloudflareEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/noticia\/([^/]+)\/?$/);
  if (!match) return null;

  const rawId = match[1];
  if (!rawId) return new Response("Noticia no encontrada", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  let id: string;
  try { id = decodeURIComponent(rawId); } catch { return new Response("Noticia no encontrada", { status: 404 }); }
  const crawler = isSocialCrawler(request.headers.get("user-agent") ?? "");

  // Los visitantes normales llegan a la ruta hash que ya entiende la aplicación.
  if (!crawler) {
    return Response.redirect(new URL("/#noticia=" + encodeURIComponent(id), url.origin), 302);
  }

  let news: NewsRow | null = null;
  if (env.DB) {
    try {
      news = await env.DB.prepare(
        "SELECT id, titulo, resumen, imagen_url, publicado FROM noticias WHERE id = ? AND publicado = 1 LIMIT 1",
      ).bind(id).first<NewsRow>();
    } catch (error) {
      console.error("[Cloudflare share preview] No se pudo consultar D1", error);
    }
  }

  // Fallback editorial para la noticia inicial mientras se prepara la importación de datos.
  if (!news && id === "cubata-mejorales-2027") {
    news = {
      id,
      titulo: "CuBaTa se convierte en la «Mejoralía» 2027: ¡l’Alfàs ya puede ir preparándose para lo peor!",
      resumen: "La Penya Cobre Bario Tántalo toma el relevo como Mayorales 2027 con una promesa muy clara: organizar las peores fiestas de la historia.",
      imagen_url: "/mayorales-2027.svg",
      publicado: true,
    };
  }

  // Antes de conectar D1, evita que las noticias existentes acaben en un 404:
  // el despliegue actual todavía puede servirlas desde el almacenamiento legado.
  if (!news && !env.DB) {
    return Response.redirect(new URL("/#noticia=" + encodeURIComponent(id), url.origin), 302);
  }

  if (!news || news.publicado === false || news.publicado === 0) {
    return new Response("Noticia no encontrada", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  const title = escapeHtml(news.titulo);
  const description = escapeHtml(news.resumen || "Lee esta noticia en festalfàs.");
  const imagePath = news.imagen_url || "/mayorales-2027.svg";
  let imageUrl = new URL("/mayorales-2027.svg", url.origin).toString();
  try {
    const candidate = new URL(imagePath, url.origin);
    if (candidate.protocol === "https:" || candidate.protocol === "http:") imageUrl = candidate.toString();
  } catch {
    // Si una URL de imagen está dañada, se conserva la imagen segura de respaldo.
  }
  const canonical = new URL("/noticia/" + encodeURIComponent(id), url.origin).toString();
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · festalfàs</title><meta name="description" content="${description}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:type" content="article"><meta property="og:site_name" content="festalfàs"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${escapeHtml(imageUrl)}"><meta property="og:image:alt" content="${title}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${escapeHtml(imageUrl)}"></head><body><main><h1>${title}</h1><p>${description}</p><img src="${escapeHtml(imageUrl)}" alt="${title}"><p><a href="/#noticia=${encodeURIComponent(id)}">Leer noticia en festalfàs</a></p></main></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      "x-content-type-options": "nosniff",
    },
  });
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const runtimeEnv = (env ?? {}) as CloudflareEnv;
      const mediaResponse = await handleB2Request(request, runtimeEnv);
      if (mediaResponse) return mediaResponse;
      const shareResponse = await handleNewsShare(request, runtimeEnv);
      if (shareResponse) return shareResponse;
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
