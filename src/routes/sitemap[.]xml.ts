import { createFileRoute } from "@tanstack/react-router";

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://festalfas.vercel.app/</loc>
    <lastmod>2026-11-16</lastmod>
  </url>
</urlset>`;

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(sitemap, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=0, s-maxage=3600",
          },
        }),
    },
  },
});
