import { readFile, writeFile } from "node:fs/promises";

const INPUT = "public/noticias-automaticas.json";
const OUTPUT = "public/premios-automaticos.json";
const TRUSTED_HOSTS = [
  "lalfas.es",
  "cadenaser.com",
  "vivebenidorm.com",
  "marinabaixadigital.es",
  "informacion.es",
  "portadavalencia.com",
];

const normalize = (value = "") => String(value).normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

function isTrustedArticle(article) {
  if (!article?.fuente_url || article.publicado === false) return false;
  try {
    const host = new URL(article.fuente_url).hostname.toLowerCase().replace(/^www\./, "");
    return TRUSTED_HOSTS.some(domain => host === domain || host.endsWith("." + domain));
  } catch {
    return false;
  }
}

function competitionFrom(text) {
  const value = normalize(text);
  if (/pena mas solidaria/.test(value)) {
    return /donacion de sangre|sangre/.test(value) ? "Peña más solidaria · Donación de sangre" : "Peña más solidaria";
  }
  if (/desfile del humor|concurso de humor/.test(value)) return "Desfile del Humor";
  if (/playbacks?/.test(value)) return "Playbacks";
  if (/paellas?/.test(value)) {
    if (/mig any|migany/.test(value)) return "Paellas Mig Any";
    if (/albir/.test(value)) return "Paellas l’Albir";
    return "Paellas Fiestas";
  }
  return "";
}

function splitPenyaNames(raw) {
  let value = String(raw || "")
    .replace(/^(?:la|una)\s+peña\s+/i, "")
    .replace(/^peñas?\s+/i, "")
    .replace(/\s+(?:con|cada una|respectivamente)\s+[\s\S]*$/i, "")
    .replace(/\s+(?:en el|en la|del|de la)\s+(?:concurso|categor[ií]a|clasificaci[oó]n)[\s\S]*$/i, "")
    .replace(/[“”"']/g, "")
    .trim()
    .replace(/[.;:]+$/, "");
  if (!value) return [];
  const parts = value.split(/\s*,\s*/).flatMap(part => {
    const match = part.match(/^(.+?)\s+y\s+(.+)$/i);
    return match ? [match[1], match[2]] : [part];
  });
  return parts.map(name => name.trim().replace(/^(?:la|una)\s+peña\s+/i, "").replace(/[.;:]+$/, "").trim())
    .filter(name => name.length >= 2 && name.length <= 55)
    .filter(name => !/^(?:las peñas|las participantes|los participantes|el jurado|el ayuntamiento)$/i.test(name));
}

function extractResult(article, competition) {
  const text = [article.titulo, article.resumen, article.contenido].filter(Boolean).join("\n");
  const normalized = normalize(text);
  const evidence = /\b(compartieron|compartido|fue para|recayo en|correspondio a|se alzo con|gano|ganadora|ganador|primer premio|segundo premio|tercer premio|primer puesto|segundo puesto|tercer puesto|empate|mas solidaria)\b/.test(normalized);
  if (!evidence) return [];

  const patterns = [
    { regex: /que\s+compartieron\s+([^.;]+?)(?=,\s*con\b|[.;]|$)/i, position: 1 },
    { regex: /(?:lo|el premio|el reconocimiento)\s+compartieron\s+([^.;]+?)(?=,\s*con\b|[.;]|$)/i, position: 1 },
    { regex: /(?:el|la)\s+(?:premio|reconocimiento|galard[oó]n)\s+(?:a|de)\s+[^.;]{0,100}?\s+(?:fue|recay[oó]|correspondi[oó])\s+(?:para|en|a)\s+([^.;]+)/i, position: 1 },
    { regex: /(?:primer|primero)\s+(?:premio|puesto|lugar)\s+(?:fue|ha sido|correspondi[oó])?\s*(?:para|a|de)?\s+([^.;]+)/i, position: 1 },
    { regex: /(?:segundo)\s+(?:premio|puesto|lugar)\s+(?:fue|ha sido|correspondi[oó])?\s*(?:para|a|de)?\s+([^.;]+)/i, position: 2 },
    { regex: /(?:tercer|tercero)\s+(?:premio|puesto|lugar)\s+(?:fue|ha sido|correspondi[oó])?\s*(?:para|a|de)?\s+([^.;]+)/i, position: 3 },
    { regex: /(?:la|el)\s+peña\s+mas\s+solidaria\s+(?:fue|result[oó]\s+ser|ha\s+sido)\s+([^.;]+)/i, position: 1 },
    { regex: /(?:gan[oó]|se\s+alz[oó]\s+con|result[oó]\s+ganador(?:a)?)\s+(?:el\s+premio|el\s+reconocimiento|el\s+primer\s+puesto)?\s*(?:para|a)?\s+([^.;]+)/i, position: 1 },
  ];

  const results = [];
  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (!match?.[1]) continue;
    const names = splitPenyaNames(match[1]);
    for (const name of names) results.push({ name, position: pattern.position });
  }

  // En noticias de premios solidarios, el empate suele expresarse nombrando
  // a todas las peñas que comparten el reconocimiento en una misma frase.
  if (!results.length && /pena mas solidaria/.test(normalized)) {
    const tie = text.match(/(?:empate[\s\S]{0,180}?que\s+compartieron|compartieron\s+(?:el\s+)?(?:premio|reconocimiento)[\s\S]{0,80}?entre)\s+([^.;]+?)(?=,\s*con\b|[.;]|$)/i);
    for (const name of splitPenyaNames(tie?.[1] || "")) results.push({ name, position: 1 });
  }

  // El nombre de la peña debe aparecer explícitamente ligado al resultado.
  return [...new Map(results.map(item => [normalize(item.name) + "|" + item.position, item])).values()];
}

function makeAward(article, result, competition) {
  const yearMatch = [article.titulo, article.fecha, article.contenido].join(" ").match(/\b(20\d{2})\b/);
  const year = Number(yearMatch?.[1] || String(article.fecha || "").slice(0, 4));
  if (!Number.isInteger(year) || year < 2026 || year > 2100) return null;
  const id = "auto-award-" + [normalize(result.name), year, normalize(competition), result.position].join("-").replaceAll(" ", "-");
  return {
    id,
    penya_id: "",
    penya_name: result.name,
    year,
    competition,
    position: result.position,
    automatico: true,
    source_name: article.fuente || article.autor || "Medio reconocido",
    source_url: article.fuente_url,
    source_date: String(article.fecha || "").slice(0, 10),
  };
}

let news = [];
try {
  const parsed = JSON.parse(await readFile(INPUT, "utf8"));
  if (Array.isArray(parsed)) news = parsed;
} catch (error) {
  console.error("No se pudo leer el archivo de noticias:", error.message);
  process.exitCode = 1;
  throw error;
}

const detected = [];
for (const article of news) {
  if (!isTrustedArticle(article)) continue;
  const content = [article.titulo, article.resumen, article.contenido].filter(Boolean).join("\n");
  const competition = competitionFrom(content);
  if (!competition) continue;
  for (const result of extractResult(article, competition)) {
    const award = makeAward(article, result, competition);
    if (award) detected.push(award);
  }
}

// La misma noticia puede aparecer en más de un medio. Se conserva un único
// registro por peña, año, concurso y puesto, priorizando la fuente oficial.
const unique = new Map();
for (const award of detected) {
  const key = [normalize(award.penya_name), award.year, normalize(award.competition), award.position].join("|");
  const existing = unique.get(key);
  const official = /lalfas\.es$/i.test(new URL(award.source_url).hostname);
  const existingOfficial = existing && /lalfas\.es$/i.test(new URL(existing.source_url).hostname);
  if (!existing || (official && !existingOfficial)) unique.set(key, award);
}

const output = [...unique.values()].sort((a, b) =>
  b.year - a.year || a.competition.localeCompare(b.competition, "es") ||
  a.position - b.position || a.penya_name.localeCompare(b.penya_name, "es")
);
await writeFile(OUTPUT, JSON.stringify(output, null, 2) + "\n");
console.log("Premios detectados en fuentes oficiales y medios reconocidos: " + output.length);
