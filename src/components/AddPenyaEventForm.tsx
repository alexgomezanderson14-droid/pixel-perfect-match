import { lazy, Suspense, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const FestMap = lazy(() => import("@/components/FestMap"));

export default function AddPenyaEventForm({ penyaId, penyaName, onClose, onSaved }: {
  penyaId: string; penyaName: string; onClose: () => void; onSaved: () => void;
}) {
  const [dia, setDia] = useState("2026-11-07");
  const [hora, setHora] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [lugar, setLugar] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (pos && (pos.lat < 38.4 || pos.lat > 38.8 || pos.lng < -0.3 || pos.lng > 0.1)) {
      setError("La ubicación seleccionada parece estar fuera de l’Alfàs del Pi.");
      return;
    }
    if (!titulo.trim() || !dia || !hora.trim() || !lugar.trim()) {
      setError("Indica el nombre, fecha, hora y lugar del evento.");
      return;
    }
    setBusy(true);
    const { error: insertError } = await supabase.from("eventos").insert({
      penya_id: penyaId,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      dia,
      hora: hora.trim(),
      lugar: lugar.trim(),
      lat: pos?.lat ?? null,
      lng: pos?.lng ?? null,
      publicado: false,
    });
    setBusy(false);
    if (insertError) {
      setError("No se ha podido enviar el evento: " + insertError.message);
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-brown/70 p-3 sm:items-center" onClick={onClose}>
      <form onSubmit={enviar} onClick={(e) => e.stopPropagation()} className="glass max-h-[92vh] w-full max-w-xl space-y-4 overflow-auto rounded-[2rem] bg-background p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Colabora con la agenda</p><h2 className="mt-1 text-2xl font-bold text-primary">Añadir evento · {penyaName}</h2></div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="glass-btn h-9 w-9 shrink-0">✕</button>
        </div>
        <label className="block space-y-1 text-sm font-bold">Nombre del evento *<input required maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm font-bold">Fecha *<input required type="date" value={dia} onChange={(e) => setDia(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal" /></label>
          <label className="block space-y-1 text-sm font-bold">Hora *<input required type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal" /></label>
        </div>
        <label className="block space-y-1 text-sm font-bold">Lugar *<input required maxLength={200} placeholder="Calle, plaza o dirección" value={lugar} onChange={(e) => setLugar(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal" /></label>
        <label className="block space-y-1 text-sm font-bold">Descripción<textarea maxLength={1000} rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal" /></label>
        <div className="space-y-2"><p className="text-sm font-bold">Ubicación exacta en el mapa (opcional)</p><div className="h-52 overflow-hidden rounded-2xl"><ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}><Suspense fallback={<div className="h-full animate-pulse bg-muted" />}><FestMap lugares={[]} pick={pos} onPick={(lat, lng) => setPos({ lat, lng })} /></Suspense></ClientOnly></div>{pos && <button type="button" onClick={() => setPos(null)} className="text-xs underline">Quitar ubicación marcada</button>}</div>
        {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">El evento quedará pendiente de revisión antes de aparecer públicamente.</p>
        <button disabled={busy} className="w-full rounded-full bg-pink px-6 py-3 font-bold text-brown disabled:opacity-60">{busy ? "Enviando…" : "Enviar evento"}</button>
      </form>
    </div>
  );
}
