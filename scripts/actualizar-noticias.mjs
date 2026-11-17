import { readFile, writeFile } from "node:fs/promises";

const MIN_DATE = "2026-10-01";
const SOURCES = [
  { name: "Ayuntamiento de l’Alfàs del Pi", type: "oficial", archive: "https://www.lalfas.es/concejalias/fiestas/", prefixes: ["https://www.lalfas.es/"] },
  { name: "Ayuntamiento de l’Alfàs del Pi", type: "oficial", archive: "https://www.lalfas.es/fiestas/", prefixes: ["https://www.lalfas.es/"] },
  { name: "Ayuntamiento de l’Alfàs del Pi", type: "oficial", archive: "https://www.lalfas.es/concejalias/seguridad-ciudadana/", prefixes: ["https://www.lalfas.es/"] },
  { name: "Ayuntamiento de l’Alfàs del Pi", type: "oficial", archive: "https://www.lalfas.es/concejalias/sanidad/", prefixes: ["https://www.lalfas.es/"] },
  { name: "Ayuntamiento de l’Alfàs del Pi", type: "oficial", archive: "https://www.lalfas.es/concejalias/cultura/", prefixes: ["https://www.lalfas.es/"] },
  { name: "Ayuntamiento de l’Alfàs del Pi", type: "oficial", archive: "https://www.lalfas.es/concejalias/alcaldia/", prefixes: ["https://www.lalfas.es/"] },
  { name: "Ayuntamiento de l’Alfàs del Pi", type: "oficial", archive: "https://www.lalfas.es/concejalias/juventud/", prefixes: ["https://www.lalfas.es/"] },
  { name: "Cadena SER · Radio Benidorm", type: "externa", archive: "https://cadenaser.com/tag/lalfas_del_pi/a/", prefixes: ["https://cadenaser.com/comunitat-valenciana/"] },
  { name: "ViveBenidorm", type: "externa", archive: "https://www.vivebenidorm.com/", prefixes: ["https://www.vivebenidorm.com/"] },
  { name: "Marina Baixa Digital", type: "externa", archive: "https://marinabaixadigital.es/sec/fiestas", prefixes: ["https://marinabaixadigital.es/"] },
  { name: "Información", type: "externa", archive: "https://www.informacion.es/benidorm/", prefixes: ["https://www.informacion.es/benidorm/"] },
  { name: "Portada Valencia", type: "externa", archive: "https://portadavalencia.com/es/la-marina-baixa/lalfas-del-pi/", prefixes: ["https://portadavalencia.com/"] },
];
const TERMS = /fiest|peñ|pena|mayoral|majoral|jubileo|cristo|festes|carnaval|cabalgata|romer[ií]a|tradici[oó]n|desfile|correfoc|moros|navidad|san\s+jose|sant[ií]sim|9\s*d.?octubre|festiv|fester|festero|festa/i;
const SEED_URLS = [{"url":"https://www.lalfas.es/concejalias/fiestas/deporte-y-fiestas-se-dan-la-mano-en-el-torneo-de-padel-de-los-mayorales-de-sant-josep/","title":"Deporte y fiestas se dan la mano en el torneo de pádel de los Mayorales de Sant Josep","date":"2026-10-05","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/fiestas/la-parroquia-de-san-jose-de-lalfas-del-pi-recupera-el-expositor-del-santisimo-sacramento-con-motivo-de-las-celebraciones-jubilares/","title":"La Parroquia de San José recupera el expositor del Santísimo Sacramento con motivo de las celebraciones jubilares","date":"2026-10-05","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/fiestas/un-libro-sobre-la-serra-gelada-y-una-ruta-literaria-abren-manana-la-programacion-del-9-doctubre-en-lalfas/","title":"Un libro sobre la Serra Gelada y una ruta literaria abren la programación del 9 d’Octubre","date":"2026-10-06","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/fiestas/los-actos-del-9-doctubre-continuan-manana-jueves-con-juegos-populares-gastronomia-y-musica/","title":"Los actos del 9 d’Octubre continúan con juegos populares, gastronomía y música","date":"2026-10-07","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/fiestas/lalfas-del-pi-celebra-manana-su-jornada-principal-del-9-doctubre-con-tradicion-y-actividades-para-toda-la-familia/","title":"L’Alfàs celebra la jornada principal del 9 d’Octubre con tradición y actividades para toda la familia","date":"2026-10-08","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/fiestas/lalfas-del-pi-cierra-la-programacion-del-9-doctubre-con-una-amplia-participacion-en-las-actividades/","title":"L’Alfàs cierra la programación del 9 d’Octubre con amplia participación","date":"2026-10-10","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/fiestas/el-9-doctubre-en-imagenes/","title":"El 9 d’Octubre en imágenes","date":"2026-10-10","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/sanidad/lalfas-reta-a-sus-penas-festeras-a-sumarse-a-la-campana-de-donacion-de-sangre/","title":"L’Alfàs reta a sus peñas festeras a sumarse a la campaña de donación de sangre","date":"2026-10-23","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/seguridad-ciudadana/la-junta-de-seguridad-ciudadana-planifica-el-dispositivo-para-las-fiestas-de-lalfas-del-pi/","title":"La Junta de Seguridad Ciudadana planifica el dispositivo para las fiestas de l’Alfàs","date":"2026-10-26","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/seguridad-ciudadana/dos-bandos-municipales-recuerdan-las-normas-de-convivencia-y-seguridad-durante-las-fiestas-del-jubileo/","title":"Dos bandos municipales recuerdan las normas de convivencia y seguridad durante las Fiestas del Jubileo","date":"2026-11-03","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/fiestas/lalfas-del-pi-habilita-un-autobus-gratuito-nocturno-durante-las-fiestas-del-cristo/","title":"L’Alfàs habilita un autobús gratuito nocturno durante las Fiestas del Cristo","date":"2026-11-04","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/fiestas/el-libro-de-fiestas-del-jubileo-de-lalfas-2026-ya-esta-en-la-calle/","title":"El Libro de Fiestas del Jubileo de l’Alfàs 2026 ya está en la calle","date":"2026-11-05","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/fiestas/ya-esta-operativo-el-dispositivo-especial-de-seguridad-para-las-fiestas-del-jubileo-de-lalfas/","title":"Ya está operativo el dispositivo especial de seguridad para las Fiestas del Jubileo","date":"2026-11-06","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/fiestas/el-espectaculo-de-fuego-de-los-dimonis-rafolins-pone-el-broche-a-los-actos-liturgicos-del-jubileo-de-lalfas/","title":"El espectáculo de fuego de los Dimonis Rafolins pone el broche al Jubileo","date":"2026-11-10","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/fiestas/unas-fiestas-libres-de-violencia-lalfas-instala-un-punto-violeta-y-arco-iris-durante-el-jubileo/","title":"L’Alfàs instala un Punto Violeta y Arco Iris durante el Jubileo","date":"2026-11-09","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/fiestas/las-actividades-infantiles-tambien-han-tenido-su-espacio-en-las-fiestas-del-jubileo-de-lalfas/","title":"Las actividades infantiles también han tenido su espacio en las Fiestas del Jubileo","date":"2026-11-09","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/fiestas/28-penas-llenan-de-color-las-calles-de-lalfas-en-el-tradicional-desfile-del-humor/","title":"28 peñas llenan de color las calles de l’Alfàs en el tradicional Desfile del Humor","date":"2026-11-09","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/fiestas/flores-tradicion-y-devocion-en-la-ofrenda-al-santisimo-cristo-del-buen-acierto/","title":"Flores, tradición y devoción en la ofrenda al Santísimo Cristo del Buen Acierto","date":"2026-11-09","type":"oficial"},{"url":"https://www.lalfas.es/concejalias/fiestas/un-millar-de-personas-disfrutan-del-mejor-rock-con-la-mitica-banda-seguridad-social-en-las-fiestas-de-lalfas/","title":"Un millar de personas disfrutan del mejor rock con Seguridad Social en las fiestas de l’Alfàs","date":"2026-11-09","type":"oficial"},{"url":"https://www.informacion.es/benidorm/2026/11/03/tradiciones-traspasan-fronteras-importa-vengas-bc-136028162.html","title":"Nuestras tradiciones traspasan fronteras, no importa de dónde vengas para sentirte parte de l’Alfàs","date":"2026-11-03","type":"externa","sourceName":"Información"},{"url":"https://marinabaixadigital.es/art/7483/lalfas-presenta-libro-fiestas-jubileo-2026","title":"L’Alfàs presenta el Libro de Fiestas del Jubileo 2026 con 44 peñas","date":"2026-11-05","type":"externa","sourceName":"Marina Baixa Digital"},{"url":"https://portadavalencia.com/es/la-marina-baixa/lalfas-del-pi/lalfas-del-pi-presenta-el-libro-de-las-fiestas-del-jubileo-y-del-santisimo-cristo-del-buen-acierto-2026","title":"L’Alfàs presenta el libro de las Fiestas del Jubileo 2026","date":"2026-11-05","type":"externa","sourceName":"Portada Valencia"}];
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
function structuredArticleData(html) {
  const records = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1].replace(/^\s*<!--|-->\s*$/g, ""));
      const visit = (value) => {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) return value.forEach(visit);
        const type = [value["@type"]].flat().join(" ").toLowerCase();
        if (/article|newsarticle|reportage|blogposting/.test(type) || value.articleBody) records.push(value);
        Object.values(value).forEach(visit);
      };
      visit(parsed);
    } catch { /* JSON-LD inválido: se continúa con el HTML visible. */ }
  }
  return records.sort((a, b) => String(b.articleBody || "").length - String(a.articleBody || "").length);
}
function absoluteImage(raw, pageUrl) {
  if (!raw || typeof raw !== "string") return "";
  try {
    const url = new URL(decode(raw.trim().split(/\s+/)[0]), pageUrl);
    return /^https?:$/.test(url.protocol) ? url.href : "";
  } catch { return ""; }
}
function imageFrom(html, pageUrl, structured = []) {
  const structuredImage = structured.flatMap(item => {
    const image = item.image || item.thumbnailUrl || [];
    return (Array.isArray(image) ? image : [image]).map(value => typeof value === "string" ? value : value?.url || value?.contentUrl || "");
  }).map(value => absoluteImage(value, pageUrl)).find(Boolean);
  const raw = meta(html, "og:image:secure_url") || meta(html, "og:image") ||
    meta(html, "twitter:image") || meta(html, "twitter:image:src") ||
    html.match(/<link\b[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)/i)?.[1] ||
    html.match(/<article\b[\s\S]{0,5000}?<img\b[^>]*(?:src|data-src)=["']([^"']+)/i)?.[1] || "";
  return structuredImage || absoluteImage(raw, pageUrl);
}
function extractElement(html, openingMatch) {
  const tag = openingMatch[1].toLowerCase();
  const from = openingMatch.index;
  const token = new RegExp("<\\/?"+tag+"\\b[^>]*>", "gi");
  token.lastIndex = from;
  let depth = 0;
  let match;
  while ((match = token.exec(html))) {
    if (/^<\//.test(match[0])) depth--;
    else if (!/\/>$/.test(match[0])) depth++;
    if (depth === 0) return html.slice(from, token.lastIndex);
  }
  return "";
}
function articleContent(html, pageUrl, structured = []) {
  const containers = [];
  const openingTags = [...html.matchAll(/<(article|main|section|div)\b[^>]*>/gi)];
  for (const opening of openingTags) {
    const tag = opening[1].toLowerCase();
    const attrs = opening[0];
    const preferredDiv = tag === "div" && /class=["'][^"']*(?:article[-_ ]?(?:body|content|text)|entry[-_ ]content|post[-_ ]content|story[-_ ]body|news[-_ ]content|content[-_ ]article|nota[-_ ]content)[^"']*["']/i.test(attrs);
    if (tag !== "article" && tag !== "main" && !preferredDiv) continue;
    const block = extractElement(html, opening);
    if (block) containers.push(block);
  }
  const candidates = [...containers, html];
  const cleanParagraphs = (source) => [...source.matchAll(/<(?:p|h2|h3|h4|blockquote|li|figcaption|td|th|dt|dd)\b[^>]*>([\s\S]*?)<\/(?:p|h2|h3|h4|blockquote|li|figcaption|td|th|dt|dd)>/gi)]
    .map(match => clean(match[1]))
    .filter(text => text.length >= 28 &&
      !/cookies?|pol[ií]tica de privacidad|suscr[ií]bete|leer m[aá]s noticias|publicidad|compartir esta noticia|aceptar todas|iniciar sesi[oó]n|art[ií]culos relacionados|noticias relacionadas/i.test(text))
    .filter((text, index, all) => all.indexOf(text) === index);
  const ranked = candidates.map(source => ({ source, paragraphs: cleanParagraphs(source) }))
    .sort((a, b) => b.paragraphs.join("\n\n").length - a.paragraphs.join("\n\n").length);
  let paragraphs = ranked[0]?.paragraphs || [];
  const structuredBody = structured.map(item => item.articleBody).find(value => typeof value === "string" && value.trim().length > 150);
  if (structuredBody) {
    const structuredParagraphs = structuredBody.split(/\n{2,}|(?<=[.!?])\s{2,}/).map(value => clean(value)).filter(value => value.length >= 28);
    if (structuredParagraphs.join("\n\n").length > paragraphs.join("\n\n").length) paragraphs = structuredParagraphs;
  }
  const imageSource = ranked[0]?.source || html;
  const images = [...imageSource.matchAll(/<(?:img|source)\b[^>]*>/gi)].map(match => {
    const attrs = Object.fromEntries([...match[0].matchAll(/([a-z:-]+)\s*=\s*["']([^"']*)["']/gi)].map(item => [item[1].toLowerCase(), decode(item[2])]));
    const raw = attrs.src || attrs["data-src"] || attrs["data-lazy-src"] || attrs["data-original"] ||
      attrs["data-srcset"]?.split(",").pop()?.trim().split(/\s+/)[0] ||
      attrs.srcset?.split(",").pop()?.trim().split(/\s+/)[0] || "";
    return absoluteImage(raw, pageUrl);
  }).filter((url, index, all) => url && all.indexOf(url) === index && !/logo|avatar|icon|pixel|sprite|tracking/i.test(url));
  return { paragraphs, images };
}
function dateFrom(html, structured = []) {
  const candidates = [
    ...structured.flatMap(item => [item.datePublished, item.dateCreated, item.dateModified]),
    meta(html, "article:published_time"), meta(html, "article:modified_time"),
    meta(html, "datePublished"), meta(html, "pubdate"), meta(html, "publish-date"),
    meta(html, "DC.date.issued"),
    html.match(/<time\b[^>]*datetime=["']([^"']+)["']/i)?.[1] || "",
    html.match(/(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo)?\s*,?\s*(\d{1,2})\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(20\d{2})/i)?.[0] || "",
  ].filter(Boolean);
  const months = { enero:"01", febrero:"02", marzo:"03", abril:"04", mayo:"05", junio:"06", julio:"07", agosto:"08", septiembre:"09", octubre:"10", noviembre:"11", diciembre:"12" };
  for (const raw of candidates) {
    const value = String(raw).trim();
    const iso = value.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
    if (iso) return iso[1] + "-" + iso[2].padStart(2,"0") + "-" + iso[3].padStart(2,"0");
    const numeric = value.match(/(\d{1,2})[/. -](\d{1,2})[/. -](20\d{2})/);
    if (numeric) return numeric[3] + "-" + numeric[2].padStart(2,"0") + "-" + numeric[1].padStart(2,"0");
    const spanish = value.match(/(\d{1,2})\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(20\d{2})/i);
    if (spanish) return spanish[3] + "-" + months[spanish[2].toLowerCase()] + "-" + spanish[1].padStart(2,"0");
  }
  return "";
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
const officialSource = SOURCES.find(source => source.name.startsWith("Ayuntamiento"));
const sourceForUrl = (url, preferredName = "") =>
  SOURCES.find(source => preferredName && source.name === preferredName) ||
  SOURCES.find(source => source.prefixes.some(prefix => url.startsWith(prefix))) ||
  officialSource;
for (const seed of SEED_URLS) {
  const source = sourceForUrl(seed.url, seed.sourceName);
  const previousItem = {
    id: "auto-" + seed.url.replace(/\/$/, "").split("/").pop().replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
    titulo: seed.title, resumen: "", contenido: "", tipo: seed.type,
    autor: source.name, fuente: source.name, fuente_url: seed.url,
    imagen_url: "", imagenes_url: [], fecha: seed.date, publicado: true, automatico: true,
  };
  candidates.set(seed.url.replace(/\/$/, ""), { url: seed.url, title: seed.title, source, previous: previousItem });
}
for (const item of previous) {
  if (!item?.fuente_url || (item.fecha && String(item.fecha).slice(0,10) < MIN_DATE)) continue;
  const key = item.fuente_url.replace(/\/$/, "");
  const source = sourceForUrl(item.fuente_url, item.fuente);
  if (!candidates.has(key)) candidates.set(key, { url: item.fuente_url, title: item.titulo || "", source, previous: item });
}
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
      if (source.name === "Marina Baixa Digital" && !/l.?alf[aà]s|alfaz/i.test(title + " " + url)) continue;
      if (source.name === "Marina Baixa Digital" && !/l.?alf[aà]s|alfaz/i.test(title + " " + url)) continue;
      if (/\/tag\/|\/category\/|\/author\/|\/page\/\d+/i.test(url)) continue;
      const key = url.replace(/\/$/, "");
      if (!candidates.has(key)) candidates.set(key, { url, title, source });
    }
  } catch (error) { console.warn("No se pudo consultar", source.archive, error.message); }
}
const results = [];
for (const candidate of [...candidates.values()].slice(0, 180)) {
  try {
    const html = await get(candidate.url);
    const title = meta(html, "og:title") || meta(html, "twitter:title") || candidate.title || candidate.previous?.titulo || "";
    const description = meta(html, "og:description") || meta(html, "description") || meta(html, "twitter:description") || "";
    const structured = structuredArticleData(html);
    const article = articleContent(html, candidate.url, structured);
    const paragraphs = article.paragraphs;
    const summaryParts = paragraphs.length ? paragraphs.slice(0, 2) : [description].filter(Boolean);
    const summary = summaryParts.join(" ").slice(0, 1100) || candidate.previous?.resumen || description || title;
    // Guardar el texto público completo que ofrece la página, sin limitarlo a seis párrafos.
    const body = candidate.source.type === "externa" ? (summary || description || title) : (paragraphs.length ? paragraphs.join("\n\n") : (candidate.previous?.contenido || description || summary));
    const image = imageFrom(html, candidate.url, structured) || candidate.previous?.imagen_url || "";
    const imagenes_url = [...new Set([...article.images, ...(candidate.previous?.imagenes_url || [])])].filter(url => url !== image);
    const date = dateFrom(html, structured) || candidate.previous?.fecha || "";
    const publishedDate = String(date).slice(0,10);
    if (!publishedDate || publishedDate < MIN_DATE) continue;
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
      imagenes_url,
      fecha: publishedDate,
      publicado: true,
      automatico: true,
    });
  } catch (error) {
    console.warn("No se pudo leer", candidate.url, error.message);
    if (candidate.previous) results.push(candidate.previous);
  }
}
results.sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
const byUrl = [...new Map(results.filter(item => item.fuente_url && String(item.fecha || "").slice(0,10) >= MIN_DATE).map(item => [item.fuente_url.replace(/\/$/, ""), item])).values()];
const unique = [];
const normalizedTitle = value => String(value || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
for (const item of byUrl) {
  const title = normalizedTitle(item.titulo);
  const duplicateIndex = unique.findIndex(existing => normalizedTitle(existing.titulo) === title);
  if (duplicateIndex === -1) unique.push(item);
  else {
    const existing = unique[duplicateIndex];
    const score = value => (value.imagen_url ? 300 : 0) + String(value.contenido || "").length + String(value.resumen || "").length;
    if (score(item) > score(existing)) unique[duplicateIndex] = item;
  }
}
const finalNews = unique.sort((a,b) => String(b.fecha).localeCompare(String(a.fecha)));
await writeFile("public/noticias-automaticas.json", JSON.stringify(finalNews, null, 2) + "\n");
console.log("Noticias festivas desde " + MIN_DATE + ": " + finalNews.length + " (recopiladas: " + results.length + "; sin duplicados: " + unique.length + ")");
