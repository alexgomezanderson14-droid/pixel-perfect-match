import { lazy, Suspense, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const FestMap = lazy(() => import("@/components/FestMap"));

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const schema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(80, "Máximo 80 caracteres"),
  direccion: z.string().trim().max(200, "Máximo 200 caracteres"),
  tipo_musica: z.string().trim().max(80),
  instagram: z.string().trim().max(100),
});

export default function AddPenyaForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [tipoMusica, setTipoMusica] = useState("Variada");
  const [instagram, setInstagram] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const buscar = async () => {
    setError("");
    if (!direccion.trim()) return setError("Escribe una calle o dirección para buscarla.");
    setBusy(true);
    try {
      const queries = [
        direccion.trim() + ", l'Alfàs del Pi, Alicante, España",
        direccion.trim() + ", Alfaz del Pi, Alicante, España",
      ];
      let found: { lat: string; lon: string } | undefined;
      for (const query of queries) {
        const params = new URLSearchParams({
          format: "jsonv2",
          limit: "1",
          countrycodes: "es",
          q: query,
          viewbox: "-0.16,38.62,-0.06,38.54",
          bounded: "1",
        });
        const response = await fetch("https://nominatim.openstreetmap.org/search?" + params.toString(), {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) continue;
        const results = await response.json();
        if (results?.[0]) { found = results[0]; break; }
      }
      if (!found) {
        setError("No hemos podido localizar esa calle automáticamente. Acércate al mapa y marca el punto exacto; también puedes dejar la dirección escrita.");
        return;
      }
      setPos({ lat: Number(found.lat), lng: Number(found.lon) });
    } catch {
      setError("No se pudo consultar el buscador de calles. Marca el punto directamente en el mapa.");
    } finally {
      setBusy(false);
    }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const v = schema.safeParse({ nombre, direccion, tipo_musica: tipoMusica, instagram });
    if (!v.success) return setError(v.error.issues[0]?.message ?? "Revisa los datos.");
    if (pos && (pos.lat < 38.4 || pos.lat > 38.8 || pos.lng < -0.3 || pos.lng > 0.1)) {
      return setError("La ubicación seleccionada parece estar fuera de l’Alfàs del Pi. Acércate al municipio en el mapa y vuelve a marcarla.");
    }
    if (foto && !TIPOS.includes(foto.type)) return setError("La foto debe ser JPG, PNG o WEBP.");
    if (foto && foto.size > 5 * 1024 * 1024) return setError("La foto no puede superar los 5 MB.");

    setBusy(true);
    try {
      let fotoPath: string | null = null;
      if (foto) {
        const ext = (foto.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
        const path = "penyes/" + crypto.randomUUID() + "." + ext;
        const upload = await supabase.storage.from("penyes").upload(path, foto, { contentType: foto.type });
        if (upload.error) throw new Error("No se pudo subir la foto: " + upload.error.message);
        fotoPath = path;
      }

      const { error: insertError } = await supabase.from("penyes").insert({
        nombre: v.data.nombre,
        direccion: v.data.direccion || null,
        lat: pos?.lat ?? null,
        lng: pos?.lng ?? null,
        foto_url: fotoPath,
        tipo_musica: v.data.tipo_musica || "Variada",
        instagram: v.data.instagram.replace(/^@/, ""),
      });
      if (insertError) throw new Error("No se pudo guardar la peña en la base de datos: " + insertError.message);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la peña. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-brown/60 p-3 sm:items-center" onClick={onClose}>
      <form onSubmit={enviar} onClick={(e) => e.stopPropagation()} className="glass max-h-[92vh] w-full max-w-lg space-y-4 overflow-auto rounded-[2rem] bg-background p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-primary">Añadir peña</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="glass-btn h-9 w-9">✕</button>
        </div>
        <label className="block space-y-1 text-sm font-bold">
          <span>Nombre de la peña *</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} className="w-full rounded-full border border-input bg-glass px-4 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <div className="space-y-1 text-sm font-bold">
          <span>Ubicación (opcional)</span>
          <div className="flex gap-2">
            <input value={direccion} onChange={(e) => setDireccion(e.target.value)} maxLength={200} placeholder="Dirección (ej. Calle Mayor, 5)" className="min-w-0 flex-1 rounded-full border border-input bg-glass px-4 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" />
            <button type="button" onClick={buscar} disabled={busy} className="glass-btn shrink-0 px-4 py-2">{busy ? "Buscando…" : "Buscar"}</button>
          </div>
          <p className="font-normal text-muted-foreground">Escribe la dirección. Si quieres, busca la calle o marca el punto exacto en el mapa. También puedes enviar la solicitud sin coordenadas y añadirlas más adelante.</p>
          <div className="h-56 overflow-hidden rounded-2xl">
            <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
              <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}>
                <FestMap lugares={[]} pick={pos} onPick={(lat, lng) => setPos({ lat, lng })} />
              </Suspense>
            </ClientOnly>
          </div>
        </div>
        <label className="block space-y-1 text-sm font-bold">
          <span>Tipo de música</span>
          <select value={tipoMusica} onChange={(e) => setTipoMusica(e.target.value)} className="w-full rounded-full border border-input bg-glass px-4 py-2.5 font-normal"><option>Variada</option><option>Reggaetón</option><option>Pop / comercial</option><option>Rock</option><option>Electrónica</option><option>Remember</option><option>Otra</option></select>
        </label>
        <label className="block space-y-1 text-sm font-bold"><span>Instagram (opcional)</span><input value={instagram} onChange={(e) => setInstagram(e.target.value)} maxLength={100} placeholder="@nombredepenya" className="w-full rounded-full border border-input bg-glass px-4 py-2.5 font-normal" /></label>
        <label className="block space-y-1 text-sm font-bold">
          <span>Fotografía (opcional · JPG, PNG o WEBP, máx. 5 MB)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} className="w-full text-sm font-normal" />
        </label>
        {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">La peña se publicará automáticamente al enviarla. La foto y el punto exacto del mapa son opcionales.</p>
        <button disabled={busy} className="w-full rounded-full bg-pink px-6 py-3 font-bold text-brown disabled:opacity-60">{busy ? "Guardando…" : "Añadir peña"}</button>
      </form>
    </div>
  );
}
