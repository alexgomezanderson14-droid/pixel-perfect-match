import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};


type NewsRow = { id: string; titulo: string; resumen: string | null; imagen_url: string | null; publicado: number | boolean };
type D1Database = { prepare: (query: string) => { bind: (...values: unknown[]) => { first: <T>() => Promise<T | null> } } };
type CloudflareEnv = { DB?: D1Database };

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
  const match = url.pathname.match(/^\\/noticia\\/([^/]+)\\/?$/);
  if (!match) return null;

  let id: string;
  try { id = decodeURIComponent(match[1]); } catch { return new Response("Noticia no encontrada", { status: 404 }); }
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

  if (!news || news.publicado === false || news.publicado === 0) {
    return new Response("Noticia no encontrada", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  const title = escapeHtml(news.titulo);
  const description = escapeHtml(news.resumen || "Lee esta noticia en festalfàs.");
  const imagePath = news.imagen_url || "/mayorales-2027.svg";
  const imageUrl = new URL(imagePath, url.origin).toString();
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
      const shareResponse = await handleNewsShare(request, (env ?? {}) as CloudflareEnv);
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
