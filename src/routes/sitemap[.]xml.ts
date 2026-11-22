import { createFileRoute } from "@tanstack/react-router";

const pages = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/penyes", priority: "0.9", changefreq: "weekly" },
  { path: "/programa-fiestas", priority: "0.9", changefreq: "weekly" },
  { path: "/eventos", priority: "0.8", changefreq: "weekly" },
  { path: "/noticias", priority: "0.8", changefreq: "daily" },
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(({ path, priority, changefreq }) => `  <url><loc>https://pixel-perfect-match-ten-tau.vercel.app${path}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`).join("\n")}
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
