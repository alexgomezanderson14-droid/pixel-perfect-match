import {useEffect,useState} from "react";
import {supabase} from "@/integrations/supabase/client";
import {uploadMediaFile} from "@/lib/media-upload";
import {insigniaId,loadPenyaInsignias,savePenyaInsignias,type PenyaInsigniaMap,type PenyaInsigniaKind} from "@/lib/penya-insignias";
const groups:{kind:PenyaInsigniaKind;title:string;count:number}[]=[
 {kind:"redonda",title:"Desfile del Humor · Redondas",count:9},
 {kind:"cuadrada",title:"Paellas · Cuadradas",count:3},
 {kind:"playback",title:"Playbacks · Hexagonales",count:5},
];
function filenameKind(file:File):{kind:PenyaInsigniaKind;position:number}|null{
 const name=file.name.toLowerCase();
 const match=name.match(/([1-9])(redonda|cuadrada|playback)/);
 if(!match)return null;
 const kind=match[2] as PenyaInsigniaKind,position=Number(match[1]),max=kind==="redonda"?9:kind==="cuadrada"?3:5;
 return position<=max?{kind,position}:null;
}
export default function PenyaInsigniaManager(){
 const[items,setItems]=useState<PenyaInsigniaMap>({}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{let active=true;loadPenyaInsignias().then(v=>{if(active)setItems(v)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
 const upload=async(files:FileList|null)=>{
  if(!files?.length)return;const selected=Array.from(files),invalid=selected.filter(f=>!filenameKind(f));
  if(invalid.length){setMessage("Nombres no reconocidos: "+invalid.map(f=>f.name).join(", ")+". Usa 1redonda.png, 1cuadrada.png o 1playback.png.");return;}
  setBusy(true);setMessage("");
  try{const next={...items};for(const file of selected){
   if(!["image/png","image/jpeg","image/webp"].includes(file.type))throw new Error("Formato no admitido: "+file.name);
   const target=filenameKind(file)!;const uploaded=await uploadMediaFile(file,"site");
   next[insigniaId(target.kind,target.position)]={url:uploaded.url,path:uploaded.path,name:file.name};setItems({...next});
  }await savePenyaInsignias(next);setMessage(selected.length+" insignia(s) guardada(s).");}
  catch(e){setMessage("No se pudieron subir todas: "+(e instanceof Error?e.message:String(e)));}
  finally{setBusy(false);}
 };
 const remove=async(kind:PenyaInsigniaKind,position:number)=>{
  const id=insigniaId(kind,position),item=items[id];if(!item)return;if(!window.confirm("¿Quitar esta insignia de la web?"))return;
  setBusy(true);try{const next={...items};delete next[id];await savePenyaInsignias(next);if(item.path)await supabase.storage.from("penyes").remove([item.path]);setItems(next);setMessage("Insignia retirada.");}
  catch(e){setMessage("No se pudo retirar: "+(e instanceof Error?e.message:String(e)));}finally{setBusy(false);}
 };
 return <section className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
  <header><p className="text-[10px] font-black uppercase tracking-[.22em] text-primary">Personalización de insignias</p><h3 className="mt-1 text-xl font-black">Insignias de los concursos</h3><p className="mt-1 text-sm text-muted-foreground">Sube las imágenes transparentes juntas. Se asignan por el nombre del archivo; puedes reemplazar o retirar cada una por separado.</p></header>
  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/35 bg-muted/35 px-4 py-5 text-center"><span className="text-sm font-extrabold">{busy?"Subiendo…":"＋ Añadir o reemplazar insignias"}</span><span className="text-xs text-muted-foreground">Selecciona varios archivos · 1redonda.png · 1cuadrada.png · 1playback.png</span><input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} onChange={e=>{void upload(e.target.files);e.currentTarget.value="";}}/></label>
  {loading?<p className="text-sm text-muted-foreground">Cargando…</p>:groups.map(group=><div key={group.kind} className="space-y-2"><h4 className="text-sm font-extrabold">{group.title}</h4><div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{Array.from({length:group.count},(_,i)=>i+1).map(position=>{const item=items[insigniaId(group.kind,position)];return <article key={position} className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-border bg-background/70 p-2"><div className="grid h-24 w-full place-items-center"><div className="h-20 w-20 bg-contain bg-center bg-no-repeat" style={{backgroundImage:item?'url("'+item.url+'")':"none"}}>{!item&&<span className="grid h-full place-items-center text-xs text-muted-foreground">Sin imagen</span>}</div></div><p className="text-xs font-bold">{position}º puesto</p>{item?<button type="button" disabled={busy} onClick={()=>void remove(group.kind,position)} className="text-[11px] font-bold text-destructive">Eliminar</button>:<span className="text-[11px] text-muted-foreground">Pendiente</span>}</article>})}</div></div>)}
  {message&&<p role="status" className="rounded-xl bg-muted px-3 py-2 text-xs">{message}</p>}
 </section>;
}