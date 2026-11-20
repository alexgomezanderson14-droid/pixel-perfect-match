import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMediaFile } from "@/lib/media-upload";
import FestMap from "@/components/FestMap";
import { getPenyaPhotoImageStyle } from "@/lib/penya-photo";

const field = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

export default function AdminPenyaEditor({ penya, onSaved, onCancel }: { penya: any; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    nombre: penya.nombre ?? "",
    direccion: penya.direccion ?? "",
    tipo_musica: penya.tipo_musica ?? "Variada",
    instagram: penya.instagram ?? "",
    informacion: "",
    estado: penya.estado ?? "aprobada",
    tiene_evento: Boolean(penya.tiene_evento),
  });
  const [mapPick, setMapPick] = useState<{ lat: number; lng: number } | null>(penya.lat != null && penya.lng != null ? { lat: Number(penya.lat), lng: Number(penya.lng) } : null);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview,setFotoPreview]=useState("");
  useEffect(()=>{if(!foto){setFotoPreview("");return;}const url=URL.createObjectURL(foto);setFotoPreview(url);return()=>URL.revokeObjectURL(url);},[foto]);
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [logoZoom,setLogoZoom]=useState(100);
  const [logoX,setLogoX]=useState(50);
  const [logoY,setLogoY]=useState(50);
  const imageDrag = useRef<{ pointerId: number; startX: number; startY: number; posX: number; posY: number; width: number; height: number; kind: "logo" | "block"; blockId?: string } | null>(null);
  const beginImageDrag = (event: React.PointerEvent<HTMLDivElement>, kind: "logo" | "block", blockId?: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const block = kind === "block" ? blocks.find(item => item.id === blockId) : undefined;
    imageDrag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, posX: kind === "logo" ? logoX : block?.positionX ?? 50, posY: kind === "logo" ? logoY : block?.positionY ?? 50, width: rect.width, height: rect.height, kind, blockId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveImageDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = imageDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const x = Math.max(0, Math.min(100, drag.posX - (event.clientX - drag.startX) / Math.max(1, drag.width) * 100));
    const y = Math.max(0, Math.min(100, drag.posY - (event.clientY - drag.startY) / Math.max(1, drag.height) * 100));
    if (drag.kind === "logo") { setLogoX(x); setLogoY(y); }
    else if (drag.blockId) setBlocks(old => old.map(block => block.id === drag.blockId ? { ...block, positionX: x, positionY: y } : block));
  };
  const endImageDrag = (event: React.PointerEvent<HTMLDivElement>) => { if (imageDrag.current?.pointerId === event.pointerId) imageDrag.current = null; };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  type ProfileBlock = { id: string; type: "text" | "photo" | "banner" | "video" | "link" | "highlight" | "list" | "tag"; title: string; content: string; url: string; featured?: boolean; zoom?: number; positionX?: number; positionY?: number; height?: number; colorStart?: string; colorEnd?: string };
  const [blocks, setBlocks] = useState<ProfileBlock[]>([]);
  const [aceptaVisitas, setAceptaVisitas] = useState(false);
  const [visitasLoading, setVisitasLoading] = useState(true);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [blocksSaving, setBlocksSaving] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [blocksMessage, setBlocksMessage] = useState("");
  useEffect(() => {
    let active = true;
    supabase.from("site_content").select("valor").eq("clave", "penyes_logos_ficha_json").maybeSingle().then(({data,error})=>{if(!active)return;if(!error){try{const settings=JSON.parse(data?.valor||"{}");const current=settings?.[penya.id]||{};setLogoZoom(current.zoom??100);setLogoX(current.x??50);setLogoY(current.y??50);}catch{setLogoZoom(100);setLogoX(50);setLogoY(50);}}});
    supabase.from("site_content").select("valor").eq("clave", "penyes_visitas_json").maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (!error) { try { const settings = JSON.parse(data?.valor || "{}"); setAceptaVisitas(settings?.[penya.id] === true); } catch { setAceptaVisitas(false); } }
      setVisitasLoading(false);
    });
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
  const addBlock = (type: ProfileBlock["type"]) => setBlocks(old => [...old, { id: crypto.randomUUID(), type, title: type === "text" ? "Nuestra historia" : type === "photo" ? "Un momento especial" : type === "banner" ? "Banner de la peña" : type === "tag" ? "Etiqueta nueva" : type === "video" ? "Vídeo de la peña" : type === "link" ? "Síguenos" : type === "list" ? "Lo que nos gusta" : "Lo que nos hace únicos", content: "", url: "", ...(type === "banner" ? { colorStart: "#173f52", colorEnd: "#c6a24b", height: 370 } : {}) }]);
  const updateBlock = (id: string, key: keyof ProfileBlock, value: string | boolean | number) => setBlocks(old => old.map(block => block.id === id ? { ...block, [key]: value } : block));
  const featuredPhotoCount = blocks.filter(block => block.type === "photo" && block.featured && /^https?:\/\//i.test(block.url)).length;
  const featuredPhotos = blocks.filter(block => block.type === "photo" && block.featured && /^https?:\/\//i.test(block.url)).slice(0, 3).map(block => block.url);
  const moveBlock = (index: number, offset: number) => setBlocks(old => { const next = [...old]; const target = index + offset; if (target < 0 || target >= next.length) return old; const a = next[index]; const b = next[target]; if (!a || !b) return old; next[index] = b; next[target] = a; return next; });
  const uploadBlockPhotos = async (blockId: string, files: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (!selected.length) return;
    if (selected.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setBlocksMessage("Cada fotografía debe ser JPG, PNG o WEBP y no superar 5 MB.");
      return;
    }
    setUploadingBlockId(blockId); setBlocksMessage("");
    try {
      const urls: string[] = [];
      for (const file of selected) {
        const uploaded = await uploadMediaFile(file, "penyes/perfiles/" + penya.id);
        urls.push(uploaded.url);
      }
      setBlocks(old => {
        const index = old.findIndex(block => block.id === blockId);
        if (index < 0) return old;
        const current = old[index]!;
        const next = [...old];
        const currentHasPhoto = Boolean(current.url.trim());
        const firstNewPhoto = currentHasPhoto ? 0 : 1;
        if (!currentHasPhoto && urls[0]) next[index] = { ...current, url: urls[0], featured: false };
        const extraBlocks = urls.slice(firstNewPhoto).map((url, offset) => ({
          ...current,
          id: crypto.randomUUID(),
          title: current.title + " " + (offset + (currentHasPhoto ? 1 : 2)),
          url,
          featured: false,
        }));
        next.splice(index + 1, 0, ...extraBlocks);
        return next;
      });
      setBlocksMessage(selected.length > 1
        ? selected.length + " fotografías subidas. Guarda los apartados para publicarlas en la ficha."
        : "Fotografía subida. Guarda los apartados para publicarla en la ficha.");
    } catch (err) { setBlocksMessage("No se ha podido subir la fotografía: " + (err instanceof Error ? err.message : String(err))); }
    finally { setUploadingBlockId(null); }
  };
  const saveBlocks = async (): Promise<boolean> => {
    setBlocksSaving(true); setBlocksMessage("");
    try {
      const { data, error: readError } = await supabase.from("site_content").select("valor").eq("clave", "penyes_perfiles_json").maybeSingle();
      if (readError) throw readError;
      let all: Record<string, ProfileBlock[]> = {};
      try { const parsed = JSON.parse(data?.valor || "{}"); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) all = parsed; } catch { all = {}; }
      let featuredSaved = 0;
      all[penya.id] = blocks.map(block => {
        const featured = block.type === "photo" && block.featured === true && /^https?:\/\//i.test(block.url) && featuredSaved < 3;
        if (featured) featuredSaved += 1;
        return { ...block, featured, title: block.title.trim().slice(0, 100), content: block.content.trim().slice(0, 5000), url: block.url.trim().slice(0, 1000) };
      });
      const { error: writeError } = await supabase.from("site_content").upsert({ clave: "penyes_perfiles_json", valor: JSON.stringify(all) });
      if (writeError) throw writeError;
      setBlocksMessage("Apartados personalizados guardados.");
      return true;
    } catch (err) { setBlocksMessage("No se han podido guardar los apartados: " + (err instanceof Error ? err.message : String(err))); return false; }
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
    // La ubicación se selecciona directamente en el mapa; si no hay marcador, queda sin ubicación.
    const lat = mapPick?.lat ?? null;
    const lng = mapPick?.lng ?? null;
    setBusy(true);
    try {
      const { data: visitsData, error: visitsReadError } = await supabase.from("site_content").select("valor").eq("clave", "penyes_visitas_json").maybeSingle();
      if (visitsReadError) throw visitsReadError;
      let visitSettings: Record<string, boolean> = {};
      try { const parsed = JSON.parse(visitsData?.valor || "{}"); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) visitSettings = parsed; } catch { visitSettings = {}; }
      visitSettings[penya.id] = aceptaVisitas;
      const { error: visitsWriteError } = await supabase.from("site_content").upsert({ clave: "penyes_visitas_json", valor: JSON.stringify(visitSettings) });
      if (visitsWriteError) throw visitsWriteError;
      const {data:logoData,error:logoReadError}=await supabase.from("site_content").select("valor").eq("clave","penyes_logos_ficha_json").maybeSingle();
      if(logoReadError)throw logoReadError;
      let logoSettings:Record<string,{zoom:number;x:number;y:number}>={};try{const parsed=JSON.parse(logoData?.valor||"{}");if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed))logoSettings=parsed;}catch{logoSettings={};}
      logoSettings[penya.id]={zoom:logoZoom,x:logoX,y:logoY};
      const {error:logoWriteError}=await supabase.from("site_content").upsert({clave:"penyes_logos_ficha_json",valor:JSON.stringify(logoSettings)});
      if(logoWriteError)throw logoWriteError;
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
      const savedBlocks = await saveBlocks();
      if (!savedBlocks) throw new Error("La ficha se ha actualizado, pero no se han podido guardar los apartados adicionales. Vuelve a intentarlo.");
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

  return <form onSubmit={save} className="admin-penya-editor glass space-y-4 rounded-[1.6rem] border border-primary/15 p-4 shadow-sm sm:p-6">
    <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-muted-foreground">Ficha de peña</p><h3 className="text-lg font-bold">Editar {penya.nombre}</h3></div><button type="button" onClick={onCancel} className="glass-btn rounded-full px-4 py-2 text-xs font-bold">Cancelar</button></div>
    <label className="block space-y-1 text-sm font-semibold">Nombre de la peña<input className={field} maxLength={80} value={form.nombre} onChange={e=>change("nombre",e.target.value)} required /></label>
    <label className="block space-y-1 text-sm font-semibold">Dirección / ubicación<input className={field} maxLength={200} value={form.direccion} onChange={e=>change("direccion",e.target.value)} /></label>
    <section className="space-y-2 rounded-2xl border border-border/70 bg-background p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-bold">Ubicación en el mapa</p><p className="text-xs text-muted-foreground">Pulsa sobre el mapa para colocar el marcador o arrástralo para ajustar el punto.</p></div><button type="button" onClick={()=>setMapPick(null)} disabled={!mapPick} className="shrink-0 rounded-full border px-3 py-2 text-xs font-bold disabled:opacity-40">Quitar ubicación</button></div><div className="h-64 overflow-hidden rounded-xl border border-border sm:h-80"><FestMap lugares={[]} pick={mapPick} onPick={(lat,lng)=>setMapPick({lat,lng})}/></div><p className="text-xs text-muted-foreground">{mapPick ? `Ubicación seleccionada: ${mapPick.lat.toFixed(6)}, ${mapPick.lng.toFixed(6)}` : "Esta peña no tiene ubicación. Selecciona un punto en el mapa si quieres que aparezca en él."}</p></section>
    <details className="rounded-2xl border border-border/70 bg-white/45 px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold"><span>Más información y visibilidad</span><span className="text-xs text-muted-foreground">Opcional ⌄</span></summary>
      <div className="mt-4 space-y-4">
    <label className="block space-y-1 text-sm font-semibold">Tipo de música<input className={field} maxLength={80} value={form.tipo_musica} onChange={e=>change("tipo_musica",e.target.value)} /></label>
    <label className="block space-y-1 text-sm font-semibold">Instagram<input className={field} maxLength={100} value={form.instagram} onChange={e=>change("instagram",e.target.value)} placeholder="@cuenta" /></label>
    <label className="block space-y-1 text-sm font-semibold">Descripción personalizada (opcional)<textarea className={field} rows={3} maxLength={1000} value={form.informacion} onChange={e=>change("informacion",e.target.value)} placeholder="Cada peña puede escribir aquí su propia descripción." /></label>
    <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.tiene_evento} onChange={e=>change("tiene_evento",e.target.checked)} /> Organiza evento</label></div>
    <section className="rounded-xl border border-border/70 bg-muted/35 p-3"><label className="flex items-start gap-3 text-sm font-semibold"><input type="checkbox" className="mt-0.5" checked={aceptaVisitas} disabled={visitasLoading} onChange={e=>setAceptaVisitas(e.target.checked)} /><span><span className="block font-bold">Aceptamos visitas</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">Indica si la peña está abierta a recibir visitas.</span></span></label></section>
    <label className="block space-y-1 text-sm font-semibold">Estado<select className={field} value={form.estado} onChange={e=>change("estado",e.target.value)}><option value="aprobada">Visible en la web</option><option value="pendiente">Pendiente / ocultar</option><option value="rechazada">Rechazada / ocultar</option></select></label>
      </div>
    </details>
    {(fotoPreview||fotoUrl) && !quitarFoto && <div className="flex justify-center"><div onPointerDown={e=>beginImageDrag(e,"logo")} onPointerMove={moveImageDrag} onPointerUp={endImageDrag} onPointerCancel={endImageDrag} className="h-36 w-36 touch-none cursor-grab overflow-hidden rounded-full border-4 border-white bg-white shadow-md active:cursor-grabbing"><img draggable={false} src={fotoPreview||fotoUrl} alt={"Vista previa de la foto de perfil de "+penya.nombre} style={getPenyaPhotoImageStyle({zoom:logoZoom,x:logoX,y:logoY})} className="h-full w-full select-none bg-white object-cover"/></div></div>}
    <details className="rounded-xl border border-border bg-background px-3 py-2"><summary className="cursor-pointer text-xs font-bold text-muted-foreground">Ajustar encuadre de la foto de perfil (opcional)</summary><div className="mt-3"><div className="grid gap-3 rounded-xl border border-primary/15 bg-primary/[.035] p-3 sm:grid-cols-2"><p className="text-xs font-extrabold text-primary sm:col-span-2">Encuadre de la foto de perfil · se aplica igual en el mapa y en la ficha</p><label className="block space-y-1 text-xs font-semibold">Escala de imagen · {logoZoom}%<input type="range" min="70" max="200" value={logoZoom} onChange={e=>setLogoZoom(Number(e.target.value))} className="w-full accent-primary"/></label><p className="self-center text-xs text-muted-foreground sm:col-span-2">Arrastra la foto dentro del círculo para recolocarla. El mismo encuadre se utiliza en el mapa y en la ficha pública.</p><button type="button" onClick={()=>{setLogoZoom(100);setLogoX(50);setLogoY(50);}} className="self-end rounded-full border px-3 py-2 text-xs font-bold">Restablecer foto de perfil</button><p className="text-[10px] text-muted-foreground sm:col-span-2">Se guarda al pulsar «Guardar ficha». El encuadre se sincroniza en todos los círculos de esta peña.</p></div></div></details>
    <div className="space-y-2"><p className="text-sm font-semibold">Cambiar fotografía (JPG, PNG o WEBP, máx. 5 MB)</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><label className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-primary/20 bg-background px-3 py-2 text-center text-xs font-bold text-primary">▧ Elegir de la galería<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFoto(e.target.files?.[0]??null)} /></label><label className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-primary/20 bg-background px-3 py-2 text-center text-xs font-bold text-primary">◎ Hacer una foto<input className="sr-only" type="file" accept="image/*" capture="environment" onChange={e=>setFoto(e.target.files?.[0]??null)} /></label></div>{foto&&<p className="text-xs text-muted-foreground">Imagen seleccionada: {foto.name}</p>}</div>
    {fotoUrl && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={quitarFoto} onChange={e=>setQuitarFoto(e.target.checked)} /> Quitar fotografía actual</label>}
    <section className="space-y-4 rounded-2xl border border-border/70 bg-white/55 p-4 sm:p-5">
      <div><h4 className="text-base font-extrabold">Contenido de la ficha</h4><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Añade solo lo que quieras mostrar. Los apartados se pueden abrir para editarlos y se publican en el mismo orden.</p></div>
      {blocksLoading ? <p className="text-sm text-muted-foreground">Cargando apartados…</p> : <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([{type:"text",label:"＋ Texto"},{type:"photo",label:"＋ Fotos"},{type:"banner",label:"＋ Banner"},{type:"link",label:"＋ Enlace"}] as const).map(item=><button key={item.type} type="button" onClick={()=>addBlock(item.type)} className="min-h-11 rounded-xl border border-primary/20 bg-background px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5">{item.label}</button>)}
        </div>
        <details className="rounded-xl border border-border bg-background px-3 py-2">
          <summary className="cursor-pointer text-xs font-bold text-muted-foreground">Más tipos de contenido</summary>
          <div className="mt-2 flex flex-wrap gap-2">{([{type:"tag",label:"Etiqueta"},{type:"video",label:"Vídeo"},{type:"highlight",label:"Destacado"},{type:"list",label:"Lista"}] as const).map(item=><button key={item.type} type="button" onClick={()=>addBlock(item.type)} className="rounded-lg border px-3 py-2 text-xs font-semibold">{item.label}</button>)}</div>
        </details>
        {blocks.length===0&&<p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Todavía no hay apartados adicionales. Añade una historia, fotos, vídeos, enlaces o cualquier otro contenido.</p>}
        <div className="space-y-3">
          {blocks.map((block,index)=><details key={block.id} className="rounded-xl border border-border bg-background p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold"><span>{({text:"Texto",photo:"Fotografía",banner:"Banner",tag:"Etiqueta",video:"Vídeo",link:"Enlace",highlight:"Destacado",list:"Lista"} as Record<string,string>)[block.type]} · {block.title||"Sin título"}</span><span className="text-xs text-muted-foreground">Editar⌄</span></summary><article className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-extrabold uppercase tracking-wide text-primary">{({text:"Texto",photo:"Fotografía",banner:"Banner principal",tag:"Etiqueta",video:"Vídeo",link:"Enlace",highlight:"Destacado",list:"Lista"} as Record<string,string>)[block.type]} · Apartado {index+1}</span><div className="flex gap-1"><button type="button" disabled={index===0} onClick={()=>moveBlock(index,-1)} className="rounded-lg border px-2 py-1 text-xs disabled:opacity-30" aria-label="Mover arriba">↑</button><button type="button" disabled={index===blocks.length-1} onClick={()=>moveBlock(index,1)} className="rounded-lg border px-2 py-1 text-xs disabled:opacity-30" aria-label="Mover abajo">↓</button><button type="button" onClick={()=>setBlocks(old=>old.filter(item=>item.id!==block.id))} className="rounded-lg border border-destructive/30 px-2 py-1 text-xs font-bold text-destructive">Eliminar</button></div></div>
            <label className="block space-y-1 text-xs font-semibold">Título<input className={field} maxLength={100} value={block.title} onChange={e=>updateBlock(block.id,"title",e.target.value)} placeholder="Título del apartado"/></label>
            {(block.type==="text"||block.type==="highlight"||block.type==="list")&&<label className="block space-y-1 text-xs font-semibold">{block.type==="list"?"Elementos (uno por línea)":"Contenido"}<textarea className={field} rows={block.type==="list"?4:5} maxLength={5000} value={block.content} onChange={e=>updateBlock(block.id,"content",e.target.value)} placeholder={block.type==="list"?"Convivencia\nMúsica\nDisfraces":"Escribe aquí lo que quieras contar…"} /></label>}
            {(block.type==="photo"||block.type==="banner"||block.type==="video"||block.type==="link")&&<div className="space-y-3">{block.type==="banner"?<div className="space-y-3 rounded-xl border border-primary/15 bg-primary/[.035] p-3"><p className="text-xs font-bold text-primary">Colores de la peña · degradado de izquierda a derecha</p><div className="grid grid-cols-2 gap-3"><label className="flex flex-col gap-2 text-xs font-semibold">Color izquierdo<input type="color" value={block.colorStart||"#173f52"} onChange={e=>updateBlock(block.id,"colorStart",e.target.value)} className="h-11 w-full cursor-pointer rounded-lg border border-input bg-background p-1"/></label><label className="flex flex-col gap-2 text-xs font-semibold">Color derecho<input type="color" value={block.colorEnd||"#c6a24b"} onChange={e=>updateBlock(block.id,"colorEnd",e.target.value)} className="h-11 w-full cursor-pointer rounded-lg border border-input bg-background p-1"/></label></div><div className="h-20 rounded-xl border border-black/10" style={{background:`linear-gradient(90deg,${block.colorStart||"#173f52"},${block.colorEnd||"#c6a24b"})`}}/><p className="text-[10px] leading-relaxed text-muted-foreground">Este degradado sustituye a cualquier imagen de cabecera y se muestra de izquierda a derecha.</p></div>:<><label className="block space-y-1 text-xs font-semibold">{block.type==="photo"?"Dirección de la fotografía (URL opcional)":block.type==="video"?"Enlace de YouTube, Vimeo o vídeo MP4":"Dirección del enlace"}<input className={field} type="url" maxLength={1000} value={block.url} onChange={e=>updateBlock(block.id,"url",e.target.value)} placeholder="Pega aquí un enlace si lo tienes"/></label>{block.type==="photo"&&<div className="rounded-xl border border-primary/15 bg-primary/[.035] p-3"><p className="mb-2 text-xs font-bold text-primary">Añadir imagen desde el móvil o el ordenador</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><label className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-primary/20 bg-white px-3 py-2 text-center text-xs font-bold text-primary transition hover:bg-primary/5">▧ Elegir de la galería<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploadingBlockId===block.id} onChange={e=>{void uploadBlockPhotos(block.id,e.currentTarget.files);e.currentTarget.value="";}}/></label><label className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-primary/20 bg-white px-3 py-2 text-center text-xs font-bold text-primary transition hover:bg-primary/5">◎ Hacer una foto<input className="sr-only" type="file" accept="image/*" capture="environment" disabled={uploadingBlockId===block.id} onChange={e=>{void uploadBlockPhotos(block.id,e.currentTarget.files);e.currentTarget.value="";}}/></label></div><p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Puedes seleccionar varias fotos a la vez; cada una se añadirá como un apartado independiente. JPG, PNG o WEBP · Máx. 5 MB por imagen.</p>{uploadingBlockId===block.id&&<p role="status" className="mt-2 text-xs font-bold text-primary">Subiendo imagen…</p>}</div>}</>}</div>}
            {block.type==="link"&&<label className="block space-y-1 text-xs font-semibold">Texto del enlace<input className={field} maxLength={300} value={block.content} onChange={e=>updateBlock(block.id,"content",e.target.value)} placeholder="Visita nuestra página"/></label>}
            {block.type==="photo"&&<label className="block space-y-1 text-xs font-semibold">Descripción de la foto<input className={field} maxLength={300} value={block.content} onChange={e=>updateBlock(block.id,"content",e.target.value)} placeholder="Nuestra peña en las fiestas…"/></label>}
            {block.type==="photo"&&block.url.trim()&&<div className="grid gap-3 rounded-xl border border-primary/15 bg-white/80 p-3 sm:grid-cols-2"><div className="sm:col-span-2"><p className="text-xs font-extrabold text-primary">{block.type==="banner"?"Encuadre del banner panorámico":"Encuadre de esta fotografía"}</p><p className="mt-1 text-[10px] text-muted-foreground">Ajustes independientes para esta imagen; se guardan con el apartado.</p><div onPointerDown={e=>beginImageDrag(e,"block",block.id)} onPointerMove={moveImageDrag} onPointerUp={endImageDrag} onPointerCancel={endImageDrag} className="mt-2 touch-none cursor-grab overflow-hidden rounded-lg bg-muted active:cursor-grabbing" style={{aspectRatio:block.type==="banner"?"16 / 5":"4 / 3"}}><img draggable={false} src={block.url} alt="Vista previa del encuadre; arrastra para mover la imagen" className={"h-full w-full select-none "+"object-cover"} style={{objectPosition:`${block.positionX??50}% ${block.positionY??50}%`,transform:`translate(${((block.positionX??50)-50)*1.2}%,${((block.positionY??50)-50)*1.2}%) scale(${(block.zoom??100)/100})`}}/></div><p className="mt-1 text-[10px] text-muted-foreground">Arrastra la imagen con el cursor para ajustar su encuadre.</p></div><label className="block space-y-1 text-xs font-semibold">Zoom · {block.zoom??100}%<input type="range" min="100" max="220" value={block.zoom??100} onChange={e=>updateBlock(block.id,"zoom",Number(e.target.value))} className="w-full accent-primary"/></label><p className="self-center text-xs text-muted-foreground">Arrastra la imagen en la vista previa para ajustar su posición horizontal y vertical.</p>{block.type==="banner"&&<label className="block space-y-1 text-xs font-semibold">Altura del banner · {block.height??370} px<input type="range" min="220" max="520" step="10" value={block.height??370} onChange={e=>updateBlock(block.id,"height",Number(e.target.value))} className="w-full accent-primary"/></label>}<button type="button" onClick={()=>setBlocks(old=>old.map(item=>item.id===block.id?{...item,zoom:100,positionX:50,positionY:50,height:370}:item))} className="self-end rounded-full border px-3 py-2 text-xs font-bold">Restablecer encuadre</button></div>}
            {block.type==="photo"&&<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary/[0.045] p-3"><label className="flex items-start gap-2 text-xs font-semibold text-primary"><input type="checkbox" className="mt-0.5" checked={Boolean(block.featured)} disabled={!block.featured&&featuredPhotoCount>=3} onChange={e=>updateBlock(block.id,"featured",e.target.checked)}/><span><span className="block">Destacar entre las 3 fotos principales</span><span className="mt-0.5 block font-normal text-muted-foreground">Estas aparecerán primero en el mapa y en la ficha pública.</span></span></label><span className="text-[10px] font-bold text-muted-foreground">{featuredPhotoCount}/3 destacadas</span></div>}
          </article></details>)}
        </div>
        <p className="text-xs text-muted-foreground">Los cambios se guardan todos juntos al final.</p>
        {blocksMessage&&<p role="status" className="rounded-xl bg-muted p-3 text-xs leading-relaxed">{blocksMessage}</p>}
      </>}
    </section>
    {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <button disabled={busy||blocksLoading} className="glass-btn w-full rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground disabled:opacity-50">{blocksLoading?"Cargando ficha…":busy ? "Guardando ficha…" : "Guardar ficha completa"}</button>
  </form>;
}
