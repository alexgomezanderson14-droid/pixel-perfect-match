import { readFile, writeFile } from "node:fs/promises";

const SOURCES = [
  { name: "Ayuntamiento de l’Alfàs del Pi", type: "oficial", archive: "https://www.lalfas.es/concejalias/fiestas/", prefixes: ["https://www.lalfas.es/concejalias/"] },
  { name: "Ayuntamiento de l’Alfàs del Pi", type: "oficial", archive: "https://www.lalfas.es/fiestas/", prefixes: ["https://www.lalfas.es/"] },
  { name: "Cadena SER · Radio Benidorm", type: "externa", archive: "https://cadenaser.com/tag/lalfas_del_pi/a/", prefixes: ["https://cadenaser.com/comunitat-valenciana/"] },
  { name: "ViveBenidorm", type: "externa", archive: "https://www.vivebenidorm.com/", prefixes: ["https://www.vivebenidorm.com/"] },
];
const TERMS = /fiest|peñ|pena|mayoral|mejoral|jubileo|cristo|festes|carnaval|cabalgata|romer[ií]a|tradici[oó]n|desfile|correfoc|moros|navidad|san\s+jose|sant[ií]sim/i;
const STOP = new Set("de la el los las un una unos unas y o en del al con por para que se su sus es son vivir vive celebra celebrar celebraràn celebraran prepara preparan lalfas alfàs alfaz pi fiestas fiesta festes".split(" "));
const decode = (value = "") => value
  .replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
  .replace(/&#0*39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
  .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const clean = (value = "") => decode(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
function meta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attributes = Object.fromEntries([...tag.matchAll(/([a-z:-]+)\s*=\s*["']([^"']*)["']/gi)].map(match => [match[1].toLowerCase(), decode(match[2])]));
    if (attributes.property === key || attributes.name === key) return clean(attributes.content || "");
  }
  return "";
}
function imageFrom(html, pageUrl) {
  const raw = meta(html, "og:image:secure_url") || meta(html, "og:image") ||
    meta(html, "twitter:image") || meta(html, "twitter:image:src") ||
    html.match(/<link\b[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)/i)?.[1] ||
    html.match(/<article\b[\s\S]{0,5000}?<img\b[^>]*(?:src|data-src)=["']([^"']+)/i)?.[1] || "";
  if (!raw) return "";
  try {
    const url = new URL(decode(raw), pageUrl);
    return /^https?:$/.test(url.protocol) ? url.href : "";
  } catch { return ""; }
}
function dateFrom(html) {
  const iso = html.match(/<time[^>]+datetime=["']([^"']+)/i)?.[1] || html.match(/"datePublished"\s*:\s*"([^"]+)/i)?.[1];
  if (iso && !Number.isNaN(Date.parse(iso))) return new Date(iso).toISOString().slice(0, 10);
  const spanish = html.match(/(\d{1,2})[\s/-]+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)[\s/-]+(\d{4})/i);
  if (spanish) {
    const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    return new Date(Number(spanish[3]), months.indexOf(spanish[2].toLowerCase()), Number(spanish[1])).toISOString().slice(0, 10);
  }
  return "";
}
function articleParagraphs(html) {
  const preferred = html.match(/<(?:article|main)\b[^>]*>([\s\S]*?)<\/(?:article|main)>/i)?.[1] || html;
  const withoutNoise = preferred.replace(/<(script|style|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, " ");
  return [...withoutNoise.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(match => clean(match[1]))
    .filter(text => text.length >= 55 && !/cookies?|pol[ií]tica de privacidad|suscr[ií]bete|leer m[aá]s noticias|publicidad|compartir esta noticia/i.test(text))
    .filter((text, index, all) => all.indexOf(text) === index)
    .slice(0, 7);
}
async function get(url) {
  const response = await fetch(url, { headers: { "user-agent": "festalfas-newsbot/1.0 (public news aggregation; contact: festalfas.vercel.app)", "accept": "text/html,application/rss+xml,application/xml" }, signal: AbortSignal.timeout(18000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} en ${url}`);
  return response.text();
}
function tokens(item) {
  return new Set((String(item.titulo || "") + " " + String(item.resumen || ""))
    .toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
    .filter(word => word.length > 3 && !STOP.has(word)));
}
function similar(a, b) {
  const aa = tokens(a), bb = tokens(b);
  if (!aa.size || !bb.size) return false;
  const common = [...aa].filter(word => bb.has(word)).length;
  const overlap = common / Math.min(aa.size, bb.size);
  const union = common / new Set([...aa, ...bb]).size;
  return overlap >= 0.65 && union >= 0.28;
}
let previous = [];
try { previous = JSON.parse(await readFile("public/noticias-automaticas.json", "utf8")); } catch { previous = []; }
if (!Array.isArray(previous)) previous = [];

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
      if (source.name === "ViveBenidorm" && !/l.?alf[aà]s|alfaz/i.test(title + " " + url)) continue;
      if (/\/tag\/|\/category\/|\/author\/|\/page\/\d+/i.test(url)) continue;
      const key = url.replace(/\/$/, "");
      if (!candidates.has(key)) candidates.set(key, { url, title, source });
    }
  } catch (error) { console.warn("No se pudo consultar", source.archive, error.message); }
}
// Volver a consultar las noticias ya guardadas permite completar imágenes y resúmenes,
// aunque el medio haya retirado la noticia de su portada o archivo reciente.
for (const item of previous) {
  if (!item?.fuente_url || candidates.has(item.fuente_url.replace(/\/$/, ""))) continue;
  const source = SOURCES.find(entry => item.fuente_url.startsWith(entry.prefixes[0])) ||
    SOURCES.find(entry => item.fuente_url.startsWith(entry.prefixes[0].replace("/concejalias/", "/")));
  if (source) candidates.set(item.fuente_url.replace(/\/$/, ""), { url: item.fuente_url, title: item.titulo || "", source, previous: item });
}
const results = [];
for (const candidate of [...candidates.values()].slice(0, 55)) {
  try {
    const html = await get(candidate.url);
    const title = meta(html, "og:title") || meta(html, "twitter:title") || candidate.title || candidate.previous?.titulo || "";
    const description = meta(html, "og:description") || meta(html, "description") || meta(html, "twitter:description") || "";
    const paragraphs = articleParagraphs(html);
    const summaryParts = paragraphs.length ? paragraphs.slice(0, 3) : [description].filter(Boolean);
    const summary = summaryParts.join(" ").slice(0, 720) || candidate.previous?.resumen || description || title;
    const body = paragraphs.length ? paragraphs.slice(0, 6).join("\n\n").slice(0, 2400) : (description || candidate.previous?.contenido || summary).slice(0, 1200);
    const image = imageFrom(html, candidate.url) || candidate.previous?.imagen_url || "";
    const date = dateFrom(html);
    const slug = candidate.url.replace(/\/$/, "").split("/").pop().replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    results.push({
      id: "auto-" + slug,
      titulo: title.replace(/\s*[|–-]\s*(Ayuntamiento de l.?Alfàs del Pi|ViveBenidorm|Cadena SER).*$/i, "").trim(),
      resumen: summary,
      contenido: body,
      tipo: candidate.source.type,
      autor: candidate.source.name,
      fuente: candidate.source.name,
      fuente_url: candidate.url,
      imagen_url: image,
      fecha: date || candidate.previous?.fecha,
      publicado: true,
      automatico: true,
    });
  } catch (error) {
    console.warn("No se pudo leer", candidate.url, error.message);
    if (candidate.previous) results.push(candidate.previous);
  }
}
results.sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
const byUrl = [...new Map(results.map(item => [item.fuente_url, item])).values()];
const unique = [];
for (const item of byUrl) {
  const duplicateIndex = unique.findIndex(existing => similar(item, existing));
  if (duplicateIndex === -1) unique.push(item);
  else {
    // Conservar el artículo más completo; si empatan, priorizar el resumen más largo.
    const existing = unique[duplicateIndex];
    const score = value => (value.imagen_url ? 300 : 0) + String(value.contenido || "").length + String(value.resumen || "").length;
    if (score(item) > score(existing)) unique[duplicateIndex] = item;
  }
}
const finalNews = unique.slice(0, 35);
await writeFile("public/noticias-automaticas.json", JSON.stringify(finalNews, null, 2) + "\n");
console.log(`Noticias festivas disponibles: ${finalNews.length} (recopiladas: ${results.length}; tras eliminar duplicadas: ${unique.length})`);
