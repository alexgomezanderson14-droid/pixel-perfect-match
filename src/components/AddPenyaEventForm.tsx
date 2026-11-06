import { supabase } from "@/integrations/supabase/client";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function AddPenyaEventForm({ penyaId, penyaName, onClose, onSaved }: {
  penyaId: string; penyaName: string; onClose: () => void; onSaved: (organizaEvento: boolean) => void;
}) {
  const [organizaEvento, setOrganizaEvento] = useState<"si" | "no">("si");
  const [dia, setDia] = useState("2026-11-07");
  const [hora, setHora] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [lugar, setLugar] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (organizaEvento === "si") {
      if (!titulo.trim() || !dia || !hora.trim() || !lugar.trim() || !imagen) {
        setError("Indica el nombre, fecha, hora, lugar y una imagen del evento.");
        return;
      }
      if (!IMAGE_TYPES.includes(imagen.type)) {
        setError("La imagen debe ser JPG, PNG o WEBP.");
        return;
      }
      if (imagen.size > 5 * 1024 * 1024) {
        setError("La imagen no puede superar los 5 MB.");
        return;
      }
    }

    setBusy(true);
    try {
      if (organizaEvento === "no") {
        const { error: updateError } = await supabase.from("penyes").update({ tiene_evento: false }).eq("id", penyaId);
        if (updateError) throw new Error("No se pudo guardar la respuesta: " + updateError.message);
        onSaved(false);
        return;
      }

      const ext = imagen!.type === "image/png" ? "png" : imagen!.type === "image/webp" ? "webp" : "jpg";
      const imagePath = "eventos/" + crypto.randomUUID() + "." + ext;
      const upload = await supabase.storage.from("penyes").upload(imagePath, imagen!, { contentType: imagen!.type });
      if (upload.error) throw new Error("No se pudo subir la imagen: " + upload.error.message);

      const imageUrl = supabase.storage.from("penyes").getPublicUrl(imagePath).data.publicUrl;
      const { error: insertError } = await supabase.from("eventos").insert({
        penya_id: penyaId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        dia,
        hora: hora.trim(),
        lugar: lugar.trim(),
        imagen_url: imageUrl,
        publicado: false,
      });
      if (insertError) throw new Error("No se ha podido enviar el evento: " + insertError.message);

      // The event itself is the source of truth; this flag is only a convenience for the card.
      // Do not report failure after a successful insert if this optional update is denied.
      await supabase.from("penyes").update({ tiene_evento: true }).eq("id", penyaId);
      onSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el evento. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-brown/70 p-3 sm:items-center" onClick={onClose}>
      <form onSubmit={enviar} onClick={(e) => e.stopPropagation()} className="glass max-h-[92vh] w-full max-w-xl space-y-4 overflow-auto rounded-[2rem] bg-background p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Colabora con la agenda</p><h2 className="mt-1 text-2xl font-bold text-primary">Evento · {penyaName}</h2></div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="glass-btn h-9 w-9 shrink-0">✕</button>
        </div>
        <fieldset className="space-y-3">
          <legend className="text-sm font-bold">¿Vais a organizar algún evento durante las fiestas?</legend>
          <div className="flex gap-3">
            <label className="flex flex-1 items-center gap-2 rounded-xl border border-input p-3"><input type="radio" name="organiza-evento" value="si" checked={organizaEvento === "si"} onChange={() => setOrganizaEvento("si")} /> Sí</label>
            <label className="flex flex-1 items-center gap-2 rounded-xl border border-input p-3"><input type="radio" name="organiza-evento" value="no" checked={organizaEvento === "no"} onChange={() => setOrganizaEvento("no")} /> No</label>
          </div>
        </fieldset>
        {organizaEvento === "si" && <>
          <label className="block space-y-1 text-sm font-bold">Nombre del evento *<input required maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm font-bold">Fecha *<input required type="date" value={dia} onChange={(e) => setDia(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal" /></label>
            <label className="block space-y-1 text-sm font-bold">Hora *<input required type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal" /></label>
          </div>
          <label className="block space-y-1 text-sm font-bold">Lugar *<input required maxLength={200} placeholder="Calle, plaza o dirección" value={lugar} onChange={(e) => setLugar(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal" /></label>
          <label className="block space-y-1 text-sm font-bold">Imagen del evento *<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImagen(e.target.files?.[0] ?? null)} className="w-full text-sm font-normal" /><span className="text-xs font-normal text-muted-foreground">JPG, PNG o WEBP · máximo 5 MB</span></label>
          <label className="block space-y-1 text-sm font-bold">Descripción (opcional)<textarea maxLength={1000} rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal" /></label>
          <p className="text-xs text-muted-foreground">El evento quedará pendiente de revisión antes de aparecer públicamente.</p>
        </>}
        {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <button disabled={busy} className="w-full rounded-full bg-pink px-6 py-3 font-bold text-brown disabled:opacity-60">{busy ? "Guardando…" : organizaEvento === "si" ? "Enviar evento" : "Guardar: no organizamos evento"}</button>
      </form>
    </div>
  );
}
