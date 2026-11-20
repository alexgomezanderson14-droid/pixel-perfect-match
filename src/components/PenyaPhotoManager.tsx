import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMediaFile } from "@/lib/media-upload";

type PhotoBlock = { id: string; url: string; title: string; featured: boolean; visible: boolean; zoom: number; positionX: number; positionY: number; legacy?: boolean };
type LogoBlock = { id: string; url: string; title: string };

export default function PenyaPhotoManager({ penya, onSaved, onCancel }: { penya: any; onSaved: () => void; onCancel: () => void }) {
  const [blocks, setBlocks] = useState<PhotoBlock[]>([]);
  const [logos, setLogos] = useState<LogoBlock[]>([]);
  const [originalIds, setOriginalIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const photoDrag = useRef<{ id: string; pointerId: number; startX: number; startY: number; positionX: number; positionY: number; overflowX: number; overflowY: number } | null>(null);
  const beginPhotoDrag = (event: React.PointerEvent<HTMLDivElement>, block: PhotoBlock) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const image = event.currentTarget.querySelector("img");
    if (!image || !image.naturalWidth || !image.naturalHeight) return;
    const coverScale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight) * block.zoom / 100;
    photoDrag.current = { id: block.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, positionX: block.positionX, positionY: block.positionY, overflowX: Math.max(0, image.naturalWidth * coverScale - rect.width), overflowY: Math.max(0, image.naturalHeight * coverScale - rect.height) };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const movePhotoDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = photoDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const positionX = drag.overflowX > 0 ? Math.max(0, Math.min(100, drag.positionX - (event.clientX - drag.startX) / drag.overflowX * 100)) : drag.positionX;
    const positionY = drag.overflowY > 0 ? Math.max(0, Math.min(100, drag.positionY - (event.clientY - drag.startY) / drag.overflowY * 100)) : drag.positionY;
    setBlocks(current => current.map(item => item.id === drag.id ? { ...item, positionX, positionY } : item));
  };
  const endPhotoDrag = (event: React.PointerEvent<HTMLDivElement>) => { if (photoDrag.current?.pointerId === event.pointerId) photoDrag.current = null; };

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("penya_fotos").select("id,penya_id,url,destacada,visible").eq("penya_id", penya.id),
      supabase.from("site_content").select("valor").eq("clave", "penyes_perfiles_json").maybeSingle(),
    ]).then(([photoResult, contentResult]) => {
      if (!active) return;
      if (photoResult.error) setMessage("No se ha podido cargar el gestor de imágenes. Comprueba que esté aplicada la migración de la galería: " + photoResult.error.message);
      const savedRows = photoResult.data ?? [];
      setOriginalIds(savedRows.map((row: any) => row.id));
      let legacy: any[] = [];
      let savedLogos: any[] = [];
      if (!contentResult.error) {
        try {
          const all = JSON.parse(contentResult.data?.valor || "{}");
          const profileBlocks = Array.isArray(all?.[penya.id]) ? all[penya.id] : [];
          legacy = profileBlocks.filter((item: any) => item?.type === "photo" && typeof item.url === "string" && /^https?:\/\//i.test(item.url));
          savedLogos = profileBlocks.filter((item: any) => item?.type === "logo" && typeof item.url === "string" && /^https?:\/\//i.test(item.url));
        } catch { legacy = []; savedLogos = []; }
      }
      const rowsByUrl = new Map<string, any>(savedRows.map((row: any) => [row.url, row]));
      const merged: PhotoBlock[] = savedRows.map((row: any) => ({
        id: row.id, url: row.url, title: legacy.find(item => item.url === row.url)?.title || "Fotografía",
        featured: row.destacada === true, visible: row.visible !== false,
        zoom: Number(legacy.find(item => item.url === row.url)?.zoom ?? 100),
        positionX: Number(legacy.find(item => item.url === row.url)?.positionX ?? 50),
        positionY: Number(legacy.find(item => item.url === row.url)?.positionY ?? 50),
        legacy: legacy.some(item => item.url === row.url),
      }));
      setLogos(savedLogos.map((item:any)=>({id:String(item.id||crypto.randomUUID()),url:String(item.url),title:String(item.title||"Logo oficial")})));
      for (const item of legacy) {
        if (!rowsByUrl.has(item.url)) merged.push({
          id: crypto.randomUUID(), url: item.url, title: item.title || "Fotografía",
          featured: item.featured === true, visible: true,
          zoom: Number(item.zoom ?? 100), positionX: Number(item.positionX ?? 50),
          positionY: Number(item.positionY ?? 50), legacy: true,
        });
      }
      setBlocks(merged);
      setLoading(false);
    });
    return () => { active = false; };
  }, [penya.id]);

  const featuredCount = blocks.filter(block => block.visible && block.featured).length;

  const upload = async (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (!selected.length) return;
    if (selected.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setMessage("Cada imagen debe ser JPG, PNG o WEBP y no superar 5 MB.");
      return;
    }
    setUploading(true); setMessage("");
    try {
      const added: PhotoBlock[] = [];
      for (const file of selected) {
        const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
        const path = "penyes/galeria/" + penya.id + "/" + crypto.randomUUID() + "." + extension;
        const { error } = await supabase.storage.from("penyes").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
        if (error) throw error;
        const url = supabase.storage.from("penyes").getPublicUrl(path).data.publicUrl;
        added.push({ id: crypto.randomUUID(), url, title: file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "Fotografía", featured: false, visible: true, zoom: 100, positionX: 50, positionY: 50 });
      }
      setBlocks(current => [...current, ...added]);
      setMessage(added.length === 1 ? "Imagen subida. Recuerda guardar los cambios." : added.length + " imágenes subidas. Recuerda guardar los cambios.");
    } catch (error) {
      setMessage("No se han podido subir las imágenes: " + (error instanceof Error ? error.message : String(error)));
    } finally { setUploading(false); }
  };

  const uploadLogos = async (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (!selected.length) return;
    if (selected.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setMessage("Cada logo debe ser JPG, PNG o WEBP y no superar 5 MB.");
      return;
    }
    setUploading(true); setMessage("");
    try {
      const added: LogoBlock[] = [];
      for (const file of selected) {
        const uploaded = await uploadMediaFile(file, "penyes/perfiles/" + penya.id);
        added.push({ id: crypto.randomUUID(), url: uploaded.url, title: file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "Logo oficial" });
      }
      setLogos(current => [...current, ...added]);
      setMessage(added.length === 1 ? "Logo subido. Guarda la galería para conservarlo." : added.length + " logos subidos. Guarda la galería para conservarlos.");
    } catch (error) {
      setMessage("No se han podido subir los logos: " + (error instanceof Error ? error.message : String(error)));
    } finally { setUploading(false); }
  };

  const toggleFeatured = (id: string) => {
    setBlocks(current => {
      const target = current.find(block => block.id === id);
      if (!target) return current;
      if (!target.featured && current.filter(block => block.visible && block.featured).length >= 3) {
        setMessage("Puedes destacar un máximo de 3 imágenes. Desmarca una antes de elegir otra.");
        return current;
      }
      setMessage("");
      return current.map(block => block.id === id ? { ...block, featured: !block.featured } : block);
    });
  };

  const removePhoto = (id: string) => setBlocks(current => current.flatMap(block => {
    if (block.id !== id) return [block];
    if (block.legacy) return [{ ...block, visible: false, featured: false }];
    return [];
  }));

  const save = async (profileLogoUrl?: string) => {
    if (featuredCount > 3) { setMessage("Solo puedes destacar 3 imágenes como máximo."); return; }
    setSaving(true); setMessage("");
    try {
      const rows = blocks.map(block => ({ id: block.id, penya_id: penya.id, url: block.url, destacada: block.visible && block.featured, visible: block.visible }));
      if (rows.length) {
        const { error } = await supabase.from("penya_fotos").upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }
      // Los ajustes visuales viven junto a los bloques del perfil para que se
      // apliquen también a la galería, destacadas y visor ampliado.
      const { data: profileData, error: profileReadError } = await supabase.from("site_content").select("valor").eq("clave", "penyes_perfiles_json").maybeSingle();
      if (profileReadError) throw profileReadError;
      let allProfiles: Record<string, any[]> = {};
      try {
        const parsed = JSON.parse(profileData?.valor || "{}");
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) allProfiles = parsed;
      } catch { allProfiles = {}; }
      const existingBlocks: any[] = Array.isArray(allProfiles[penya.id]) ? (allProfiles[penya.id] as any[]) : [];
      const photoSettings = new Map(blocks.map(block => [block.url, block]));
      const existingUrls = new Set(existingBlocks.filter((item: any) => item?.type === "photo").map((item: any) => item.url));
      const updatedBlocks = existingBlocks.filter((item:any)=>item?.type!=="logo").map((item: any) => {
        if (item?.type !== "photo" || typeof item.url !== "string") return item;
        const setting = photoSettings.get(item.url);
        return setting ? { ...item, zoom: setting.zoom, positionX: setting.positionX, positionY: setting.positionY, featured: setting.featured, visible: setting.visible } : null;
      });
      const keptBlocks = updatedBlocks.filter((item: any) => item !== null);
      for (const logo of logos) keptBlocks.push({ id: logo.id, type: "logo", title: logo.title, content: "", url: logo.url });
      for (const block of blocks) {
        if (!existingUrls.has(block.url)) keptBlocks.push({
          id: block.id, type: "photo", title: block.title, content: "", url: block.url,
          zoom: block.zoom, positionX: block.positionX, positionY: block.positionY, featured: block.featured,
        });
      }
      allProfiles[penya.id] = keptBlocks;
      const { error: profileWriteError } = await supabase.from("site_content").upsert({ clave: "penyes_perfiles_json", valor: JSON.stringify(allProfiles) });
      if (profileWriteError) throw profileWriteError;
      if (profileLogoUrl) {
        const { error: logoUpdateError } = await supabase.from("penyes").update({ foto_url: profileLogoUrl }).eq("id", penya.id);
        if (logoUpdateError) throw logoUpdateError;
      }
      const keepIds = new Set(rows.map(row => row.id));
      const removedIds = originalIds.filter(id => !keepIds.has(id));
      if (removedIds.length) {
        const { error } = await supabase.from("penya_fotos").delete().eq("penya_id", penya.id).in("id", removedIds);
        if (error) throw error;
      }
      setOriginalIds(rows.map(row => row.id));
      setBlocks(current => current.map(block => ({ ...block, legacy: false })));
      setMessage(profileLogoUrl ? "Galería guardada y logo aplicado a la foto de perfil." : "Galería guardada. Las imágenes destacadas ya aparecen en la ficha.");
      onSaved();
    } catch (error) {
      setMessage("No se han podido guardar las imágenes. Si acabas de seleccionar tu peña, puede que tu cuenta aún no tenga permisos de miembro. " + (error instanceof Error ? error.message : String(error)));
    } finally { setSaving(false); }
  };

  return <div className="space-y-5 rounded-2xl border border-primary/15 bg-background p-4 sm:p-5">
    <div><h3 className="text-lg font-extrabold text-primary">Galería de {penya.nombre}</h3><p className="mt-1 text-sm text-muted-foreground">Añade y organiza las fotografías de esta peña. Puedes destacar hasta 3; aparecerán en el apartado «Momentos destacados».</p></div>
    <section className="space-y-3 rounded-2xl border border-[#e6ce91]/70 bg-[#fffaf0] p-3.5 sm:p-4">
      <div><h4 className="text-sm font-extrabold text-[#765c25]">Logos oficiales de la peña</h4><p className="mt-1 text-xs leading-relaxed text-[#806f4c]">Un espacio separado para guardar versiones nítidas o corregidas del emblema. Puedes conservar varias propuestas y elegir cuál sustituye al logo circular de la ficha.</p></div>
      <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#d9bd78] bg-white px-3 py-2 text-xs font-extrabold text-[#765c25] hover:bg-[#fff7df]">{uploading ? "Subiendo archivo…" : "＋ Añadir logos oficiales"}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || saving} onChange={event=>{void uploadLogos(event.target.files);event.currentTarget.value="";}}/></label>
      {logos.length>0 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{logos.map(logo=><article key={logo.id} className="rounded-xl border border-[#e6ce91]/60 bg-white p-2"><div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white p-3"><img src={logo.url} alt={logo.title} className="max-h-full max-w-full object-contain"/></div><p className="mt-2 truncate text-[10px] font-bold text-[#765c25]">{logo.title}</p><button type="button" disabled={saving} onClick={()=>void save(logo.url)} className="mt-2 w-full rounded-full bg-[#765c25] px-2 py-2 text-[10px] font-extrabold text-white disabled:opacity-50">Usar como logo de perfil</button><button type="button" disabled={saving} onClick={()=>setLogos(current=>current.filter(item=>item.id!==logo.id))} className="mt-2 w-full py-1 text-[10px] font-bold text-red-700 underline">Eliminar de logos</button></article>)}</div> : <p className="rounded-xl border border-dashed border-[#e6ce91] bg-white/70 p-4 text-center text-xs text-[#806f4c]">Todavía no hay logos oficiales. Este espacio es independiente de las fotografías de la peña.</p>}
    </section>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/[.045] p-3"><span className="text-sm font-extrabold text-primary">Imágenes destacadas</span><span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-primary">{featuredCount}/3 seleccionadas</span></div>
    <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/35 bg-primary/[.035] px-4 py-3 text-sm font-extrabold text-primary hover:bg-primary/[.07]">{uploading ? "Subiendo imágenes…" : "＋ Añadir imágenes"}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || saving} onChange={event => { void upload(event.target.files); event.currentTarget.value = ""; }} /></label>
    {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando imágenes…</p> : blocks.filter(block => block.visible).length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{blocks.filter(block => block.visible).map(block => <article key={block.id} className="overflow-hidden rounded-xl border border-border bg-white p-2">
      <div onPointerDown={event=>beginPhotoDrag(event,block)} onPointerMove={movePhotoDrag} onPointerUp={endPhotoDrag} onPointerCancel={endPhotoDrag} onLostPointerCapture={endPhotoDrag} className="relative aspect-[4/3] touch-none cursor-grab overflow-hidden rounded-lg bg-[#edf3f1] active:cursor-grabbing"><img draggable={false} src={block.url} alt={block.title || "Fotografía de la peña"} style={{objectPosition:`${block.positionX}% ${block.positionY}%`,transform:`scale(${block.zoom/100})`,transformOrigin:`${block.positionX}% ${block.positionY}%`}} className="pointer-events-none h-full w-full select-none object-cover"/>{block.featured && <span className="absolute left-2 top-2 rounded-full bg-[#f4d77a] px-2 py-1 text-[9px] font-extrabold text-[#684b08]">★ DESTACADA</span>}</div>
      <p className="mt-2 truncate text-xs font-bold text-primary">{block.title || "Fotografía"}</p>
      <div className="mt-2 space-y-2 rounded-lg bg-primary/[.04] p-2">
        <label className="block text-[10px] font-semibold text-primary">Zoom · {block.zoom}%<input type="range" min="25" max="400" value={block.zoom} onChange={e=>setBlocks(current=>current.map(item=>item.id===block.id?{...item,zoom:Number(e.target.value)}:item))} className="w-full accent-primary"/></label>
        <label className="block text-[10px] font-semibold text-primary">Horizontal · {block.positionX}%<input type="range" min="0" max="100" value={block.positionX} onChange={e=>setBlocks(current=>current.map(item=>item.id===block.id?{...item,positionX:Number(e.target.value)}:item))} className="w-full accent-primary"/></label>
        <label className="block text-[10px] font-semibold text-primary">Vertical · {block.positionY}%<input type="range" min="0" max="100" value={block.positionY} onChange={e=>setBlocks(current=>current.map(item=>item.id===block.id?{...item,positionY:Number(e.target.value)}:item))} className="w-full accent-primary"/></label>
        <button type="button" onClick={()=>setBlocks(current=>current.map(item=>item.id===block.id?{...item,zoom:100,positionX:50,positionY:50}:item))} className="text-[10px] font-bold text-primary underline">Restablecer encuadre</button>
      </div>
      <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-semibold text-primary"><input type="checkbox" checked={Boolean(block.featured)} onChange={() => toggleFeatured(block.id)} className="h-4 w-4 accent-primary"/><span>Mostrar en destacadas</span></label>
      <button type="button" onClick={() => removePhoto(block.id)} className="mt-2 text-xs font-bold text-red-700 underline underline-offset-2">Eliminar imagen</button>
    </article>)}</div> : <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Todavía no hay imágenes. Añade las primeras fotografías de esta peña.</p>}
    {message && <p role="status" className="rounded-xl bg-primary/5 p-3 text-xs leading-relaxed text-primary">{message}</p>}
    <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onCancel} className="rounded-full border border-border px-4 py-2.5 text-sm font-bold">Cerrar</button><button type="button" onClick={() => void save()} disabled={loading || uploading || saving} className="rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground disabled:opacity-50">{saving ? "Guardando…" : "Guardar galería"}</button></div>
  </div>;
}
