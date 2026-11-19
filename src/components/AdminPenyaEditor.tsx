import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMediaFile } from "@/lib/media-upload";

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
    estado: penya.estado ?? "aprobada",
    tiene_evento: Boolean(penya.tiene_evento),
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  type ProfileBlock = { id: string; type: "text" | "photo" | "banner" | "video" | "link" | "highlight" | "list"; title: string; content: string; url: string };
  const [blocks, setBlocks] = useState<ProfileBlock[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [blocksSaving, setBlocksSaving] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [blocksMessage, setBlocksMessage] = useState("");
  useEffect(() => {
    let active = true;
    supabase.from("site_content").select("valor").eq("clave", "penyes_perfiles_json").maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) setBlocksMessage("No se han podido cargar los apartados personalizados: " + error.message);
      else {
        try { const all = JSON.parse(data?.valor || "{}"); const saved = all?.[penya.id]; setBlocks(Array.isArray(saved) ? saved : []); }
        catch { setBlocks([]); }
      }
      setBlocksLoading(false);
    });
    return () => { active = false; };
  }, [penya.id]);
  const addBlock = (type: ProfileBlock["type"]) => setBlocks(old => [...old, { id: crypto.randomUUID(), type, title: type === "text" ? "Nuestra historia" : type === "photo" ? "Un momento especial" : type === "banner" ? "Banner de la peña" : type === "video" ? "Vídeo de la peña" : type === "link" ? "Síguenos" : type === "list" ? "Lo que nos gusta" : "Lo que nos hace únicos", content: "", url: "" }]);
  const updateBlock = (id: string, key: keyof ProfileBlock, value: string) => setBlocks(old => old.map(block => block.id === id ? { ...block, [key]: value } : block));
  const moveBlock = (index: number, offset: number) => setBlocks(old => { const next = [...old]; const target = index + offset; if (target < 0 || target >= next.length) return old; const a = next[index]; const b = next[target]; if (!a || !b) return old; next[index] = b; next[target] = a; return next; });
  const uploadBlockPhoto = async (blockId: string, file: File | null) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setBlocksMessage("La fotografía debe ser JPG, PNG o WEBP y no superar 5 MB.");
      return;
    }
    setUploadingBlockId(blockId); setBlocksMessage("");
    try {
      const uploaded = await uploadMediaFile(file, "penyes/perfiles/" + penya.id);
      updateBlock(blockId, "url", uploaded.url);
      setBlocksMessage("Fotografía subida. Guarda los apartados para publicarla en la ficha.");
    } catch (err) { setBlocksMessage("No se ha podido subir la fotografía: " + (err instanceof Error ? err.message : String(err))); }
    finally { setUploadingBlockId(null); }
  };
  const saveBlocks = async () => {
    setBlocksSaving(true); setBlocksMessage("");
    try {
      const { data, error: readError } = await supabase.from("site_content").select("valor").eq("clave", "penyes_perfiles_json").maybeSingle();
      if (readError) throw readError;
      let all: Record<string, ProfileBlock[]> = {};
      try { const parsed = JSON.parse(data?.valor || "{}"); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) all = parsed; } catch { all = {}; }
      all[penya.id] = blocks.map(block => ({ ...block, title: block.title.trim().slice(0, 100), content: block.content.trim().slice(0, 5000), url: block.url.trim().slice(0, 1000) }));
      const { error: writeError } = await supabase.from("site_content").upsert({ clave: "penyes_perfiles_json", valor: JSON.stringify(all) });
      if (writeError) throw writeError;
      setBlocksMessage("Apartados personalizados guardados. Ya se mostrarán en la ficha pública.");
    } catch (err) { setBlocksMessage("No se han podido guardar los apartados: " + (err instanceof Error ? err.message : String(err))); }
    finally { setBlocksSaving(false); }
  };

  const change = (key: string, value: string | boolean) => setForm(old => ({ ...old, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.nombre.trim().length < 2) return setError("El nombre debe tener al menos 2 caracteres.");
    if (foto && (!["image/jpeg", "image/png", "image/webp"].includes(foto.type) || foto.size > 5 * 1024 * 1024)) {
      return setError("La foto debe ser JPG, PNG o WEBP y no superar 5 MB.");
    }
    // Las coordenadas de las peñas son obligatorias en la base de datos.
    // Si solo se cambia la dirección, conservar el punto actual del mapa.
    const lat = form.lat.trim() === "" ? Number(penya.lat) : Number(form.lat.replace(",", "."));
    const lng = form.lng.trim() === "" ? Number(penya.lng) : Number(form.lng.replace(",", "."));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return setError("Indica una latitud y longitud válidas para el mapa.");
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return setError("Coordenadas fuera de rango. La latitud debe estar entre -90 y 90 y la longitud entre -180 y 180.");
    setBusy(true);
    try {
      let foto_url = quitarFoto ? null : penya.foto_url;
      if (foto) {
        const uploaded = await uploadMediaFile(foto, "penyes");
        foto_url = uploaded.url;
      }
      const { error: updateError } = await supabase.from("penyes").update({
        nombre: form.nombre.trim(),
        direccion: form.direccion.trim() || null,
        lat, lng,
        tipo_musica: form.tipo_musica,
        instagram: form.instagram.trim().replace(/^@/, ""),
        informacion: form.informacion.trim(),
        estado: form.estado,
        tiene_evento: form.tiene_evento,
        foto_url,
      }).eq("id", penya.id);
      if (updateError) throw updateError;
      onSaved();
    } catch (err) {
      const detail = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : err instanceof Error ? err.message : String(err);
      setError(detail || "No se pudo guardar la ficha.");
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
    <label className="block space-y-1 text-sm font-semibold">Información / descripción<textarea className={field} rows={3} maxLength={1000} value={form.informacion} onChange={e=>change("informacion",e.target.value)} /></label>
    <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.tiene_evento} onChange={e=>change("tiene_evento",e.target.checked)} /> Organiza evento</label></div>
    <label className="block space-y-1 text-sm font-semibold">Estado<select className={field} value={form.estado} onChange={e=>change("estado",e.target.value)}><option value="aprobada">Visible en la web</option><option value="pendiente">Pendiente / ocultar</option><option value="rechazada">Rechazada / ocultar</option></select></label>
    {fotoUrl && !quitarFoto && <img src={fotoUrl} alt={"Foto de "+penya.nombre} className="h-36 w-full rounded-xl object-cover" />}
    <label className="block space-y-1 text-sm font-semibold">Cambiar fotografía (JPG, PNG o WEBP, máx. 5 MB)<input className="block w-full text-sm font-normal" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFoto(e.target.files?.[0]??null)} /></label>
    {fotoUrl && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={quitarFoto} onChange={e=>setQuitarFoto(e.target.checked)} /> Quitar fotografía actual</label>}
    <section className="space-y-3 rounded-2xl border border-primary/20 bg-primary/[0.035] p-4">
      <div><h4 className="text-lg font-extrabold text-primary">Personaliza la ficha de esta peña</h4><p className="text-xs leading-relaxed text-muted-foreground">Añade tantos apartados como quieras y ordénalos a tu gusto. Solo aparecerán los que rellenes.</p></div>
      {blocksLoading ? <p className="text-sm text-muted-foreground">Cargando apartados…</p> : <>
        <div className="flex flex-wrap gap-2">
          {([{type:"banner",label:"+ Banner de cabecera"},{type:"text",label:"+ Texto"},{type:"photo",label:"+ Fotografía"},{type:"video",label:"+ Vídeo"},{type:"link",label:"+ Enlace"},{type:"highlight",label:"+ Destacado"},{type:"list",label:"+ Lista"}] as const).map(item=><button key={item.type} type="button" onClick={()=>addBlock(item.type)} className="rounded-full border border-primary/20 bg-background px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5">{item.label}</button>)}
        </div>
        {blocks.length===0&&<p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Todavía no hay apartados adicionales. Añade una historia, fotos, vídeos, enlaces o cualquier otro contenido.</p>}
        <div className="space-y-3">
          {blocks.map((block,index)=><article key={block.id} className="space-y-2 rounded-xl border border-border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-extrabold uppercase tracking-wide text-primary">{({text:"Texto",photo:"Fotografía",banner:"Banner principal",video:"Vídeo",link:"Enlace",highlight:"Destacado",list:"Lista"} as Record<string,string>)[block.type]} · Apartado {index+1}</span><div className="flex gap-1"><button type="button" disabled={index===0} onClick={()=>moveBlock(index,-1)} className="rounded-lg border px-2 py-1 text-xs disabled:opacity-30" aria-label="Mover arriba">↑</button><button type="button" disabled={index===blocks.length-1} onClick={()=>moveBlock(index,1)} className="rounded-lg border px-2 py-1 text-xs disabled:opacity-30" aria-label="Mover abajo">↓</button><button type="button" onClick={()=>setBlocks(old=>old.filter(item=>item.id!==block.id))} className="rounded-lg border border-destructive/30 px-2 py-1 text-xs font-bold text-destructive">Eliminar</button></div></div>
            <label className="block space-y-1 text-xs font-semibold">Título<input className={field} maxLength={100} value={block.title} onChange={e=>updateBlock(block.id,"title",e.target.value)} placeholder="Título del apartado"/></label>
            {(block.type==="text"||block.type==="highlight"||block.type==="list")&&<label className="block space-y-1 text-xs font-semibold">{block.type==="list"?"Elementos (uno por línea)":"Contenido"}<textarea className={field} rows={block.type==="list"?4:5} maxLength={5000} value={block.content} onChange={e=>updateBlock(block.id,"content",e.target.value)} placeholder={block.type==="list"?"Convivencia\nMúsica\nDisfraces":"Escribe aquí lo que quieras contar…"} /></label>}
            {(block.type==="photo"||block.type==="banner"||block.type==="video"||block.type==="link")&&<label className="block space-y-1 text-xs font-semibold">{block.type==="banner"?"Imagen de cabecera (URL)":block.type==="photo"?"Dirección de la fotografía (URL)":block.type==="video"?"Enlace de YouTube, Vimeo o vídeo MP4":"Dirección del enlace"}<input className={field} type="url" maxLength={1000} value={block.url} onChange={e=>updateBlock(block.id,"url",e.target.value)} placeholder="https://…"/>{(block.type==="photo"||block.type==="banner")&&<label className="mt-2 block space-y-1 text-xs font-semibold">O subir una imagen desde el dispositivo<input className="block w-full text-sm font-normal" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingBlockId===block.id} onChange={e=>void uploadBlockPhoto(block.id,e.target.files?.[0]??null)}/>{uploadingBlockId===block.id&&<span className="text-primary">Subiendo fotografía…</span>}</label>}</label>}
            {block.type==="link"&&<label className="block space-y-1 text-xs font-semibold">Texto del enlace<input className={field} maxLength={300} value={block.content} onChange={e=>updateBlock(block.id,"content",e.target.value)} placeholder="Visita nuestra página"/></label>}
            {block.type==="photo"&&<label className="block space-y-1 text-xs font-semibold">Descripción de la foto<input className={field} maxLength={300} value={block.content} onChange={e=>updateBlock(block.id,"content",e.target.value)} placeholder="Nuestra peña en las fiestas…"/></label>}
          </article>)}
        </div>
        <button type="button" disabled={blocksSaving||blocksLoading} onClick={()=>void saveBlocks()} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{blocksSaving?"Guardando apartados…":"Guardar apartados personalizados"}</button>
        {blocksMessage&&<p role="status" className="rounded-xl bg-muted p-3 text-xs leading-relaxed">{blocksMessage}</p>}
      </>}
    </section>
    {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <button disabled={busy} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? "Guardando…" : "Guardar ficha"}</button>
  </form>;
}
