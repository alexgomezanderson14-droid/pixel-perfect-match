import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMediaFile } from "@/lib/media-upload";

type Props = { penya:any; savedConfig:{color?:string;logo_url?:string;title?:string;description?:string}; onSaved:()=>void };
const field="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

export default function AdminPenyaCardStyleEditor({penya,savedConfig,onSaved}:Props) {
  const [open,setOpen]=useState(false);
  const [color,setColor]=useState(savedConfig.color||"#5968D8");
  const [logoUrl,setLogoUrl]=useState(savedConfig.logo_url||"");
  const [logoFile,setLogoFile]=useState<File|null>(null);
  const [title,setTitle]=useState(savedConfig.title||penya.nombre||"");
  const [description,setDescription]=useState(savedConfig.description??penya.informacion??"");
  const [preview,setPreview]=useState(logoUrl);
  useEffect(()=>{if(!logoFile){setPreview(logoUrl);return;}const objectUrl=URL.createObjectURL(logoFile);setPreview(objectUrl);return()=>URL.revokeObjectURL(objectUrl);},[logoFile,logoUrl]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    setColor(savedConfig.color||"#5968D8");
    setLogoUrl(savedConfig.logo_url||"");
    setTitle(savedConfig.title||penya.nombre||"");
    setDescription(savedConfig.description??penya.informacion??"");
    setLogoFile(null);
  },[penya.id,penya.nombre,penya.informacion,savedConfig.color,savedConfig.logo_url,savedConfig.title,savedConfig.description]);

  const save=async()=>{
    if(!/^#[0-9a-fA-F]{6}$/.test(color)){setMessage("Selecciona un color válido.");return;}
    if(logoFile&&(!["image/jpeg","image/png","image/webp"].includes(logoFile.type)||logoFile.size>5*1024*1024)){setMessage("El logo debe ser JPG, PNG o WEBP y no superar 5 MB.");return;}
    setBusy(true);setMessage("");
    try{
      const {data,error:readError}=await supabase.from("site_content").select("valor").eq("clave","penyas_cards_json").maybeSingle();
      if(readError)throw readError;
      let all:any={};try{const parsed=JSON.parse(data?.valor||"{}");all=parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed:{};}catch{all={};}
      let nextLogo=logoUrl;
      if(logoFile)nextLogo=(await uploadMediaFile(logoFile,"penyes/tarjetas/"+penya.id)).url;
      all[penya.id]={...all[penya.id],color,logo_url:nextLogo,title:title.trim().slice(0,80),description:description.trim().slice(0,160)};
      const {error}=await supabase.from("site_content").upsert({clave:"penyas_cards_json",valor:JSON.stringify(all)});
      if(error)throw error;
      setLogoUrl(nextLogo);setLogoFile(null);setMessage("Diseño de tarjeta guardado.");onSaved();
    }catch(error){setMessage("No se pudo guardar: "+(error instanceof Error?error.message:String(error)));}
    finally{setBusy(false);}
  };
  return <section className="rounded-2xl border border-primary/15 bg-primary/[.035] p-4">
    <button type="button" onClick={()=>setOpen(v=>!v)} className="flex w-full items-center justify-between gap-3 text-left"><span><span className="block text-sm font-extrabold text-primary">{penya.nombre}</span><span className="mt-0.5 block text-xs text-muted-foreground">Nombre, descripción, color y logo · {savedConfig.color?"Diseño personalizado":"Diseño automático"}</span></span><span className="text-lg">{open?"−":"+"}</span></button>
    {open&&<div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
      <div className="flex min-h-[210px] flex-col items-center justify-between overflow-hidden rounded-2xl p-3 text-white shadow-inner" style={{backgroundColor:color}}>
        <span className="self-start text-xs font-black">{title||penya.nombre}</span><span className="line-clamp-2 w-full text-left text-[10px] text-white/80">{description}</span>
        {preview?<img src={preview} alt={"Vista previa del logo de "+penya.nombre} className="h-36 w-full object-contain"/>:<span className="text-7xl font-black">{penya.nombre?.trim()?.charAt(0)||"?"}</span>}
      </div>
      <div className="space-y-3">
        <label className="block space-y-1 text-sm font-semibold">Nombre mostrado<input type="text" maxLength={80} value={title} onChange={e=>setTitle(e.target.value)} className={field}/></label><label className="block space-y-1 text-sm font-semibold">Descripción corta<textarea rows={3} maxLength={160} value={description} onChange={e=>setDescription(e.target.value)} className={field}/></label><label className="block space-y-1 text-sm font-semibold">Color de fondo<input type="color" value={color} onChange={e=>setColor(e.target.value)} className="h-12 w-full cursor-pointer rounded-xl border border-input bg-background p-1"/></label>
        <label className="block space-y-1 text-sm font-semibold">Logo independiente (JPG, PNG o WEBP, máx. 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setLogoFile(e.target.files?.[0]||null)} className="block w-full text-xs font-normal"/></label>
        <p className="text-xs text-muted-foreground">El nombre, la descripción, el color y el logo se aplican solo a esta tarjeta; no modifican la ficha de la peña.</p>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>{setLogoUrl("");setLogoFile(null);}} className="rounded-full border px-3 py-2 text-xs font-bold">Quitar logo personalizado</button><button type="button" disabled={busy} onClick={()=>void save()} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">{busy?"Guardando…":"Guardar tarjeta"}</button></div>
        {message&&<p role="status" className="text-xs font-semibold text-primary">{message}</p>}
      </div>
    </div>}
  </section>;
}
