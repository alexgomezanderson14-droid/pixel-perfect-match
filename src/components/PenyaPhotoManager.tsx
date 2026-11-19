import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type PhotoBlock = { id: string; url: string; title: string; featured: boolean; visible: boolean; legacy?: boolean };

export default function PenyaPhotoManager({ penya, onSaved, onCancel }: { penya: any; onSaved: () => void; onCancel: () => void }) {
  const [blocks, setBlocks] = useState<PhotoBlock[]>([]);
  const [originalIds, setOriginalIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
      if (!contentResult.error) {
        try {
          const all = JSON.parse(contentResult.data?.valor || "{}");
          legacy = Array.isArray(all?.[penya.id]) ? all[penya.id].filter((item: any) => item?.type === "photo" && typeof item.url === "string" && /^https?:\/\//i.test(item.url)) : [];
        } catch { legacy = []; }
      }
      const rowsByUrl = new Map<string, any>(savedRows.map((row: any) => [row.url, row]));
      const merged: PhotoBlock[] = savedRows.map((row: any) => ({
        id: row.id, url: row.url, title: legacy.find(item => item.url === row.url)?.title || "Fotografía",
        featured: row.destacada === true, visible: row.visible !== false,
        legacy: legacy.some(item => item.url === row.url),
      }));
      for (const item of legacy) {
        if (!rowsByUrl.has(item.url)) merged.push({
          id: crypto.randomUUID(), url: item.url, title: item.title || "Fotografía",
          featured: item.featured === true, visible: true, legacy: true,
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
        added.push({ id: crypto.randomUUID(), url, title: file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "Fotografía", featured: false, visible: true });
      }
      setBlocks(current => [...current, ...added]);
      setMessage(added.length === 1 ? "Imagen subida. Recuerda guardar los cambios." : added.length + " imágenes subidas. Recuerda guardar los cambios.");
    } catch (error) {
      setMessage("No se han podido subir las imágenes: " + (error instanceof Error ? error.message : String(error)));
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

  const save = async () => {
    if (featuredCount > 3) { setMessage("Solo puedes destacar 3 imágenes como máximo."); return; }
    setSaving(true); setMessage("");
    try {
      const rows = blocks.map(block => ({ id: block.id, penya_id: penya.id, url: block.url, destacada: block.visible && block.featured, visible: block.visible }));
      if (rows.length) {
        const { error } = await supabase.from("penya_fotos").upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }
      const keepIds = new Set(rows.map(row => row.id));
      const removedIds = originalIds.filter(id => !keepIds.has(id));
      if (removedIds.length) {
        const { error } = await supabase.from("penya_fotos").delete().eq("penya_id", penya.id).in("id", removedIds);
        if (error) throw error;
      }
      setOriginalIds(rows.map(row => row.id));
      setBlocks(current => current.map(block => ({ ...block, legacy: false })));
      setMessage("Galería guardada. Las imágenes destacadas ya aparecen en la ficha.");
      onSaved();
    } catch (error) {
      setMessage("No se han podido guardar las imágenes. Si acabas de seleccionar tu peña, puede que tu cuenta aún no tenga permisos de miembro. " + (error instanceof Error ? error.message : String(error)));
    } finally { setSaving(false); }
  };

  return <div className="space-y-5 rounded-2xl border border-primary/15 bg-background p-4 sm:p-5">
    <div><h3 className="text-lg font-extrabold text-primary">Galería de {penya.nombre}</h3><p className="mt-1 text-sm text-muted-foreground">Añade y organiza las fotografías de esta peña. Puedes destacar hasta 3; aparecerán en el apartado «Momentos destacados».</p></div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/[.045] p-3"><span className="text-sm font-extrabold text-primary">Imágenes destacadas</span><span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-primary">{featuredCount}/3 seleccionadas</span></div>
    <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/35 bg-primary/[.035] px-4 py-3 text-sm font-extrabold text-primary hover:bg-primary/[.07]">{uploading ? "Subiendo imágenes…" : "＋ Añadir imágenes"}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || saving} onChange={event => { void upload(event.target.files); event.currentTarget.value = ""; }} /></label>
    {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando imágenes…</p> : blocks.filter(block => block.visible).length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{blocks.filter(block => block.visible).map(block => <article key={block.id} className="overflow-hidden rounded-xl border border-border bg-white p-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#edf3f1]"><img src={block.url} alt={block.title || "Fotografía de la peña"} className="h-full w-full object-cover"/>{block.featured && <span className="absolute left-2 top-2 rounded-full bg-[#f4d77a] px-2 py-1 text-[9px] font-extrabold text-[#684b08]">★ DESTACADA</span>}</div>
      <p className="mt-2 truncate text-xs font-bold text-primary">{block.title || "Fotografía"}</p>
      <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-semibold text-primary"><input type="checkbox" checked={Boolean(block.featured)} onChange={() => toggleFeatured(block.id)} className="h-4 w-4 accent-primary"/><span>Mostrar en destacadas</span></label>
      <button type="button" onClick={() => removePhoto(block.id)} className="mt-2 text-xs font-bold text-red-700 underline underline-offset-2">Eliminar imagen</button>
    </article>)}</div> : <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Todavía no hay imágenes. Añade las primeras fotografías de esta peña.</p>}
    {message && <p role="status" className="rounded-xl bg-primary/5 p-3 text-xs leading-relaxed text-primary">{message}</p>}
    <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onCancel} className="rounded-full border border-border px-4 py-2.5 text-sm font-bold">Cerrar</button><button type="button" onClick={() => void save()} disabled={loading || uploading || saving} className="rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground disabled:opacity-50">{saving ? "Guardando…" : "Guardar galería"}</button></div>
  </div>;
}
