import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const field = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

export default function AdminPenyaEditor({ penya, onSaved, onCancel }: { penya: any; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    nombre: penya.nombre ?? "",
    direccion: penya.direccion ?? "",
    lat: penya.lat == null ? "" : String(penya.lat),
    lng: penya.lng == null ? "" : String(penya.lng),
    tipo_musica: penya.tipo_musica ?? "Variada",
    instagram: penya.instagram ?? "",
    informacion: penya.informacion ?? "",
    email: penya.email ?? "",
    estado: penya.estado ?? "aprobada",
    tiene_evento: Boolean(penya.tiene_evento),
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const change = (key: string, value: string | boolean) => setForm(old => ({ ...old, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.nombre.trim().length < 2) return setError("El nombre debe tener al menos 2 caracteres.");
    if (foto && (!["image/jpeg", "image/png", "image/webp"].includes(foto.type) || foto.size > 5 * 1024 * 1024)) {
      return setError("La foto debe ser JPG, PNG o WEBP y no superar 5 MB.");
    }
    const lat = form.lat.trim() === "" ? null : Number(form.lat);
    const lng = form.lng.trim() === "" ? null : Number(form.lng);
    if ((lat !== null && !Number.isFinite(lat)) || (lng !== null && !Number.isFinite(lng))) return setError("Las coordenadas no son válidas.");
    setBusy(true);
    try {
      let foto_url = quitarFoto ? null : penya.foto_url;
      if (foto) {
        const ext = foto.type === "image/png" ? "png" : foto.type === "image/webp" ? "webp" : "jpg";
        const path = "penyes/" + crypto.randomUUID() + "." + ext;
        const upload = await supabase.storage.from("penyes").upload(path, foto, { contentType: foto.type });
        if (upload.error) throw upload.error;
        foto_url = path;
      }
      const { error: updateError } = await supabase.from("penyes").update({
        nombre: form.nombre.trim(),
        direccion: form.direccion.trim() || null,
        lat, lng,
        tipo_musica: form.tipo_musica,
        instagram: form.instagram.trim().replace(/^@/, ""),
        informacion: form.informacion.trim(),
        email: form.email.trim() || null,
        estado: form.estado,
        tiene_evento: form.tiene_evento,
        foto_url,
      }).eq("id", penya.id);
      if (updateError) throw updateError;
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la ficha.");
    } finally {
      setBusy(false);
    }
  };

  const fotoUrl = penya.foto_url
    ? (penya.foto_url.startsWith("http") ? penya.foto_url : supabase.storage.from("penyes").getPublicUrl(penya.foto_url).data.publicUrl)
    : "";

  return <form onSubmit={save} className="glass space-y-3 rounded-2xl border border-primary/20 p-4">
    <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold">Editar ficha: {penya.nombre}</h3><button type="button" onClick={onCancel} className="text-sm underline">Cancelar</button></div>
    <label className="block space-y-1 text-sm font-semibold">Nombre de la peña<input className={field} maxLength={80} value={form.nombre} onChange={e=>change("nombre",e.target.value)} required /></label>
    <label className="block space-y-1 text-sm font-semibold">Dirección / ubicación<input className={field} maxLength={200} value={form.direccion} onChange={e=>change("direccion",e.target.value)} /></label>
    <div className="grid grid-cols-2 gap-2"><label className="text-sm font-semibold">Latitud<input className={field} value={form.lat} onChange={e=>change("lat",e.target.value)} placeholder="38.58..." /></label><label className="text-sm font-semibold">Longitud<input className={field} value={form.lng} onChange={e=>change("lng",e.target.value)} placeholder="-0.10..." /></label></div>
    <label className="block space-y-1 text-sm font-semibold">Tipo de música<input className={field} maxLength={80} value={form.tipo_musica} onChange={e=>change("tipo_musica",e.target.value)} /></label>
    <label className="block space-y-1 text-sm font-semibold">Instagram<input className={field} maxLength={100} value={form.instagram} onChange={e=>change("instagram",e.target.value)} placeholder="@cuenta" /></label>
    <label className="block space-y-1 text-sm font-semibold">Correo de contacto<input className={field} type="email" value={form.email} onChange={e=>change("email",e.target.value)} /></label>
    <label className="block space-y-1 text-sm font-semibold">Información / descripción<textarea className={field} rows={3} maxLength={1000} value={form.informacion} onChange={e=>change("informacion",e.target.value)} /></label>
    <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.tiene_evento} onChange={e=>change("tiene_evento",e.target.checked)} /> Organiza evento</label></div>
    <label className="block space-y-1 text-sm font-semibold">Estado<select className={field} value={form.estado} onChange={e=>change("estado",e.target.value)}><option value="aprobada">Visible en la web</option><option value="pendiente">Pendiente / ocultar</option><option value="rechazada">Rechazada / ocultar</option></select></label>
    {fotoUrl && !quitarFoto && <img src={fotoUrl} alt={"Foto de "+penya.nombre} className="h-36 w-full rounded-xl object-cover" />}
    <label className="block space-y-1 text-sm font-semibold">Cambiar fotografía (JPG, PNG o WEBP, máx. 5 MB)<input className="block w-full text-sm font-normal" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFoto(e.target.files?.[0]??null)} /></label>
    {fotoUrl && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={quitarFoto} onChange={e=>setQuitarFoto(e.target.checked)} /> Quitar fotografía actual</label>}
    {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <button disabled={busy} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? "Guardando…" : "Guardar ficha"}</button>
  </form>;
}
