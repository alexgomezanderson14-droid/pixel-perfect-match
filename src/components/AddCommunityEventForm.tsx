import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AddCommunityEventForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [dia, setDia] = useState("");
  const [hora, setHora] = useState("");
  const [lugar, setLugar] = useState("");
  const [organizador, setOrganizador] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!titulo.trim() || !dia || !hora || !lugar.trim() || !organizador.trim()) {
      setError("Completa el nombre, fecha, hora, lugar y organización.");
      return;
    }
    setBusy(true);
    try {
      const { error: insertError } = await supabase.from("eventos").insert({
        penya_id: null,
        titulo: titulo.trim(),
        descripcion: [descripcion.trim(), "Organiza: " + organizador.trim()].filter(Boolean).join("\n\n"),
        dia,
        hora,
        lugar: lugar.trim(),
        publicado: false,
      });
      if (insertError) throw insertError;
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido enviar la propuesta. Inténtalo más tarde.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-brown/70 p-3 sm:items-center" onClick={onClose}>
    <form onSubmit={enviar} onClick={(e) => e.stopPropagation()} className="glass max-h-[92vh] w-full max-w-xl space-y-4 overflow-auto rounded-[2rem] bg-background p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Agenda de l’Alfàs del Pi</p><h2 className="mt-1 text-2xl font-bold text-primary">Proponer un evento</h2><p className="mt-1 text-sm text-muted-foreground">La propuesta será revisada antes de aparecer públicamente.</p></div><button type="button" onClick={onClose} aria-label="Cerrar" className="glass-btn h-9 w-9 shrink-0">✕</button></div>
      <label className="block space-y-1 text-sm font-bold">Nombre del evento *<input required maxLength={120} value={titulo} onChange={e=>setTitulo(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal"/></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1 text-sm font-bold">Fecha *<input required type="date" value={dia} onChange={e=>setDia(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal"/></label><label className="block space-y-1 text-sm font-bold">Hora *<input required type="time" value={hora} onChange={e=>setHora(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal"/></label></div>
      <label className="block space-y-1 text-sm font-bold">Lugar *<input required maxLength={200} value={lugar} onChange={e=>setLugar(e.target.value)} placeholder="Plaza, calle o recinto" className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal"/></label>
      <label className="block space-y-1 text-sm font-bold">Organiza *<input required maxLength={120} value={organizador} onChange={e=>setOrganizador(e.target.value)} placeholder="Peña, asociación, entidad…" className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal"/></label>
      <label className="block space-y-1 text-sm font-bold">Descripción<textarea maxLength={1000} rows={3} value={descripcion} onChange={e=>setDescripcion(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal"/></label>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">No se ha podido enviar: {error}</p>}
      <button disabled={busy} className="w-full rounded-full bg-pink px-6 py-3 font-bold text-brown disabled:opacity-60">{busy ? "Enviando…" : "Enviar propuesta"}</button>
    </form>
  </div>;
}
