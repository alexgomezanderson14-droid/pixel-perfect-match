import { supabase } from "@/integrations/supabase/client";
export type PenyaInsigniaKind = "redonda" | "cuadrada" | "playback";
export type PenyaInsignia = { url: string; path?: string; name?: string };
export type PenyaInsigniaMap = Record<string, PenyaInsignia>;
export const PENYA_INSIGNIA_KEY = "penyes_insignias_json";
let cached: Promise<PenyaInsigniaMap> | null = null;
export function insigniaId(kind: PenyaInsigniaKind, position: number) { return kind + "_" + position; }
export function loadPenyaInsignias(): Promise<PenyaInsigniaMap> {
 if (!cached) cached = Promise.resolve(supabase.from("site_content").select("valor").eq("clave", PENYA_INSIGNIA_KEY).maybeSingle().then(({data,error}) => {
  if (error) throw error;
  try { const parsed=JSON.parse(data?.valor||"{}"); return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed as PenyaInsigniaMap:{}; } catch { return {}; }
 })).catch((): PenyaInsigniaMap => ({}));
 return cached!;
}
export async function savePenyaInsignias(value: PenyaInsigniaMap) {
 const {error}=await supabase.from("site_content").upsert({clave:PENYA_INSIGNIA_KEY,valor:JSON.stringify(value)});
 if(error)throw error;
 cached=Promise.resolve(value);
}