import { lazy, Suspense, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const FestMap = lazy(() => import("@/components/FestMap"));

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const schema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(80, "Máximo 80 caracteres"),
  direccion: z.string().trim().max(200, "Máximo 200 caracteres"),
});

export default function AddPenyaForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const buscar = async () => {
    setError("");
    if (!direccion.trim()) return setError("Escribe una dirección para buscarla.");
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(direccion + ", L'Alfàs del Pi, Alicante")}`;
    try {
      const r = await fetch(url).then((x) => x.json());
      if (!r[0]) return setError("No encontramos esa dirección. Marca la ubicación en el mapa.");
      setPos({ lat: parseFloat(r[0].lat), lng: parseFloat(r[0].lon) });
    } catch {
      setError("No se pudo buscar la dirección. Marca la ubicación en el mapa.");
    }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const v = schema.safeParse({ nombre, direccion });
    if (!v.success) return setError(v.error.issues[0].message);
    if (!pos) return setError("Indica la ubicación: busca la dirección o toca en el mapa.");
    if (!foto) return setError("Añade una fotografía de la peña.");
    if (!TIPOS.includes(foto.type)) return setError("La foto debe ser JPG, PNG o WEBP.");
    if (foto.size > 5 * 1024 * 1024) return setError("La foto no puede superar los 5 MB.");
    setBusy(true);
    const ext = foto.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("penyes").upload(path, foto, { contentType: foto.type });
    if (up.error) {
      setBusy(false);
      return setError("No se pudo subir la foto. Inténtalo de nuevo.");
    }
    const { error: insErr } = await supabase.from("penyes").insert({
      nombre: v.data.nombre,
      direccion: v.data.direccion || null,
      lat: pos.lat,
      lng: pos.lng,
      foto_url: path,
    });
    setBusy(false);
    if (insErr) return setError("No se pudo guardar la peña. Revisa que la ubicación esté en l'Alfàs del Pi.");
    onSaved();
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
          <span>Ubicación *</span>
          <div className="flex gap-2">
            <input value={direccion} onChange={(e) => setDireccion(e.target.value)} maxLength={200} placeholder="Dirección (ej. Calle Mayor, 5)" className="min-w-0 flex-1 rounded-full border border-input bg-glass px-4 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" />
            <button type="button" onClick={buscar} className="glass-btn shrink-0 px-4 py-2">Buscar</button>
          </div>
          <p className="font-normal text-muted-foreground">O toca el mapa para marcar la posición.</p>
          <div className="h-56 overflow-hidden rounded-2xl">
            <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
              <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}>
                <FestMap lugares={[]} pick={pos} onPick={(lat, lng) => setPos({ lat, lng })} />
              </Suspense>
            </ClientOnly>
          </div>
        </div>
        <label className="block space-y-1 text-sm font-bold">
          <span>Fotografía * (JPG, PNG o WEBP, máx. 5 MB)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} className="w-full text-sm font-normal" />
        </label>
        {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <button disabled={busy} className="w-full rounded-full bg-pink px-6 py-3 font-bold text-brown disabled:opacity-60">{busy ? "Guardando…" : "Guardar peña"}</button>
      </form>
    </div>
  );
}
