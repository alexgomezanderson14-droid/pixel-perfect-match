import {useEffect,useState} from "react";
import {uploadMediaFile} from "@/lib/media-upload";
import {insigniaId,loadPenyaInsignias,savePenyaInsignias,type PenyaInsigniaMap,type PenyaInsigniaKind} from "@/lib/penya-insignias";

const groups:{kind:PenyaInsigniaKind;title:string;count:number}[]=[
 {kind:"redonda",title:"Desfile del Humor · Redondas",count:9},
 {kind:"cuadrada",title:"Paellas · Cuadradas",count:3},
 {kind:"playback",title:"Playbacks · Hexagonales",count:5},
];

export default function PenyaInsigniaManager(){
 const[items,setItems]=useState<PenyaInsigniaMap>({}),[loading,setLoading]=useState(true),[busyId,setBusyId]=useState<string|null>(null),[message,setMessage]=useState("");
 useEffect(()=>{let active=true;loadPenyaInsignias().then(v=>{if(active)setItems(v)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);

 const replace=async(kind:PenyaInsigniaKind,position:number,file:File|null)=>{
  if(!file)return;
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)){setMessage("Formato no admitido. Usa PNG, JPG o WEBP.");return;}
  const id=insigniaId(kind,position);setBusyId(id);setMessage("");
  try{
   const uploaded=await uploadMediaFile(file,"site");
   const next={...items,[id]:{url:uploaded.url,path:uploaded.path,name:file.name}};
   await savePenyaInsignias(next);setItems(next);setMessage("Insignia "+position+" actualizada.");
  }catch(e){setMessage("No se pudo guardar la insignia: "+(e instanceof Error?e.message:String(e)));}
  finally{setBusyId(null);}
 };

 const updateHalo=async(kind:PenyaInsigniaKind,position:number,halo:string)=>{
  const id=insigniaId(kind,position);setBusyId(id);setMessage("");
  try{const next={...items,[id]:{...(items[id]||{}),halo}};await savePenyaInsignias(next);setItems(next);setMessage("Halo del "+position+"º puesto actualizado.");}
  catch(e){setMessage("No se pudo guardar el halo: "+(e instanceof Error?e.message:String(e)));}
  finally{setBusyId(null);}
 };
 const remove=async(kind:PenyaInsigniaKind,position:number)=>{
  const id=insigniaId(kind,position),item=items[id];if(!item)return;
  if(!window.confirm("¿Quitar esta insignia de la web?"))return;
  setBusyId(id);setMessage("");
  try{const next={...items};delete next[id];await savePenyaInsignias(next);setItems(next);setMessage("Insignia retirada.");}
  catch(e){setMessage("No se pudo retirar: "+(e instanceof Error?e.message:String(e)));}
  finally{setBusyId(null);}
 };

 return <details className="admin-settings-card mt-6"><summary><span className="admin-settings-heading"><strong>Insignias de los concursos · 17</strong><small>Sustituye o añade insignias por puesto; se muestran solo al desplegar</small></span><span className="admin-settings-chevron">⌄</span></summary><div className="admin-settings-body"><section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
  <header><p className="text-[10px] font-black uppercase tracking-[.22em] text-primary">Personalización de insignias</p><h3 className="mt-1 text-xl font-black">Insignias de los concursos</h3><p className="mt-1 text-sm text-muted-foreground">Pulsa directamente sobre cualquier insignia para sustituirla. Las posiciones vacías permiten añadir una nueva en ese mismo lugar.</p></header>
  {loading?<p className="text-sm text-muted-foreground">Cargando…</p>:groups.map(group=><div key={group.kind} className="space-y-2"><h4 className="text-sm font-extrabold">{group.title}</h4><div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{Array.from({length:group.count},(_,i)=>i+1).map(position=>{
   const id=insigniaId(group.kind,position),item=items[id],busy=busyId===id,inputId="penya-insignia-"+group.kind+"-"+position;
   return <article key={position} className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-border bg-background/70 p-2">
    <label htmlFor={inputId} aria-label={(item?"Sustituir":"Añadir")+" insignia "+position+" de "+group.title} className={"group relative grid h-24 w-full cursor-pointer place-items-center rounded-xl transition-colors hover:bg-muted/60 "+(busy?"pointer-events-none opacity-60":"")}>
     <span className="grid h-20 w-20 place-items-center bg-muted/20" style={{borderRadius:group.kind==="redonda"?"50%":group.kind==="cuadrada"?"18%":"0",clipPath:group.kind==="playback"?"polygon(25% 5%,75% 5%,100% 50%,75% 95%,25% 95%,0 50%)":undefined,filter:"drop-shadow(0 0 4px "+(item?.halo||"#38bdf8")+") drop-shadow(0 0 10px "+(item?.halo||"#38bdf8")+") drop-shadow(0 0 18px "+(item?.halo||"#38bdf8")+"99)"}}>
      {item?<img src={item.url} alt={"Insignia "+position} className="h-full w-full object-contain" style={{filter:"drop-shadow(0 0 3px "+(item?.halo||"#38bdf8")+")"}}/>:<span className="px-1 text-center text-xs text-muted-foreground">＋ Añadir</span>}
     </span>
     <span className="absolute inset-x-1 bottom-0 rounded-lg bg-background/90 px-1 py-1 text-center text-[10px] font-bold text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">{busy?"Guardando…":item?"Pulsar para sustituir":"Pulsar para añadir"}</span>
    </label>
    <input id={inputId} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={busyId!==null} onChange={e=>{void replace(group.kind,position,e.currentTarget.files?.[0]??null);e.currentTarget.value="";}}/>
    <p className="text-xs font-bold">{position}º puesto</p>
    <label className="flex w-full items-center justify-center gap-2 text-[10px] font-semibold text-muted-foreground">Halo <input aria-label={"Color del halo de la insignia "+position} type="color" value={item?.halo||"#38bdf8"} disabled={busyId!==null} onChange={e=>void updateHalo(group.kind,position,e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent p-0.5"/></label>
    {item?<button type="button" disabled={busyId!==null} onClick={()=>void remove(group.kind,position)} className="text-[11px] font-bold text-destructive">Eliminar</button>:<span className="text-[11px] text-muted-foreground">Sin insignia</span>}
   </article>;
  })}</div></div>)}
  {message&&<p role="status" className="rounded-xl bg-muted px-3 py-2 text-xs">{message}</p>}
 </section></div></details>;
}