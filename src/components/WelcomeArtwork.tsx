import type { CSSProperties } from "react";

export type WelcomeArtworkItem = {
  id: string; url: string; x: number; y: number; width: number;
  rotation: number; opacity: number; zIndex: number; fit: "contain" | "cover";
};
export type WelcomeArtworkSettings = { items: WelcomeArtworkItem[]; height: number; offsetY: number };
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min));
export function parseWelcomeArtworkSettings(value?:string):WelcomeArtworkSettings{
  try{
    const parsed=JSON.parse(value||"{}");
    const items=Array.isArray(parsed?.items)?parsed.items.filter((item:any)=>item&&typeof item.url==="string").map((item:any,index:number)=>({
      id:String(item.id||"art-"+index),url:item.url,x:clamp(Number(item.x??50),-30,130),y:clamp(Number(item.y??50),-30,130),
      width:clamp(Number(item.width??24),4,120),rotation:clamp(Number(item.rotation??0),-180,180),
      opacity:clamp(Number(item.opacity??100),0,100),zIndex:clamp(Number(item.zIndex??index+1),0,99),
      fit:item.fit==="cover"?"cover" as const:"contain" as const
    })):[];
    return {items,height:clamp(Number(parsed?.height??300),120,700),offsetY:clamp(Number(parsed?.offsetY??0),-240,240)};
  }catch{return {items:[],height:300,offsetY:0};}
}
type Props={settings?:string;className?:string};
export default function WelcomeArtwork({settings="",className=""}:Props){
  const config=parseWelcomeArtworkSettings(settings);
  const style={"--welcome-art-height":config.height+"px","--welcome-art-offset":config.offsetY+"px",transform:"translateY(var(--welcome-art-offset))",marginBottom:Math.abs(config.offsetY)+"px"} as CSSProperties;
  return <div className={"welcome-artwork-stage "+className} style={style} aria-label="Imágenes decorativas de bienvenida">
    {config.items.map(item=><img key={item.id} src={item.url} alt="" draggable={false} className="welcome-artwork-image" style={{left:item.x+"%",top:item.y+"%",width:item.width+"%",opacity:item.opacity/100,zIndex:item.zIndex,objectFit:item.fit,transform:"translate(-50%,-50%) rotate("+item.rotation+"deg)"}} loading="eager"/>)}
  </div>;
}
