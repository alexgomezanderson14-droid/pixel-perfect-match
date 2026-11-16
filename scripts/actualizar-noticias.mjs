import { writeFile } from "node:fs/promises";

const SOURCES = [
  { name: "Ayuntamiento de l’Alfàs del Pi", type: "oficial", archive: "https://www.lalfas.es/concejalias/fiestas/", prefixes: ["https://www.lalfas.es/concejalias/"] },
  { name: "Ayuntamiento de l’Alfàs del Pi", type: "oficial", archive: "https://www.lalfas.es/fiestas/", prefixes: ["https://www.lalfas.es/"] },
  { name: "Cadena SER · Radio Benidorm", type: "externa", archive: "https://cadenaser.com/tag/lalfas_del_pi/a/", prefixes: ["https://cadenaser.com/comunitat-valenciana/"] },
  { name: "ViveBenidorm", type: "externa", archive: "https://www.vivebenidorm.com/", prefixes: ["https://www.vivebenidorm.com/"] },
];
const TERMS = /fiest|peñ|pena|mayoral|mejoral|jubileo|cristo|festes|carnaval|cabalgata|romer[ií]a|tradici[oó]n|desfile|correfoc|moros|navidad|san\s+jose|sant[ií]sim/i;
const clean = (value = "") => decode(value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#0*39;/gi, "'").replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/\s+/g, " ").trim());
function decode(value) { return value; }
function meta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attributes = Object.fromEntries([...tag.matchAll(/([a-z-]+)\s*=\s*["']([^"']*)["']/gi)].map(match => [match[1].toLowerCase(), match[2]]));
    if (attributes.property === key || attributes.name === key) return clean(attributes.content || "");
  }
  return "";
}
function dateFrom(html) {
  const iso = html.match(/<time[^>]+datetime=["']([^"']+)/i)?.[1] || html.match(/"datePublished"\s*:\s*"([^"]+)/i)?.[1];
  if (iso && !Number.isNaN(Date.parse(iso))) return new Date(iso).toISOString().slice(0, 10);
  const spanish = html.match(/(\d{1,2})[\s/-]+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)[\s/-]+(\d{4})/i);
  if (spanish) {
    const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    return new Date(Number(spanish[3]), months.indexOf(spanish[2].toLowerCase()), Number(spanish[1])).toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}
async function get(url) {
  const response = await fetch(url, { headers: { "user-agent": "festalfas-newsbot/1.0 (public news aggregation; contact: festalfas.vercel.app)", "accept": "text/html,application/rss+xml,application/xml" }, signal: AbortSignal.timeout(18000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} en ${url}`);
  return response.text();
}
const candidates = new Map();
for (const source of SOURCES) {
  try {
    const html = await get(source.archive);
    const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    for (const match of anchors) {
      let url;
      try { url = new URL(match[1], source.archive).href.split("#")[0].split("?")[0]; } catch { continue; }
      if (!source.prefixes.some(prefix => url.startsWith(prefix)) || url === source.archive) continue;
      const title = clean(match[2]);
      if (title.length < 18 || title.length > 220 || !TERMS.test(title)) continue;
      if (/\/tag\/|\/category\/|\/author\/|\/page\/\d+/i.test(url)) continue;
      const key = url.replace(/\/$/, "");
      if (!candidates.has(key)) candidates.set(key, { url, title, source });
    }
  } catch (error) {
    console.warn("No se pudo consultar", source.archive, error.message);
  }
}
const results = [];
for (const candidate of [...candidates.values()].slice(0, 45)) {
  try {
    const html = await get(candidate.url);
    const title = meta(html, "og:title") || meta(html, "twitter:title") || candidate.title;
    const description = meta(html, "og:description") || meta(html, "description") || meta(html, "twitter:description") || title;
    const image = meta(html, "og:image") || meta(html, "twitter:image") || "";
    const date = dateFrom(html);
    const slug = candidate.url.replace(/\/$/, "").split("/").pop().replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    results.push({
      id: "auto-" + slug,
      titulo: title.replace(/\s*[|–-]\s*(Ayuntamiento de l.?Alfàs del Pi|ViveBenidorm|Cadena SER).*$/i, "").trim(),
      resumen: description.slice(0, 360),
      contenido: description.slice(0, 700),
      tipo: candidate.source.type,
      autor: candidate.source.name,
      fuente: candidate.source.name,
      fuente_url: candidate.url,
      imagen_url: image,
      fecha: date,
      publicado: true,
      automatico: true,
    });
  } catch (error) {
    console.warn("No se pudo leer", candidate.url, error.message);
  }
}
results.sort((a, b) => b.fecha.localeCompare(a.fecha));
const unique = [...new Map(results.map(item => [item.fuente_url, item])).values()].slice(0, 35);
let finalNews = unique;
if (unique.length === 0) {
  try {
    const previous = JSON.parse(await (await import("node:fs/promises")).readFile("public/noticias-automaticas.json", "utf8"));
    if (Array.isArray(previous)) finalNews = previous;
  } catch { /* Primera ejecución: no hay archivo anterior que conservar. */ }
}
await writeFile("public/noticias-automaticas.json", JSON.stringify(finalNews, null, 2) + "\n");
console.log(`Noticias festivas disponibles: ${finalNews.length} (nuevas recopiladas: ${unique.length})`);
