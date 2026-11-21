import { createFileRoute } from "@tanstack/react-router";

const pages = ["/", "/penyes", "/programa-fiestas", "/eventos", "/noticias"];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((path) => `  <url><loc>https://pixel-perfect-match-ten-tau.vercel.app${path}</loc></url>`).join("\n")}
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
