export type PenyaAward2026 = { id: string; position: string; category: string; year: string };

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\\u0300-\\u036f]/g, "")
  .toLocaleLowerCase("es")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const records: Record<string, PenyaAward2026[]> = {
  "els 4 gats": [
    { id: "2026-mig-any-paellas-els-4-gats-1", position: "1.º", category: "Paellas · Mig Any", year: "2026" },
  ],
  "destronats popa": [
    { id: "2026-mig-any-paellas-destronats-popa-2", position: "2.º", category: "Paellas · Mig Any", year: "2026" },
  ],
  "la clau": [
    { id: "2026-mig-any-paellas-la-clau-3", position: "3.º", category: "Paellas · Mig Any", year: "2026" },
    { id: "2026-desfile-humor-la-clau-2", position: "2.º", category: "Desfile del Humor · Fiestas del Santísimo Cristo", year: "2026" },
  ],
  "reflotats": [
    { id: "2026-albir-paellas-reflotats-1", position: "1.º", category: "Paellas · Fiestas de l’Albir", year: "2026" },
    { id: "2026-desfile-humor-reflotats-9", position: "9.º", category: "Desfile del Humor · Fiestas del Santísimo Cristo", year: "2026" },
  ],
  "enredats": [
    { id: "2026-albir-paellas-enredats-2", position: "2.º", category: "Paellas · Fiestas de l’Albir", year: "2026" },
    { id: "2026-desfile-humor-enredats-3", position: "3.º", category: "Desfile del Humor · Fiestas del Santísimo Cristo", year: "2026" },
  ],
  "descontrol": [
    { id: "2026-albir-paellas-descontrol-3", position: "3.º", category: "Paellas · Fiestas de l’Albir", year: "2026" },
  ],
  "guirigall": [
    { id: "2026-desfile-humor-guirigall-1", position: "1.º", category: "Desfile del Humor · Fiestas del Santísimo Cristo", year: "2026" },
  ],
  "castanyeta mal de cap": [
    { id: "2026-desfile-humor-castanyeta-mal-de-cap-4", position: "4.º", category: "Desfile del Humor · Fiestas del Santísimo Cristo", year: "2026" },
  ],
  "aixo ho pague jo": [
    { id: "2026-desfile-humor-aixo-ho-pague-jo-5", position: "5.º", category: "Desfile del Humor · Fiestas del Santísimo Cristo", year: "2026" },
  ],
  "induccio": [
    { id: "2026-desfile-humor-induccio-6", position: "6.º", category: "Desfile del Humor · Fiestas del Santísimo Cristo", year: "2026" },
  ],
  "mussol matiner": [
    { id: "2026-desfile-humor-mussol-matiner-7", position: "7.º", category: "Desfile del Humor · Fiestas del Santísimo Cristo", year: "2026" },
    { id: "2026-desfile-humor-critica-mussol-matiner", position: "Premio especial", category: "Premio de la crítica · Desfile del Humor", year: "2026" },
  ],
  "pensat i fet": [
    { id: "2026-desfile-humor-pensat-i-fet-8", position: "8.º", category: "Desfile del Humor · Fiestas del Santísimo Cristo", year: "2026" },
  ],
};

export function getSeededPenyaAwards2026(penyaName: string): PenyaAward2026[] {
  return records[normalize(penyaName)]?.map(item => ({ ...item })) ?? [];
}
