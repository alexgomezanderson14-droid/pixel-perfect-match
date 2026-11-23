import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { edicion, lugares as lugaresFijos, ui, type Categoria, type Lugar } from "@/content/fiestas";
import { supabase } from "@/integrations/supabase/client";
import {PenyaAwardsSection,type PenyaAward,mergeSeededPenyaAwards,penyaAwardBelongsTo} from "@/components/PenyaAwards";
import CopyrightFooter from "@/components/CopyrightFooter";
import WhatsNewAnnouncement from "@/components/WhatsNewAnnouncement";
import WelcomeGate from "@/components/WelcomeGate";
import { noticiaCuBaTa2027 } from "@/content/noticia-cubata-2027";
import { noticiaCestaNavidad2027 } from "@/content/noticia-cesta-navidad-2027";
import { noticiaDesfileHumor2026 } from "@/content/noticia-desfile-humor-2026";
import { catalogoPenyesHistorico } from "@/content/penyes-catalogo-historico";
import { getPenyaPhotoImageStyle } from "@/lib/penya-photo";
const videoCover=(url?:string)=>{if(!url)return "";const match=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/i);return match?"https://img.youtube.com/vi/"+match[1]+"/hqdefault.jpg":"";};

// En algunos navegadores móviles o sesiones privadas el almacenamiento puede
// lanzar SecurityError incluso al leerlo. La web debe seguir funcionando sin caché.
function safeLocalStorageGet(key: string): string | null {
  try { return typeof window === "undefined" ? null : window.localStorage.getItem(key); }
  catch { return null; }
}

const FestMap = lazy(() => import("@/components/FestMap"));
const AdminPenyaEditor = lazy(() => import("@/components/AdminPenyaEditor"));
const PenyaPhotoManager = lazy(() => import("@/components/PenyaPhotoManager"));
const AddPenyaForm = lazy(() => import("@/components/AddPenyaForm"));
const AddPenyaEventForm = lazy(() => import("@/components/AddPenyaEventForm"));
const AddCommunityEventForm = lazy(() => import("@/components/AddCommunityEventForm"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PENYERA | Guía de peñas, fiestas y eventos de l’Alfàs del Pi" },
      { name: "description", content: "Descubre las peñas, Mayorales, programa de fiestas, eventos, actividades y noticias de l’Alfàs del Pi (Alfaz del Pi), Alicante. Toda la comunidad festera en un mismo lugar." },
      { name: "keywords", content: "PENYERA, peñas Alfaz del Pi, peñas l’Alfàs del Pi, penyes, fiestas Alfaz, fiestas l’Alfàs, programa de fiestas, Mayorales, eventos, actividades y noticias festeras" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "PENYERA: guía de peñas y fiestas de l’Alfàs del Pi" },
      { property: "og:description", content: "Descubre las peñas, sigue las fiestas, consulta actividades y mantente al día de la actualidad festera de l’Alfàs del Pi." },
      { property: "og:url", content: "https://pixel-perfect-match-ten-tau.vercel.app/" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "PENYERA" },
      { property: "og:locale", content: "es_ES" },
      { name: "twitter:title", content: "PENYERA | Peñas, fiestas y programa de l’Alfàs del Pi" },
      { name: "twitter:description", content: "Toda la actualidad de las peñas y las fiestas de l’Alfàs del Pi (Alfaz del Pi): programa festero, Mayorales, eventos, actividades, noticias y comunidad." },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://pixel-perfect-match-ten-tau.vercel.app/" },
    ],
  }),
  component: Home,
});

const cats: Categoria[] = ["penya", "actuacion", "evento", "recinto", "servicio"];
const catBg: Record<Categoria, string> = {
  penya: "bg-cat-penya", actuacion: "bg-cat-actuacion", evento: "bg-cat-evento", recinto: "bg-cat-recinto", servicio: "bg-cat-servicio",
};

function fmtDia(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

const fechaMinimaNoticias = "2026-10-20";
const tematicaFestiva = /fiest|fiesta|festes|peñ|penya|mayoral|majoral|jubileo|cristo del buen acierto|desfile del humor|preg[oó]n|ofrenda|masclet[aà]|pirotecnia|actos lit[uú]rgicos|romer[ií]a|carnaval|fester|festera|9\s*d.?octubre/i;
function esNoticiaFestivaLocal(noticia: any) {
  const fecha = String(noticia?.fecha || "").slice(0, 10);
  if (!fecha || fecha < fechaMinimaNoticias) return false;
  const texto = [noticia?.titulo, noticia?.resumen, noticia?.contenido, noticia?.autor, noticia?.fuente, noticia?.penya_nombre, noticia?.fuente_url].filter(Boolean).join(" ");
  if (!tematicaFestiva.test(texto)) return false;
  const ubicacionLocal = /l.?alf[aà]s|alfaz|l.?albir|albir|cubata|cobre\s*bario\s*t[aá]ntalo|mayorales|mejorales|penya|peña/i.test(texto);
  const fuenteMunicipal = /(?:^|\.)lalfas\.es\//i.test(String(noticia?.fuente_url || ""));
  return ubicacionLocal || fuenteMunicipal;
}

function esNoticiaMayorales(noticia: any) {
  const referencia = [noticia?.titulo, noticia?.autor, noticia?.penya_nombre, noticia?.fuente].filter(Boolean).join(" ");
  return /mayorales|mejorales|cubata|cobre\s*bario\s*t[aá]ntalo/i.test(referencia);
}

function CountdownFiestas() {
  const calcular = () => {
    const diferencia = Math.max(0, new Date(2027, 10, 6, 13, 0, 0).getTime() - Date.now());
    return {
      dias: Math.floor(diferencia / 86400000),
      horas: Math.floor((diferencia % 86400000) / 3600000),
      minutos: Math.floor((diferencia % 3600000) / 60000),
      segundos: Math.floor((diferencia % 60000) / 1000),
    };
  };
  const [restante, setRestante] = useState(calcular);
  useEffect(() => {
    const timer = window.setInterval(() => setRestante(calcular()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <div className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-white/35 bg-black/35 px-3 py-2 text-center text-white shadow-lg backdrop-blur-md sm:gap-3 sm:px-4 sm:py-3" aria-label="Cuenta atrás hasta el anuncio oficial del comienzo de las fiestas: 6 de noviembre de 2027 a las 13:00">
    {([["dias", "DÍAS"], ["horas", "H"], ["minutos", "MIN"], ["segundos", "SEG"]] as const).map(([key, label], index) => <div key={key} className="flex min-w-[2.5rem] flex-col sm:min-w-[3.5rem]">
      <span className="text-xl font-extrabold tabular-nums leading-none sm:text-3xl">{String(restante[key]).padStart(2, "0")}</span>
      <span className="mt-1 text-[8px] font-bold tracking-wider text-white/80 sm:text-[10px]">{label}</span>
    </div>)}
  </div>;
}

function eventoSigueActivo(item: { dia?: string; hora?: string; diaSiguiente?: boolean }, now = Date.now()) {
  if (!item.dia) return true;
  const hora = String(item.hora || "").match(/(?:^|\D)([01]\d|2[0-3]):([0-5]\d)/);
  const fecha = new Date(String(item.dia).slice(0, 10) + "T12:00:00");
  if (item.diaSiguiente) fecha.setDate(fecha.getDate() + 1);
  const fechaKey = fecha.toISOString().slice(0, 10);
  const inicio = new Date(`${fechaKey}T${hora ? hora[1] + ":" + hora[2] : "23:59"}:00`).getTime();
  const fechaLimite = inicio + 3 * 60 * 60 * 1000;
  return Number.isNaN(inicio) || fechaLimite > now;
}

function instagramUrl(value?: string | null) {
  if (!value?.trim()) return null;
  const raw = value.trim().replace(/^@/, "");
  return raw.startsWith("http") ? raw : "https://www.instagram.com/" + raw;
}

async function shareWebsite() {
  const url = window.location.href;
  const title = "Fiestas de l'Alfàs del Pi";
  const text = "Consulta el programa, el mapa y las peñas de las fiestas.";
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); localStorage.setItem("fiestas-share-reminder-last", String(Date.now())); return; }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(url); localStorage.setItem("fiestas-share-reminder-last", String(Date.now())); window.alert("Enlace copiado. Ya puedes pegarlo donde quieras."); }
  catch { window.prompt("Copia el enlace de la web:", url); }
}

function shareOn(channel: "whatsapp" | "facebook" | "telegram" | "x" | "email", url: string, title: string, message: string) {
  const u = encodeURIComponent(url), t = encodeURIComponent(message + " " + url), subject = encodeURIComponent(title);
  const destinations = {
    whatsapp: "https://wa.me/?text=" + t,
    facebook: "https://www.facebook.com/sharer/sharer.php?u=" + u,
    telegram: "https://t.me/share/url?url=" + u + "&text=" + encodeURIComponent(message),
    x: "https://twitter.com/intent/tweet?text=" + encodeURIComponent(message) + "&url=" + u,
    email: "mailto:?subject=" + subject + "&body=" + t,
  };
  window.open(destinations[channel], "_blank", "noopener,noreferrer");
}

async function copyShareLink(url: string) {
  try { await navigator.clipboard.writeText(url); window.alert("Enlace copiado."); }
  catch { window.prompt("Copia este enlace:", url); }
}

async function sharePenyaCard(p: PenyaDb) {
  // Plantilla vertical 9:16 lista para Stories de Instagram.
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("No se pudo crear la imagen.");

  c.fillStyle = "#f4eee5";
  c.fillRect(0, 0, 1080, 1920);
  c.fillStyle = "#173f52";
  c.fillRect(0, 0, 1080, 430);

  c.fillStyle = "#e6b6c7";
  c.font = "bold 30px Arial";
  c.fillText("FIESTAS L'ALFÀS DEL PI", 76, 88);

  // La foto/logo de la peña se coloca como emblema circular.
  if (p.foto) {
    let logoObjectUrl: string | null = null;
    try {
      const response = await fetch(p.foto, { mode: "cors" });
      if (!response.ok) throw new Error("Logo no disponible");
      const objectUrl = URL.createObjectURL(await response.blob());
      logoObjectUrl = objectUrl;
      const logo = new Image();
      await new Promise<void>((resolve, reject) => {
        logo.onload = () => resolve();
        logo.onerror = () => reject(new Error("Logo no disponible"));
        logo.src = objectUrl;
      });
      c.save();
      c.beginPath();
      c.arc(160, 245, 92, 0, Math.PI * 2);
      c.clip();
      c.drawImage(logo, 68, 153, 184, 184);
      c.restore();
      URL.revokeObjectURL(objectUrl);
      logoObjectUrl = null;
    } catch {
      if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
      c.fillStyle = "#e6b6c7";
      c.beginPath(); c.arc(160, 245, 92, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#173f52"; c.font = "bold 90px Arial";
      c.textAlign = "center"; c.fillText(p.nombre.trim().charAt(0).toUpperCase(), 160, 276); c.textAlign = "left";
    }
  } else {
    c.fillStyle = "#e6b6c7";
    c.beginPath(); c.arc(160, 245, 92, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#173f52"; c.font = "bold 90px Arial";
    c.textAlign = "center"; c.fillText(p.nombre.trim().charAt(0).toUpperCase(), 160, 276); c.textAlign = "left";
  }

  c.fillStyle = "#ffffff";
  c.font = "bold 58px Arial";
  const words = p.nombre.split(" ");
  let line = ""; let y = 210;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (c.measureText(test).width > 700) {
      c.fillText(line, 300, y); line = word; y += 70;
    } else line = test;
  }
  if (line) c.fillText(line, 300, y);

  c.fillStyle = "#173f52";
  c.font = "bold 34px Arial";
  c.fillText("ENCUÉNTRANOS EN EL MAPA", 76, 510);

  let mapDrawn = false;
  if (p.lat != null && p.lng != null) {
    let mapObjectUrl: string | null = null;
    try {
      const mapUrl = "https://staticmap.openstreetmap.de/staticmap.php?center=" + p.lat + "," + p.lng + "&zoom=16&size=960x760&markers=" + p.lat + "," + p.lng + ",red-pushpin";
      const response = await fetch(mapUrl, { mode: "cors" });
      if (!response.ok) throw new Error("Mapa no disponible");
      const objectUrl = URL.createObjectURL(await response.blob());
      mapObjectUrl = objectUrl;
      const mapImage = new Image();
      await new Promise<void>((resolve, reject) => {
        mapImage.onload = () => resolve();
        mapImage.onerror = () => reject(new Error("Mapa no disponible"));
        mapImage.src = objectUrl;
      });
      c.save();
      c.beginPath(); c.roundRect(60, 550, 960, 760, 34); c.clip();
      c.drawImage(mapImage, 60, 550, 960, 760);
      c.restore();
      URL.revokeObjectURL(objectUrl);
      mapObjectUrl = null;
      mapDrawn = true;
    } catch { if (mapObjectUrl) URL.revokeObjectURL(mapObjectUrl); mapDrawn = false; }
  }

  if (!mapDrawn) {
    c.fillStyle = "#d9e3d8"; c.fillRect(60, 550, 960, 760);
    c.strokeStyle = "#ffffff"; c.lineWidth = 32; c.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      c.beginPath(); c.moveTo(80, 620 + i * 100);
      c.bezierCurveTo(360, 500 + i * 100, 640, 900 + i * 40, 1000, 600 + i * 100); c.stroke();
    }
    c.fillStyle = "#b45c79"; c.beginPath(); c.arc(540, 900, 35, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#173f52"; c.font = "bold 30px Arial";
    c.textAlign = "center"; c.fillText("UBICACIÓN DE LA PEÑA", 540, 1200); c.textAlign = "left";
  }

  c.fillStyle = "#173f52";
  c.font = "bold 34px Arial";
  c.fillText("DÓNDE ESTAMOS", 76, 1390);
  c.font = "30px Arial";
  c.fillStyle = "#655650";
  const address = (p.direccion || "L'Alfàs del Pi").trim();
  const addressLines = address.match(/.{1,48}(?:\s|$)/g) || [address];
  addressLines.slice(0, 2).forEach((part, index) => c.fillText(part.trim(), 76, 1445 + index * 42));

  c.fillStyle = "#173f52";
  c.fillRect(60, 1570, 960, 3);
  c.fillStyle = "#173f52";
  c.font = "bold 38px Arial";
  c.fillText("¡VEN A CONOCERNOS!", 76, 1650);
  c.font = "bold 30px Arial";
  c.fillStyle = "#806e65";
  c.fillText("Descubre todas las peñas, planes y fiestas", 76, 1710);
  c.fillStyle = "#b45c79";
  c.font = "bold 34px Arial";
  c.fillText("Consulta la web de fiestas", 76, 1790);
  c.fillStyle = "#806e65";
  c.font = "26px Arial";
  c.fillText(window.location.host, 76, 1845);
  c.font = "bold 24px Arial";
  c.fillText("© Todos los derechos reservados", 76, 1885);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error("No se pudo generar el PNG.")), "image/png")
  );
  const safeName = p.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
  const file = new File([blob], "penya-" + safeName + "-stories.png", { type: "image/png" });
  const url = window.location.origin + "/#penya-" + p.id;
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({ files: [file], title: p.nombre, text: "Conoce " + p.nombre + " en las fiestas de l'Alfàs del Pi: " + url });
  } else {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = objectUrl; a.download = file.name; a.click();
    URL.revokeObjectURL(objectUrl);
    try { await navigator.clipboard?.writeText(url); } catch { /* La descarga sigue disponible aunque no se copie el enlace. */ }
    window.alert("Plantilla de Instagram descargada. Ya puedes subirla a tus historias.");
  }
}
type PenyaDb = { id: string; nombre: string; direccion: string | null; lat: number | null; lng: number | null; foto: string; foto_url?: string | null; tipo_musica: string; tiene_evento?: boolean; instagram?: string | null; informacion?: string | null; asociada?: boolean; color?: string; miembros_actuales?: number | null };
const penyaStickerTypes = ["confetti","firework","bomb","flame","trumpet"] as const;
function getPenyaStickerSeed(id:string){
  return Array.from(id).reduce((sum,char)=>((sum*31)+char.charCodeAt(0))>>>0,17);
}
function getPenyaStickerSet(id:string){
  const seed=getPenyaStickerSeed(id);
  const shuffled=[...penyaStickerTypes].sort((a,b)=>{
    const av=Array.from(a).reduce((n,c)=>n+c.charCodeAt(0),seed);
    const bv=Array.from(b).reduce((n,c)=>n+c.charCodeAt(0),seed);
    return ((av*2654435761)>>>0)-((bv*2654435761)>>>0);
  });
  return shuffled.slice(0,4).map((type,index)=>({type,className:"penya-sticker-slot-"+index}));
}
function getPenyaStickerStyle(id:string,index:number){
  const seed=getPenyaStickerSeed(id);
  const hash=(n:number)=>((Math.imul(seed^(n*0x9e3779b9),0x85ebca6b)>>>0)%10000)/10000;
  const zones=[
    {x:3+hash(1)*12,y:5+hash(2)*13},
    {x:25+hash(3)*15,y:7+hash(4)*18},
    {x:58+hash(5)*15,y:5+hash(6)*14},
    {x:79+hash(7)*13,y:10+hash(8)*17}
  ];
  const item=zones[index];
  const rotate=-27+hash(10+index)*54;
  const width=10.5+hash(20+index)*5.5;
  return {
    left:item!.x+"%",
    top:item!.y+"%",
    width:"clamp(4.7rem, "+width.toFixed(1)+"vw, "+(width*1.08).toFixed(1)+"rem)",
    transform:"rotate("+rotate.toFixed(1)+"deg)"
  };
}
const penyaStickerArt:Record<string,ReactNode>={
  confetti:<svg viewBox="0 0 180 180" aria-hidden="true"><defs><linearGradient id="confettiGold" x2="0" y2="1"><stop stopColor="#fff27a"/><stop offset="1" stopColor="#ff9e19"/></linearGradient><linearGradient id="confettiPink" x2="0" y2="1"><stop stopColor="#ff91bd"/><stop offset="1" stopColor="#ef286c"/></linearGradient><filter id="stickerShadow"><feGaussianBlur stdDeviation="2.5"/></filter></defs><g stroke="#fff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"><path d="M24 23l17 23M145 17l-9 27M158 105l-29-5M21 137l19-25M88 8v29M9 83l28-5" fill="none"/><path d="M55 56l13-25 13 25 27 4-20 19 5 27-25-13-24 13 5-27-20-19z" fill="url(#confettiGold)"/><path d="M119 54l10-20 11 20 21 4-16 15 4 22-20-11-20 11 4-22-16-15z" fill="url(#confettiPink)"/><circle cx="37" cy="88" r="11" fill="#35c9ed"/><circle cx="105" cy="145" r="10" fill="#8e69f7"/><circle cx="158" cy="145" r="8" fill="#ff9b38"/><path d="M45 15l5 12M168 65l-12 4M73 154l-8 13" fill="none" strokeWidth="8"/></g><path d="M57 57l11-18 10 18 20 4-15 14 4 20-19-10-18 10 4-20-15-14z" fill="none" stroke="#fff8c9" strokeWidth="3"/><path d="M123 55l7-13 7 13 15 3-11 10 3 15-14-8-13 8 3-15-11-10z" fill="none" stroke="#ffd4e4" strokeWidth="3"/></svg>,
  firework:<svg viewBox="0 0 180 180" aria-hidden="true"><defs><radialGradient id="burstCore"><stop stopColor="#fff"/><stop offset=".48" stopColor="#ffe96a"/><stop offset="1" stopColor="#ff9c20"/></radialGradient></defs><g fill="none" stroke="#fff" strokeWidth="15" strokeLinecap="round"><path d="M90 89L90 12M90 89L145 31M90 89L168 81M90 89L146 145M90 89L91 169M90 89L32 145M90 89L12 83M90 89L32 31"/></g><g fill="none" strokeWidth="7" strokeLinecap="round"><path stroke="#ffb82e" d="M90 89L90 12M90 89L168 81M90 89L32 31"/><path stroke="#ff4f87" d="M90 89L145 31M90 89L146 145M90 89L32 145"/><path stroke="#37c8ec" d="M90 89L91 169M90 89L12 83"/></g><g fill="none" strokeWidth="5" strokeLinecap="round"><path stroke="#fff" d="M51 18l-5-10M133 13l8-9M166 125l10 5M15 119l-10 6M59 165l-4 10M125 164l6 9"/><path stroke="#ffe35b" d="M90 4v-3M175 81h4M90 176v3M4 83H1"/></g><circle cx="90" cy="89" r="20" fill="url(#burstCore)" stroke="#fff" strokeWidth="8"/><circle cx="90" cy="89" r="7" fill="#fff"/></svg>,
  bomb:<svg viewBox="0 0 180 180" aria-hidden="true"><defs><radialGradient id="bombBody" cx="30%" cy="22%"><stop stopColor="#71859b"/><stop offset=".5" stopColor="#34475b"/><stop offset="1" stopColor="#172536"/></radialGradient><linearGradient id="bombFuse"><stop stopColor="#fff27a"/><stop offset="1" stopColor="#ff7b22"/></linearGradient></defs><path d="M111 47l19-27 20 12-20 31" fill="none" stroke="#fff" strokeWidth="16" strokeLinecap="round"/><path d="M111 47l19-27 20 12-20 31" fill="none" stroke="#9ba9b8" strokeWidth="8" strokeLinecap="round"/><path d="M146 23l10-13M157 38l15-2M139 11l2-10" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round"/><path d="M146 23l10-13M157 38l15-2M139 11l2-10" fill="none" stroke="url(#bombFuse)" strokeWidth="6" strokeLinecap="round"/><circle cx="83" cy="103" r="62" fill="url(#bombBody)" stroke="#fff" strokeWidth="13"/><path d="M43 82q17-29 48-27" fill="none" stroke="#aebdca" strokeWidth="10" strokeLinecap="round" opacity=".75"/><path d="M49 130l-16 10M112 143l13 8" fill="none" stroke="#ff5b82" strokeWidth="9" strokeLinecap="round"/><circle cx="62" cy="88" r="7" fill="#fff"/><path d="M105 67q17 10 22 28" fill="none" stroke="#8395a8" strokeWidth="6" strokeLinecap="round"/><path d="M27 34l7-12M15 52l-13-2M151 100l15 5" stroke="#fff" strokeWidth="7" strokeLinecap="round"/></svg>,
  flame:<svg viewBox="0 0 180 180" aria-hidden="true"><defs><linearGradient id="flameOuter" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffb52f"/><stop offset=".55" stopColor="#ff5b32"/><stop offset="1" stopColor="#e52b45"/></linearGradient><linearGradient id="flameInner" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff78b"/><stop offset="1" stopColor="#ffb52f"/></linearGradient></defs><path d="M93 9c15 36 57 51 48 103-6 37-30 59-65 57-39-2-62-31-55-68 5-29 26-45 39-67 2 26 13 35 20 40 10-23 11-43 13-65z" fill="url(#flameOuter)" stroke="#fff" strokeWidth="13" strokeLinejoin="round"/><path d="M91 84c14 17 29 30 22 51-5 17-17 26-33 24-19-2-29-17-25-34 3-14 15-25 23-37 2 13 7 19 11 22 4-10 3-18 2-26z" fill="url(#flameInner)" stroke="#ffdc65" strokeWidth="4"/><path d="M65 47q-17 15-20 33M124 48q15 15 16 31" fill="none" stroke="#fff4c7" strokeWidth="6" strokeLinecap="round" opacity=".9"/><path d="M24 115l-13 4M153 124l14 7M37 25l-8-10" stroke="#fff" strokeWidth="8" strokeLinecap="round"/></svg>,
  trumpet:<svg viewBox="0 0 180 180" aria-hidden="true"><defs><linearGradient id="brass" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff18b"/><stop offset=".38" stopColor="#ffc83d"/><stop offset="1" stopColor="#d77b13"/></linearGradient></defs><g stroke="#fff" strokeWidth="14" strokeLinejoin="round" strokeLinecap="round"><path d="M18 77h77v25H18z" fill="url(#brass)"/><path d="M94 65l62-30v110l-62-31z" fill="url(#brass)"/><path d="M43 77V48h19v29M43 102v30h19v-30" fill="url(#brass)"/><path d="M155 48l16-13M155 132l16 13" fill="none"/></g><g fill="none" strokeLinecap="round"><path d="M29 83h59" stroke="#fff7c5" strokeWidth="7"/><path d="M105 70l37-18M105 109l37 18" stroke="#ffe99a" strokeWidth="5"/><path d="M20 66l-9-8M20 113l-9 8" stroke="#fff" strokeWidth="7"/></g><circle cx="51" cy="40" r="7" fill="#fff" opacity=".9"/></svg>
};
const safeHttpUrl=(value:any)=>{try{const url=new URL(String(value||""));return url.protocol==="https:"||url.protocol==="http:"?url.toString():"";}catch{return "";}};
const penyaVideoEmbed=(value:any)=>{const raw=safeHttpUrl(value);if(!raw)return "";try{const url=new URL(raw);if(url.hostname==="youtu.be")return "https://www.youtube-nocookie.com/embed/"+url.pathname.slice(1).split("/")[0];if(url.hostname.endsWith("youtube.com")){const id=url.searchParams.get("v")||url.pathname.split("/").filter(Boolean).pop();return id?"https://www.youtube-nocookie.com/embed/"+id:"";}if(url.hostname.endsWith("vimeo.com")){const id=url.pathname.split("/").filter(Boolean).pop();return id?"https://player.vimeo.com/video/"+id:"";}return /\.mp4(?:$|[?#])/i.test(url.pathname)?raw:"";}catch{return "";}};
const normalizarBusqueda=(value:any)=>String(value||"").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
const normalizarNombrePenya=(value:any)=>String(value||"").trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
const claveCatalogoPenya=(value:any)=>normalizarNombrePenya(value).replace(/^(?:penya|pena)/,"");
const nombrePenyaParaOrden=(value:any)=>String(value||"").trim().replace(/^(?:penya|peña)\s+/i,"").trim();
const limpiarTextoNoticia=(value:any)=>{
  const text=String(value||"")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<\/(?:p|div|section|article|h[1-6]|li|blockquote|tr)>/gi,"\n\n")
    .replace(/<(?:p|div|section|article|h[1-6]|blockquote|tr)\b[^>]*>/gi,"\n")
    .replace(/<br\s*\/?\s*>/gi,"\n")
    .replace(/<li\b[^>]*>/gi,"• ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,"<").replace(/&gt;/gi,">")
    .replace(/if\s*\(\s*typeof\s+wppas_ga[\s\S]*?nonInteraction\s*:\s*true\s*\}\s*\)\s*;?\s*\}/gi," ")
    .replace(/\{vendor_count\}|Gestionar\s+proveedores|Leer más sobre estos propósitos/gi," ")
    .replace(/\(?\s*https?:\s*\/\/[^\s)]+\.(?:pdf|docx?|xlsx?|pptx?|zip|rar)(?:[?#][^\s)]*)?\s*\)?/gi," ")
    .replace(/\b[\wÀ-ÿ ._()-]+\.(?:pdf|docx?|xlsx?|pptx?|zip|rar)\b/gi," ")
    .replace(/(?:[•·]\s*)?\d+\s*KB\s+\d{1,2}\.\s*\d{1,2}\.\s*20\d{2}/gi," ")
    .replace(/(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo)\s*,?\s*\d{1,2}\s+(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+20\d{2}\s*,?\s*\d{1,2}:\d{2}/gi," ")
    .replace(/Gobierno Municipal|Saluda del Alcalde|Portal de Transparencia Institucional|Servicios Municipales|Bienestar Social|Inicio|Contacto|Mapa web/gi," ")
    .replace(/Regístrate|Iniciar sesión|Edición impresa|Hemeroteca|Aviso legal|Política de privacidad|Suscríbete|Portada\s*\(/gi," ")
    .replace(/DESCARGA LA PROGRAMACIÓN DE LAS FIESTAS[^.]*|Aquí te puedes descargar el libro[^.]*:?/gi," ")
    .replace(/Ayuntamiento de l['’]Alfàs del Pi\s+Calle Federico García Lorca,?\s*11\s+03580[^\n]*/gi," ");
  return text.replace(/\r/g,"")
    .split(/\n+/)
    .map(line=>line.replace(/[ \t]+/g," ").replace(/\s+([,.;:!?])/g,"$1").trim())
    .filter(line=>line&&!/^(?:gobierno municipal|saluda del alcalde|portal de transparencia institucional|servicios municipales|bienestar social|inicio|contacto|mapa web)$/i.test(line))
    .join("\n\n")
    .trim();
};

const videoEmbedUrl=(value:string)=>{try{const u=new URL(value);const host=u.hostname.toLowerCase();if(host==="youtube.com"||host==="www.youtube.com"){const id=u.searchParams.get("v")||(u.pathname.startsWith("/shorts/")?u.pathname.split("/")[2]:"");return id?"https://www.youtube-nocookie.com/embed/"+id:"";}if(host==="youtu.be")return "https://www.youtube-nocookie.com/embed/"+u.pathname.split("/").filter(Boolean)[0];if(host==="vimeo.com"||host==="www.vimeo.com")return "https://player.vimeo.com/video/"+u.pathname.split("/").filter(Boolean).pop();if(host==="instagram.com"||host==="www.instagram.com"){const path=u.pathname.endsWith("/")?u.pathname.slice(0,-1):u.pathname;if(path.includes("/reel/")||path.includes("/p/")||path.includes("/tv/"))return u.origin+path+"/embed";}return "";}catch{return "";}};
const esVideoDirecto=(value:string)=>{try{const path=new URL(value).pathname.toLowerCase();return [".mp4",".webm",".ogg",".mov"].some(ext=>path.endsWith(ext));}catch{return false;}};
const esVideoVertical=(value:string)=>{try{const u=new URL(value);return /\/shorts\/|\/reel\/|\/p\//i.test(u.pathname);}catch{return false;}};

function Home() {
  const [brandInfoOpen, setBrandInfoOpen] = useState(false);
  const [q, setQ] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [newsSearch, setNewsSearch] = useState("");
  const [penyaSearch, setPenyaSearch] = useState("");
  const [penyaMusicFilter, setPenyaMusicFilter] = useState("Todas");
  const [penyaOnlyMine, setPenyaOnlyMine] = useState(false);
  const [activePenyaCard, setActivePenyaCard] = useState(0);
  const [penyaCarouselInitialized, setPenyaCarouselInitialized] = useState(false);
  const [managingPenyaPhotos, setManagingPenyaPhotos] = useState<PenyaDb | null>(null);
  const [editingPenyaProfile, setEditingPenyaProfile] = useState<PenyaDb | null>(null);
  const penyaCarouselRef = useRef<HTMLDivElement | null>(null);
  const penyaCardCentersRef = useRef<number[]>([]);
  const penyaCarouselScrollLeftRef = useRef<number | null>(null);
  const penyaScrollEndTimerRef = useRef<number | null>(null);
  const penyaCarouselSignatureRef = useRef("");
  const [eventsSearch, setEventsSearch] = useState("");
  const [filterDay, setFilterDay] = useState<"upcoming"|"today"|"tomorrow"|"all">("upcoming");
  const [filterCategory, setFilterCategory] = useState<"all"|"programa"|"actuaciones"|"penyes">("all");
  const [currentPage, setCurrentPage] = useState<"home"|"noticias"|"buscar"|"eventos"|"mapa"|"penyes"|"info">("home");
  const [settingsClosing, setSettingsClosing] = useState(false);
  const [accountUser, setAccountUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [showWelcomePreview, setShowWelcomePreview] = useState(false);
  const [penyaAccessNotice, setPenyaAccessNotice] = useState(false);
  const esAdminWeb = ["gomezandersonalex@gmail.com", "alexgomezanderson14@gmail.com"].includes(String(accountUser?.email || "").toLowerCase());
  const puedeAdministrarPenya = (penyaId: string) => esAdminWeb || [accountUser?.app_metadata?.penya_admin_ids].some((ids:any) => Array.isArray(ids) && ids.includes(penyaId)) || accountUser?.app_metadata?.penya_admin_id === penyaId || accountUser?.app_metadata?.penya_roles?.[penyaId] === "admin";
  const puedeGestionarPenya = (penyaId: string) => puedeAdministrarPenya(penyaId) || (penyaMembership?.estado === "aprobado" && String(penyaMembership?.penya_id) === String(penyaId));
  const avisarAccesoPenya = () => setPenyaAccessNotice(true);
  const [accountMode, setAccountMode] = useState<"register"|"login">("register");
  const [accountName, setAccountName] = useState("");
  const [accountPenyaId, setAccountPenyaId] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [showPenyaJoinDialog, setShowPenyaJoinDialog] = useState(false);
  const [penyaPromptDismissedFor, setPenyaPromptDismissedFor] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [personalPrefs, setPersonalPrefs] = useState({ showImportantNotices: true, reduceMotion: false, largeText: false, highContrast: false });
  const [feedbackType,setFeedbackType]=useState<"sugerencia"|"error">("sugerencia");
  const [feedbackTitle,setFeedbackTitle]=useState("");
  const [feedbackDescription,setFeedbackDescription]=useState("");
  const [feedbackEmail,setFeedbackEmail]=useState("");
  const [feedbackMessage,setFeedbackMessage]=useState("");
  const [feedbackBusy,setFeedbackBusy]=useState(false);
  const [avisos, setAvisos] = useState<any[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [mapPoints, setMapPoints] = useState<Lugar[]>([]);
  const [cat, setCat] = useState<Categoria | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [penyes, setPenyes] = useState<PenyaDb[]>([]);
  const [penyaPhotos, setPenyaPhotos] = useState<any[]>([]);
  const [misPenyes, setMisPenyes] = useState<string[]>([]);
  const [penyaMembership, setPenyaMembership] = useState<any | null>(null);
  const [penyaMembershipLoading, setPenyaMembershipLoading] = useState(false);
  const [penyaMemberRoster, setPenyaMemberRoster] = useState<any[]>([]);
  const [actos, setActos] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [noticias, setNoticias] = useState<any[]>([]);
  const [noticiaSeleccionada, setNoticiaSeleccionada] = useState<any | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<number | null>(null);
  const [siteContent, setSiteContent] = useState<Record<string,string>>({});
  const penyaCardSettings = useMemo(()=>{try{const parsed=JSON.parse(siteContent["penyas_cards_json"]||"{}");return parsed&&typeof parsed==="object"?parsed as Record<string,{color?:string;logo_url?:string;title?:string;description?:string;logo_scale?:number;logo_x?:number;logo_y?:number}>:{ };}catch{return {}; }},[siteContent]);
  const penyaProfileLogoSettings = useMemo(()=>{try{const parsed=JSON.parse(siteContent["penyes_logos_ficha_json"]||"{}");return parsed&&typeof parsed==="object"?parsed as Record<string,{zoom?:number;x?:number;y?:number}>:{ };}catch{return {}; }},[siteContent]);
  const [heroImage, setHeroImage] = useState("");
  const [form, setForm] = useState(false);
  const [shareReminder, setShareReminder] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [selectedPenya, setSelectedPenya] = useState<PenyaDb | null>(null);
  const selectedPenyaFoto = selectedPenya?.foto || "";
  const selectedPenyaLogo = selectedPenyaFoto;
  const [penyaDetailFullscreen, setPenyaDetailFullscreen] = useState(false);
  const [mapPenyaPreview, setMapPenyaPreview] = useState(false);
  const [penyaGalleryOpen, setPenyaGalleryOpen] = useState(false);
  const [penyaFotoAmpliada, setPenyaFotoAmpliada] = useState<number | null>(null);
  const [penyaFotoZoom,setPenyaFotoZoom]=useState(1);
  const [eventFormPenya, setEventFormPenya] = useState<PenyaDb | null>(null);
  const [communityEventForm, setCommunityEventForm] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapShouldLoad, setMapShouldLoad] = useState(false);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [currentPage, noticiaSeleccionada?.id, mapFullscreen]);
  useEffect(() => {
    if (currentPage !== "home" || mapShouldLoad) return;
    const target = mapViewportRef.current;
    if (!target) return;
    if (typeof IntersectionObserver === "undefined") { setMapShouldLoad(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setMapShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: "120px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [currentPage, mapShouldLoad]);
  const dias = useMemo(() => [...new Set(actos.filter((a) => eventoSigueActivo(a, now)).map((a) => a.dia))].sort(), [actos, now]);
  const [dia, setDia] = useState<string | undefined>();
  const eventosActivos = useMemo(() => eventos.filter((e) => eventoSigueActivo(e, now)), [eventos, now]);
  const todayDate = new Date(now);
  const todayKey = todayDate.getFullYear()+"-"+String(todayDate.getMonth()+1).padStart(2,"0")+"-"+String(todayDate.getDate()).padStart(2,"0");
  const tomorrowDate = new Date(now); tomorrowDate.setDate(tomorrowDate.getDate()+1);
  const tomorrowKey = tomorrowDate.getFullYear()+"-"+String(tomorrowDate.getMonth()+1).padStart(2,"0")+"-"+String(tomorrowDate.getDate()).padStart(2,"0");
  const matchesDay = useCallback((item:any) => eventoSigueActivo(item,now) && (filterDay==="all" || (filterDay==="upcoming" ? true : String(item.dia||"").slice(0,10)===(filterDay==="today"?todayKey:tomorrowKey))), [filterDay,now,todayKey,tomorrowKey]);
  const filteredActs = useMemo(()=>actos.filter((a)=>matchesDay(a) && (filterCategory==="all" || (filterCategory==="programa" && a.tipo==="evento") || (filterCategory==="actuaciones" && (a.tipo==="evento" || a.tipo==="actuacion" || /tardeo|mañaneo|mananeo|nocheo|festes? al carrer|fiestas? en la calle/i.test(a.titulo||"")))) && (!eventsSearch.trim() || normalizarBusqueda([a.titulo,a.descripcion,a.lugar].join(" ")).includes(normalizarBusqueda(eventsSearch)))), [actos,filterDay,filterCategory,now,eventsSearch,matchesDay]);
  const filteredPenyaEvents = useMemo(()=>eventos.filter((e)=>matchesDay(e) && (filterCategory==="all" || filterCategory==="penyes") && (!eventsSearch.trim() || normalizarBusqueda([e.titulo,e.descripcion,e.lugar,penyes.find(p=>p.id===e.penya_id)?.nombre].join(" ")).includes(normalizarBusqueda(eventsSearch)))).sort((a,b)=>String(a.dia||"").localeCompare(String(b.dia||""))||(a.hora||"").localeCompare(b.hora||"")), [eventos,filterDay,filterCategory,now,eventsSearch,penyes,matchesDay]);
  const visibleActs = useMemo(()=>filteredActs.filter(a=>!/despertà|desperta|despertada|nit de albaes|nit d'albaes|nit de les albaes|albaes/.test(String(a.titulo||"").toLocaleLowerCase("es"))).sort((a,b)=>a.dia.localeCompare(b.dia)||(a.hora||"").localeCompare(b.hora||"")),[filteredActs]);
  const penyaMusicOptions = useMemo(()=>["Todas",...Array.from(new Set(penyes.map(p=>String(p.tipo_musica||"").trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"es"))],[penyes]);
  const mayoralesAnio = String(siteContent["mayorales_anio"]||"2027");
  // Prioridad: peña configurada, etiqueta Mayorales del año vigente y, como respaldo, CuBaTa.
  // La configuración explícita y las etiquetas de la ficha tienen prioridad; CuBaTa solo es respaldo.
  const mayoralesPenyaId = useMemo(()=>{
    const configuredId=String(siteContent["mayorales_penya_id"]||"").trim();
    if(configuredId&&penyes.some(p=>String(p.id)===configuredId))return configuredId;
    try {
      const perfiles=JSON.parse(siteContent["penyes_perfiles_json"]||"{}");
      const tituloVigente=(value:any)=>{
        const title=normalizarNombrePenya(value);
        if(!title.includes("mayorales")&&!title.includes("mejorales"))return false;
        const year=String(value||"").match(/20\d{2}/)?.[0];
        return !year || year===mayoralesAnio;
      };
      const taggedPenya=penyes.find(p=>Array.isArray(perfiles?.[String(p.id)])&&perfiles[String(p.id)].some((block:any)=>block?.type==="tag"&&tituloVigente(block.title)));
      if(taggedPenya)return String(taggedPenya.id);
    } catch { /* Si no hay etiquetas legibles, se usa CuBaTa como respaldo de Mayorales 2027. */ }
    const cubata=penyes.find(p=>{const name=normalizarNombrePenya(p.nombre);return name==="cubata"||name.includes("cobrebariotantalo");});
    return cubata?String(cubata.id):"";
  },[penyes,siteContent["penyes_perfiles_json"],siteContent["mayorales_penya_id"],mayoralesAnio]);
  const mayoralesColor = String((mayoralesPenyaId && penyaCardSettings[mayoralesPenyaId]?.color) || siteContent["theme_accent"] || "#173f52");
  // El color de la peña define la identidad visual, pero los tonos semánticos se oscurecen para mantener contraste en textos y controles.
  const mayoralesPrimaryColor = `color-mix(in srgb, ${mayoralesColor} 28%, #173f52)`;
  const visiblePenyes = useMemo(()=>[...penyes].filter(p=>(!penyaSearch.trim()||normalizarBusqueda([p.nombre,p.direccion,p.tipo_musica,p.informacion].join(" ")).includes(normalizarBusqueda(penyaSearch)))&&(penyaMusicFilter==="Todas"||String(p.tipo_musica||"").trim()===penyaMusicFilter)&&(!penyaOnlyMine||misPenyes.includes(p.id))).sort((a,b)=>nombrePenyaParaOrden(a.nombre).localeCompare(nombrePenyaParaOrden(b.nombre),"es",{sensitivity:"base",numeric:true})||String(a.nombre??"").localeCompare(String(b.nombre??""),"es",{sensitivity:"base"})),[penyes,penyaSearch,penyaMusicFilter,penyaOnlyMine,misPenyes]);
  const searchingPenyes = Boolean(penyaSearch.trim()) || penyaMusicFilter !== "Todas" || penyaOnlyMine;
  // Mayorales debe abrir el carrusel como primera peña cuando se muestra el directorio sin filtros.
  // Los filtros y búsquedas conservan su orden de resultados para no ocultar la coincidencia solicitada.
  const carouselPenyes = useMemo(()=>{
    if(searchingPenyes||!mayoralesPenyaId)return visiblePenyes;
    const index=visiblePenyes.findIndex(p=>String(p.id)===mayoralesPenyaId);
    if(index<=0)return visiblePenyes;
    return [visiblePenyes[index]!,...visiblePenyes.slice(0,index),...visiblePenyes.slice(index+1)];
  },[visiblePenyes,searchingPenyes,mayoralesPenyaId]);
  // Tres copias mantienen un ciclo continuo con una vuelta de margen a cada lado y reducen el DOM y la memoria, especialmente en móviles.
  const loopedPenyes = !searchingPenyes && carouselPenyes.length > 1 ? [...carouselPenyes,...carouselPenyes,...carouselPenyes] : [...carouselPenyes];
  // Cachea los centros de las tarjetas: durante el gesto de desplazamiento no
  // se fuerzan lecturas de layout de todas las tarjetas en cada frame.
  const rebuildPenyaCardCenters=useCallback(()=>{
    const el=penyaCarouselRef.current;
    if(!el)return;
    penyaCardCentersRef.current=Array.from(el.children,(child)=>{
      const card=child as HTMLElement;
      return card.offsetLeft+card.offsetWidth/2;
    });
  },[]);
  const nearestPenyaCardIndex=useCallback((el:HTMLDivElement)=>{
    const centers=penyaCardCentersRef.current;
    if(!centers.length)return 0;
    const target=el.scrollLeft+el.clientWidth/2;
    let low=0,high=centers.length-1;
    while(low<high){
      const middle=(low+high)>>1;
      if(centers[middle]!<target)low=middle+1;
      else high=middle;
    }
    if(low>0&&Math.abs(centers[low-1]!-target)<=Math.abs(centers[low]!-target))return low-1;
    return low;
  },[]);
  // Calcula el centro usando la geometría real del layout, no getBoundingClientRect:
  // las transformaciones del coverflow no deben alterar qué tarjeta considera centrada.
  const centerPenyaCard=useCallback((index:number,behavior:ScrollBehavior="auto")=>{
    const el=penyaCarouselRef.current;
    const card=el?.children[index] as HTMLElement|undefined;
    if(!el||!card)return;
    el.scrollTo({left:card.offsetLeft-(el.clientWidth-card.offsetWidth)/2,behavior});
  },[]);
  const handlePenyaCarouselScroll=(el:HTMLDivElement)=>{
    // No modificar scrollLeft ni el estado de React durante el movimiento:
    // así el navegador conserva la inercia nativa del gesto en móvil.
    if(!el.classList.contains("is-scrolling"))el.classList.add("is-scrolling");
    penyaCarouselScrollLeftRef.current=el.scrollLeft;
    if(penyaScrollEndTimerRef.current!==null)window.clearTimeout(penyaScrollEndTimerRef.current);
    penyaScrollEndTimerRef.current=window.setTimeout(()=>{
      penyaScrollEndTimerRef.current=null;
      handlePenyaCarouselScrollEnd();
    },280);
  };
  // Al terminar el gesto solo actualizamos qué tarjeta queda centrada.
  // No se recentra ni se anima nada por iniciativa del código.
  const handlePenyaCarouselScrollEnd=useCallback(()=>{
    if(penyaScrollEndTimerRef.current!==null){window.clearTimeout(penyaScrollEndTimerRef.current);penyaScrollEndTimerRef.current=null;}
    const el=penyaCarouselRef.current;
    if(!el)return;
    if(!penyaCardCentersRef.current.length||penyaCardCentersRef.current.length!==el.children.length)rebuildPenyaCardCenters();
    let nearest=nearestPenyaCardIndex(el);
    const count=carouselPenyes.length;
    if(!searchingPenyes&&count>1){
      const centers=penyaCardCentersRef.current;
      const cycleWidth=centers[count]!==undefined&&centers[0]!==undefined?centers[count]!-centers[0]!:0;
      if(cycleWidth>0){
        // El salto invisible entre copias se hace al terminar la inercia,
        // nunca durante el gesto, para no frenar el desplazamiento nativo.
        while(nearest<count*0.5){el.scrollLeft+=cycleWidth;nearest+=count;}
        while(nearest>=count*2.5){el.scrollLeft-=cycleWidth;nearest-=count;}
      }
    }
    el.classList.remove("is-scrolling");
    setActivePenyaCard(nearest);
    penyaCarouselScrollLeftRef.current=el.scrollLeft;
  },[rebuildPenyaCardCenters,nearestPenyaCardIndex,carouselPenyes.length,searchingPenyes]);
  useEffect(()=>{
    const el=penyaCarouselRef.current;
    if(currentPage!=="penyes"||!visiblePenyes.length){
      if(el)penyaCarouselScrollLeftRef.current=el.scrollLeft;
      setPenyaCarouselInitialized(false);
      return;
    }
    const signature=carouselPenyes.map(p=>String(p.id)).join("|")+"::"+(searchingPenyes?"filtered":"all");
    const sameDirectory=penyaCarouselSignatureRef.current===signature;
    const savedScrollLeft=sameDirectory?penyaCarouselScrollLeftRef.current:null;
    setPenyaCarouselInitialized(false);
    let secondFrame=0;
    const firstFrame=requestAnimationFrame(()=>{
      secondFrame=requestAnimationFrame(()=>{
        rebuildPenyaCardCenters();
        const carousel=penyaCarouselRef.current;
        if(savedScrollLeft!==null&&carousel){
          // Al volver de una ficha se conserva exactamente el desplazamiento
          // anterior; no se centra otra tarjeta ni se inicia ningún movimiento.
          carousel.scrollLeft=Math.max(0,Math.min(savedScrollLeft,carousel.scrollWidth-carousel.clientWidth));
          setActivePenyaCard(nearestPenyaCardIndex(carousel));
        }else{
          // Entrada inicial: Mayorales queda centrada en la copia central.
          const initialIndex=searchingPenyes?0:(carouselPenyes.length>1?carouselPenyes.length:0);
          setActivePenyaCard(initialIndex);
          centerPenyaCard(initialIndex,"auto");
        }
        if(carousel)penyaCarouselScrollLeftRef.current=carousel.scrollLeft;
        penyaCarouselSignatureRef.current=signature;
        setPenyaCarouselInitialized(true);
      });
    });
    return()=>{cancelAnimationFrame(firstFrame);if(secondFrame)cancelAnimationFrame(secondFrame);};
  },[currentPage,visiblePenyes.length,searchingPenyes,carouselPenyes,centerPenyaCard,rebuildPenyaCardCenters,nearestPenyaCardIndex]);
  useEffect(()=>{
    const el=penyaCarouselRef.current;
    if(!el||!penyaCarouselInitialized)return;
    const handleResize=()=>{
      const currentIndex=nearestPenyaCardIndex(el);
      rebuildPenyaCardCenters();
      requestAnimationFrame(()=>centerPenyaCard(currentIndex,"auto"));
    };
    const handleScrollEnd=()=>handlePenyaCarouselScrollEnd();
    window.addEventListener("resize",handleResize,{passive:true});
    el.addEventListener("scrollend",handleScrollEnd);
    return()=>{
      window.removeEventListener("resize",handleResize);
      el.removeEventListener("scrollend",handleScrollEnd);
    };
  },[penyaCarouselInitialized,centerPenyaCard,rebuildPenyaCardCenters,nearestPenyaCardIndex,handlePenyaCarouselScrollEnd]);
  useEffect(()=>()=>{if(penyaScrollEndTimerRef.current!==null)window.clearTimeout(penyaScrollEndTimerRef.current);},[]);
  const visibleNews = useMemo(()=>noticias.filter((n:any)=>n.publicado&&(!newsSearch.trim()||normalizarBusqueda([n.titulo,n.resumen,n.contenido,n.autor,n.fuente].join(" ")).includes(normalizarBusqueda(newsSearch)))).slice().sort((x:any,y:any)=>new Date(String(y.fecha||y.created_at||"").slice(0,10)+"T12:00:00").getTime()-new Date(String(x.fecha||x.created_at||"").slice(0,10)+"T12:00:00").getTime()),[noticias,newsSearch]);
  const featuredNews = visibleNews.filter((n:any)=>n.destacada);
  const regularNews = visibleNews.filter((n:any)=>!n.destacada);
  const proximasActividades = useMemo(() => [...actos.filter((a:any)=>!a._officialOnly).map((a:any)=>({...a,_origen:"programa"})), ...eventos.map((e:any)=>({...e,_origen:"penya"}))].filter((item:any)=>item.dia && eventoSigueActivo(item,now)).sort((a:any,b:any)=>new Date(String(a.dia).slice(0,10)+"T"+String(a.hora||"23:59")).getTime()-new Date(String(b.dia).slice(0,10)+"T"+String(b.hora||"23:59")).getTime()).slice(0,3),[actos,eventos,now]);
  const avisosNotificaciones = useMemo(() => avisos
    .filter((aviso:any)=>aviso.activo && (!aviso.publicar_en || new Date(aviso.publicar_en).getTime()<=now) && (!String(aviso.destinatario_email||"").trim() || String(aviso.destinatario_email).trim().toLowerCase()===String(accountUser?.email||"").trim().toLowerCase()))
    .sort((a:any,b:any)=>new Date(b.publicar_en||b.created_at||0).getTime()-new Date(a.publicar_en||a.created_at||0).getTime()), [avisos, now, accountUser?.email]);
  const unreadNotifications = useMemo(() => avisosNotificaciones.filter((aviso:any)=>!readNotificationIds.includes(String(aviso.id))), [avisosNotificaciones, readNotificationIds]);
  const avisosVisibles = useMemo(() => avisos.filter((aviso:any)=>aviso.activo && (!aviso.importante || personalPrefs.showImportantNotices) && (!aviso.publicar_en || new Date(aviso.publicar_en).getTime()<=now) && (!String(aviso.destinatario_email||"").trim() || String(aviso.destinatario_email).trim().toLowerCase()===String(accountUser?.email||"").trim().toLowerCase())), [avisos, personalPrefs.showImportantNotices, now, accountUser?.email]);
  const searchResults = useMemo(() => {
    const normalize = (value: any) => String(value || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const term = normalize(searchTerm.trim());
    if (term.length < 2) return [];
    const matches = (...values: any[]) => values.some((value) => normalize(value).includes(term));
    const results: any[] = [];
    penyes.filter((p) => matches(p.nombre, p.direccion)).forEach((p) => results.push({ key: "penya:" + p.id, label: p.nombre, kind: "Peña", sub: p.direccion || "Ficha de la peña", onSelect: () => { setCurrentPage("penyes"); setPenyaDetailFullscreen(true); setSelectedPenya(p); window.scrollTo({top:0,behavior:"smooth"}); } }));
    eventos.filter((e) => eventoSigueActivo(e,now) && matches(e.titulo, e.descripcion, e.lugar)).forEach((e) => results.push({ key: "evento:" + e.id, label: e.titulo, kind: "Evento de peña", sub: [e.dia, e.hora, e.lugar].filter(Boolean).join(" · "), onSelect: () => { setCurrentPage("eventos"); setFilterDay("all"); setFilterCategory("penyes"); window.scrollTo({top:0,behavior:"smooth"}); } }));
    actos.filter((a) => !a._officialOnly && eventoSigueActivo(a,now) && matches(a.titulo, a.descripcion, a.lugar)).forEach((a) => results.push({ key: "acto:" + a.id, label: a.titulo, kind: a.tipo === "actuacion" ? "Actuación" : "Programa oficial", sub: [a.dia, a.hora, a.lugar].filter(Boolean).join(" · "), onSelect: () => { const isAct = a.tipo === "actuacion" || /tardeo|mañaneo|mananeo|nocheo|festes? al carrer|fiestas? en la calle/i.test(a.titulo || ""); setCurrentPage("eventos"); if (!isAct) setDia(a.dia); setFilterDay("all"); setFilterCategory(isAct ? "actuaciones" : "all"); window.scrollTo({top:0,behavior:"smooth"}); } }));
    mapPoints.filter((p) => matches(p.nombre, p.descripcion)).forEach((p) => results.push({ key: "lugar:" + p.id, label: p.nombre, kind: "Ubicación", sub: p.descripcion || "Punto de interés", onSelect: () => { setCurrentPage("home"); setCat(null); setQ(""); setFocus(null); requestAnimationFrame(() => setFocus(p.id)); window.scrollTo({top:0,behavior:"smooth"}); } }));
    return results.slice(0, 12);
  }, [searchTerm, penyes, eventos, actos, mapPoints, now]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("festalfas-mis-penyes") || "[]");
      if (Array.isArray(saved)) setMisPenyes(saved.filter((id): id is string => typeof id === "string").slice(0,1));
    } catch { setMisPenyes([]); }
  }, []);
  useEffect(() => {
    let active = true;
    if (!accountUser?.id) {
      setPenyaMembership(null);
      setPenyaMembershipLoading(false);
      return;
    }
    const syncMembership = async () => {
      setPenyaMembershipLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("penya_miembros")
          .select("id,penya_id,user_id,display_name,avatar_url,joined_at,estado,solicitado_en,revisado_en")
          .eq("user_id", accountUser.id)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;
        const membership = data || null;
        setPenyaMembership(membership);
        setMisPenyes(membership?.estado === "aprobado" && membership?.penya_id ? [String(membership.penya_id)] : []);
        const params = new URLSearchParams(window.location.search);
        const linkedPenyaId = params.get("penya");
        const hasInvite = Boolean(params.get("invite"));
        if (!membership && (hasInvite || penyaPromptDismissedFor !== accountUser.id)) {
          if (linkedPenyaId && penyes.some((item) => String(item.id) === linkedPenyaId)) setAccountPenyaId(linkedPenyaId);
          setShowPenyaJoinDialog(true);
        }
      } catch {
        if (active) { setPenyaMembership(null); setMisPenyes([]); }
      } finally {
        if (active) setPenyaMembershipLoading(false);
      }
    };
    void syncMembership();
    return () => { active = false; };
  }, [accountUser?.id, penyes, penyaPromptDismissedFor]);
  useEffect(() => {
    let active = true;
    const managedIds = esAdminWeb
      ? penyes.map((p) => String(p.id))
      : penyaMembership?.estado === "aprobado" && penyaMembership?.penya_id
        ? [String(penyaMembership.penya_id)]
        : [];
    if (!accountUser?.id || !managedIds.length) { setPenyaMemberRoster([]); return; }
    (supabase as any).from("penya_miembros")
      .select("id,penya_id,user_id,display_name,avatar_url,joined_at,estado,solicitado_en")
      .in("penya_id", managedIds)
      .order("solicitado_en", { ascending: true })
      .then(({data,error}:any) => { if (active) setPenyaMemberRoster(error ? [] : (data || [])); });
    return () => { active = false; };
  }, [accountUser?.id, penyes, penyaMembership?.penya_id, penyaMembership?.estado, esAdminWeb]);
  const solicitarPenya = async (id: string, token: string | null = null) => {
    if (!accountUser?.id || !id) return;
    setAccountBusy(true); setAccountMessage("");
    try {
      const { data, error } = await (supabase as any).rpc("solicitar_pertenecer_penya", { p_penya_id: id, p_token: token });
      if (error) throw error;
      const { data: membership, error: membershipError } = await (supabase as any)
        .from("penya_miembros")
        .select("id,penya_id,user_id,display_name,avatar_url,joined_at,estado,solicitado_en,revisado_en")
        .eq("user_id", accountUser.id).maybeSingle();
      if (membershipError) throw membershipError;
      setPenyaMembership(membership || null);
      setMisPenyes(membership?.estado === "aprobado" ? [String(membership.penya_id)] : []);
      setShowPenyaJoinDialog(false);
      setInviteToken(null);
      setPenyaPromptDismissedFor(accountUser.id);
      setAccountMessage(data?.message || "Solicitud enviada para su aprobación.");
    } catch (error:any) {
      setAccountMessage(error?.message || "No se ha podido enviar la solicitud.");
    } finally { setAccountBusy(false); }
  };
  const revisarSolicitudPenya = async (membershipId: string, aprobar: boolean) => {
    setAccountBusy(true); setAccountMessage("");
    try {
      const { error } = await (supabase as any).rpc("revisar_solicitud_penya", { p_miembro_id: membershipId, p_aprobar: aprobar });
      if (error) throw error;
      const managedIds = esAdminWeb ? penyes.map((p) => String(p.id)) : [String(penyaMembership?.penya_id || "")].filter(Boolean);
      const { data, error: listError } = await (supabase as any).from("penya_miembros")
        .select("id,penya_id,user_id,display_name,avatar_url,joined_at,estado,solicitado_en")
        .in("penya_id", managedIds).order("solicitado_en", { ascending: true });
      if (listError) throw listError;
      setPenyaMemberRoster(data || []);
      setAccountMessage(aprobar ? "Miembro aprobado." : "Solicitud rechazada.");
    } catch (error:any) {
      setAccountMessage(error?.message || "No se ha podido revisar la solicitud.");
    } finally { setAccountBusy(false); }
  };
  const crearEnlaceInvitacion = async (id: string) => {
    setAccountBusy(true); setAccountMessage("");
    try {
      const { data, error } = await (supabase as any).rpc("crear_invitacion_penya", { p_penya_id: id });
      if (error) throw error;
      const link = window.location.origin + "/?penya=" + encodeURIComponent(id) + "&invite=" + encodeURIComponent(data.token);
      try { await navigator.clipboard.writeText(link); setAccountMessage("Enlace de invitación copiado. Caduca en 30 días."); }
      catch { window.prompt("Copia el enlace de invitación:", link); }
    } catch (error:any) {
      setAccountMessage(error?.message || "No se ha podido crear el enlace.");
    } finally { setAccountBusy(false); }
  };
  const toggleMiPenya = async (id: string) => {
    if (!accountUser?.id) { setAccountPenyaId(id); setShowPenyaJoinDialog(true); return; }
    if (penyaMembership?.penya_id === id) {
      const { error } = await (supabase as any).from("penya_miembros").delete().eq("user_id", accountUser.id);
      if (error) { window.alert(error.message); return; }
      setPenyaMembership(null); setMisPenyes([]);
      setAccountPenyaId(id); setShowPenyaJoinDialog(true);
      return;
    }
    if (penyaMembership?.penya_id && penyaMembership.penya_id !== id) {
      window.alert("Tu cuenta ya tiene una solicitud o pertenece a otra peña. Contacta con su administrador para cambiarla.");
      return;
    }
    setAccountPenyaId(id); setInviteToken(null); setShowPenyaJoinDialog(true);
  };
  useEffect(() => { if (dias.length && (!dia || !dias.includes(dia))) { const siguiente = dias.find((d) => d >= todayKey); setDia(dias.includes(todayKey) ? todayKey : siguiente || dias[dias.length - 1]); } }, [dias, dia, todayKey]);
  useEffect(() => {
    if (!mapFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMapFullscreen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [mapFullscreen]);
  useEffect(() => {
    if (!selectedPenya || !penyaDetailFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPenya(null);
        setPenyaDetailFullscreen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedPenya, penyaDetailFullscreen]);
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(tick);
  }, []);
  useEffect(() => {
    if (!shareReminder) return;
    const dismiss = window.setTimeout(() => {
      setShareReminder(false);
      localStorage.setItem("fiestas-share-reminder-last", String(Date.now()));
    }, 7000);
    return () => window.clearTimeout(dismiss);
  }, [shareReminder]);
  useEffect(() => {
    try { const cachedHero = localStorage.getItem("festalfas-hero-image"); if (cachedHero) setHeroImage(cachedHero); } catch { /* Se recupera la portada desde el contenido del sitio. */ }
  }, []);
  useEffect(() => {
    try { const key = "festalfas-notifications-read:" + String(accountUser?.email||"invitado").toLowerCase(); const saved = JSON.parse(localStorage.getItem(key)||"[]"); setReadNotificationIds(Array.isArray(saved)?saved.map(String):[]); } catch { setReadNotificationIds([]); }
  }, [accountUser?.email]);
  const markNotificationRead = (id:string) => setReadNotificationIds(current => { const next=[...new Set([...current,id])]; try { localStorage.setItem("festalfas-notifications-read:"+String(accountUser?.email||"invitado").toLowerCase(),JSON.stringify(next)); } catch { /* Estado en memoria. */ } return next; });
  useEffect(() => {
    const key = "festalfas-notifications-read:" + String(accountUser?.email||"invitado").toLowerCase();
    const syncReadState = (event: StorageEvent) => {
      if (event.key !== key) return;
      try {
        const parsed = JSON.parse(event.newValue || "[]");
        setReadNotificationIds(Array.isArray(parsed) ? parsed.map(String) : []);
      } catch { setReadNotificationIds([]); }
    };
    window.addEventListener("storage", syncReadState);
    return () => window.removeEventListener("storage", syncReadState);
  }, [accountUser?.email]);
  const markAllNotificationsRead = () => setReadNotificationIds(current => { const next=[...new Set([...current,...avisosNotificaciones.map((item:any)=>String(item.id))])]; try { localStorage.setItem("festalfas-notifications-read:"+String(accountUser?.email||"invitado").toLowerCase(),JSON.stringify(next)); } catch { /* Estado en memoria. */ } return next; });
  useEffect(() => {
    const key = "fiestas-share-reminder-last";
    const shouldShow = () => {
      const last = Number(safeLocalStorageGet(key) || 0);
      if (Date.now() - last >= 30 * 60 * 1000) setShareReminder(true);
    };
    const first = window.setTimeout(shouldShow, 90_000);
    const repeat = window.setInterval(shouldShow, 5 * 60 * 1000);
    return () => { window.clearTimeout(first); window.clearInterval(repeat); };
  }, []);

  const cargar = useCallback(async () => {
    const [penyaResult, { data: actosData }, { data: eventosData }, { data: contentData }, { data: penyaPhotosData }] = await Promise.all([
      supabase.from("penyes").select("id,nombre,direccion,lat,lng,foto_url,tipo_musica,tiene_evento,instagram,informacion,estado,miembros_actuales").eq("estado","aprobada").order("nombre"),
      supabase.from("actos").select("*").eq("publicado",true).order("dia").order("hora"),
      supabase.from("eventos").select("*").eq("publicado",true).order("dia").order("hora"),
      supabase.from("site_content").select("clave,valor"),
      supabase.from("penya_fotos").select("id,penya_id,url,destacada,visible"),
    ]);
    let data: any[] | null = penyaResult.data as any[] | null;
    if (penyaResult.error) {
      const legacyPenyes = await supabase.from("penyes").select("id,nombre,direccion,lat,lng,foto_url,tipo_musica,tiene_evento,informacion,estado").eq("estado","aprobada").order("nombre");
      data = legacyPenyes.data?.map((p) => ({ ...p, instagram: "" })) ?? null;
    }
    const filas = actosData ?? [];
    // Los actos guardados se conservan en la base de datos. El programa de 2026
    // queda disponible en el archivo histórico y no se mezcla con la edición futura.
    setActos(filas);
    setEventos(eventosData ?? []);
    const content = Object.fromEntries((contentData ?? []).map((x:any)=>[x.clave,x.valor]));
    setSiteContent(content);
    let memberCountSettings:Record<string,number|null>={};
    try { const parsed=JSON.parse(content["penyes_miembros_actuales_json"]||"{}"); if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed))memberCountSettings=parsed; } catch { memberCountSettings={}; }
    let catalogoPenyesOcultas:string[]=[];
    try { const ids=JSON.parse(content["penyas_catalogo_oculto_json"]||"[]"); if(Array.isArray(ids)) catalogoPenyesOcultas=ids.map((id:any)=>String(id)); } catch { catalogoPenyesOcultas=[]; }
    try { const parsed=JSON.parse(content["avisos_json"]||"[]"); setAvisos(Array.isArray(parsed)?parsed:[]); } catch { setAvisos([]); }
    let noticiasAutomaticas: any[] = [];
    try {
      const response = await fetch("/noticias-automaticas.json", { cache: "no-store" });
      if (response.ok) {
        const parsed = await response.json();
        if (Array.isArray(parsed)) noticiasAutomaticas = parsed;
      }
    } catch { /* La web sigue mostrando las noticias guardadas si el archivo automático no está disponible. */ }
    let idsDestacadas: string[] = [];
    try { const ids = JSON.parse(content["noticias_destacadas_json"] || "[]"); if (Array.isArray(ids)) idsDestacadas = ids.map((id:any) => String(id)); } catch { idsDestacadas = []; }
    let guardadas: any[] = [];
    try { const parsed=JSON.parse(content["noticias_json"]||"[]"); guardadas=Array.isArray(parsed)?parsed:[]; } catch { guardadas=[]; }
    const respaldo=[noticiaCestaNavidad2027,noticiaCuBaTa2027,noticiaDesfileHumor2026];
    const guardadasSinVersionAntigua=guardadas.filter((noticia:any)=>noticia?.id!=="desfile-humor-lalfas-2026-video");
    let noticiasOcultas:string[]=[];
    try { const ocultas=JSON.parse(content["noticias_ocultas_json"]||"[]"); noticiasOcultas=Array.isArray(ocultas)?ocultas.map((id:any)=>String(id)):[]; } catch { noticiasOcultas=[]; }
    const combinadas=[...guardadasSinVersionAntigua,...noticiasAutomaticas,...respaldo];
    const unicas=combinadas.filter((noticia:any,index:number,array:any[])=>noticia?.id&&array.findIndex((otra:any)=>String(otra.id)===String(noticia.id))===index&&!noticiasOcultas.includes(String(noticia.id)));
    setNoticias(unicas.filter(esNoticiaFestivaLocal).map((noticia:any)=>({...noticia,destacada:idsDestacadas.includes(String(noticia.id))})));
    try {
      const points=JSON.parse(content["mapa_puntos_json"]||"[]");
      const cleanPoints=Array.isArray(points)?points.filter((p:any)=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))&&Number(p.lat)>=-90&&Number(p.lat)<=90&&Number(p.lng)>=-180&&Number(p.lng)<=180):[];
      setMapPoints(cleanPoints);
      try { localStorage.setItem("festalfas-map-points-cache", JSON.stringify(cleanPoints)); } catch { /* Caché opcional. */ }
    } catch { setMapPoints([]); }
    if (content["hero_image_path"]) {
      const heroUrl = content["hero_image_path"].startsWith("http") ? content["hero_image_path"] : supabase.storage.from("penyes").getPublicUrl(content["hero_image_path"]).data.publicUrl;
      setHeroImage(heroUrl);
      try { localStorage.setItem("festalfas-hero-image", heroUrl); } catch { /* La portada sigue disponible desde el servidor. */ }
    } else {
      setHeroImage("");
      try { localStorage.removeItem("festalfas-hero-image"); } catch { /* Sin caché local. */ }
    }
    // Normaliza primero las filas existentes. Nunca se sustituyen ni se editan:
    // el catálogo histórico solo añade nombres que no estén ya registrados.
    const penyesExistentes = (data ?? [])
      .filter((p:any) => p && p.id != null && String(p.nombre ?? "").trim().length > 0 && (!p.estado || p.estado === "aprobada"))
      .map((p:any) => {
        const fotoUrl = typeof p.foto_url === "string" ? p.foto_url.trim() : "";
        const foto = fotoUrl ? (fotoUrl.startsWith("http") ? fotoUrl : supabase.storage.from("penyes").getPublicUrl(fotoUrl).data.publicUrl) : "";
        const catalogoOriginal=catalogoPenyesHistorico.find((item)=>claveCatalogoPenya(item.nombre)===claveCatalogoPenya(p.nombre));const memberCount=Object.prototype.hasOwnProperty.call(memberCountSettings,String(p.id))?memberCountSettings[String(p.id)]:p.miembros_actuales??null;return { ...p, id: String(p.id), nombre: String(p.nombre).trim(), foto, direccion: p.direccion ?? "", tipo_musica: p.tipo_musica ?? "Variada", instagram: p.instagram ?? "", informacion: p.informacion ?? "", miembros_actuales: memberCount, asociada: catalogoOriginal?.asociada ?? true, color: catalogoOriginal?.color };
      });
    const nombresExistentes = new Set(penyesExistentes.map((p:any) => claveCatalogoPenya(p.nombre)));
    const penyesCatalogo = catalogoPenyesHistorico
      .filter((p) => !catalogoPenyesOcultas.includes(p.id) && !nombresExistentes.has(claveCatalogoPenya(p.nombre)))
      .map((p) => ({ id: p.id, nombre: p.nombre, direccion: null, lat: null, lng: null, foto: "", tipo_musica: "Variada", informacion: p.informacion, asociada: p.asociada, color: p.color }));
    const cleanPenyes = [...penyesExistentes, ...penyesCatalogo];
    setPenyes(cleanPenyes);
    setPenyaPhotos(penyaPhotosData ?? []);
    try { localStorage.setItem("festalfas-penyes-cache", JSON.stringify(cleanPenyes)); } catch { /* Caché opcional. */ }
  }, []);
  useEffect(() => {
    try {
      const cachedPoints = JSON.parse(localStorage.getItem("festalfas-map-points-cache") || "[]");
      if (Array.isArray(cachedPoints)) setMapPoints(cachedPoints);
      const cachedPenyes = JSON.parse(localStorage.getItem("festalfas-penyes-cache") || "[]");
      if (Array.isArray(cachedPenyes)) setPenyes(cachedPenyes);
    } catch { /* Se cargarán los datos actuales del servidor. */ }
    void cargar();
  }, [cargar]);
  // Mantiene el directorio sincronizado cuando una solicitud pasa de pendiente
  // a aprobada desde /admin o cuando se modifica una ficha en otra pestaña.
  useEffect(() => {
    const channel = supabase
      .channel("public-penyes-directory")
      .on("postgres_changes", { event: "*", schema: "public", table: "penyes" }, () => { void cargar(); })
      .subscribe();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void cargar();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [cargar]);
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const user = data.session?.user ?? null;
      setAccountUser(user);
      if (user) {
        try { localStorage.removeItem("penyera-access-mode"); } catch { /* La sesión autenticada sigue disponible. */ }
        setGuestMode(false);
      } else {
        try { setGuestMode(localStorage.getItem("penyera-access-mode") === "guest"); } catch { setGuestMode(false); }
      }
      setAuthReady(true);
      const saved = user?.user_metadata?.["festalfas_preferences"];
      try {
        const local = JSON.parse(localStorage.getItem("festalfas-personal-preferences") || "{}");
        setPersonalPrefs({ showImportantNotices: saved?.showImportantNotices ?? local.showImportantNotices ?? true, reduceMotion: saved?.reduceMotion ?? local.reduceMotion ?? false, largeText: saved?.largeText ?? local.largeText ?? false, highContrast: saved?.highContrast ?? local.highContrast ?? false });
      } catch { setPersonalPrefs({ showImportantNotices: saved?.showImportantNotices ?? true, reduceMotion: saved?.reduceMotion ?? false, largeText: saved?.largeText ?? false, highContrast: saved?.highContrast ?? false }); }
    }).catch(() => { if (active) setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const user = session?.user ?? null;
      if (user) {
        setAccountUser(user);
        setGuestMode(false);
        try { localStorage.removeItem("penyera-access-mode"); } catch { /* La sesión autenticada sigue disponible. */ }
        setAuthReady(true);
      } else if (event === "SIGNED_OUT") {
        setAccountUser(null);
        setGuestMode(false);
        try { localStorage.removeItem("penyera-access-mode"); } catch { /* El acceso vuelve a mostrarse al cerrar sesión. */ }
        setAuthReady(true);
      }
      const saved = user?.user_metadata?.["festalfas_preferences"];
      if (saved) setPersonalPrefs({ showImportantNotices: saved.showImportantNotices !== false, reduceMotion: saved.reduceMotion === true, largeText: saved.largeText === true, highContrast: saved.highContrast === true });
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    const goHome = () => setCurrentPage("home");
    window.addEventListener("penyera:go-home", goHome);
    return () => window.removeEventListener("penyera:go-home", goHome);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("festalfas-reduce-motion", personalPrefs.reduceMotion);
    document.documentElement.classList.toggle("festalfas-large-text", personalPrefs.largeText);
    document.documentElement.classList.toggle("festalfas-high-contrast", personalPrefs.highContrast);
    try { localStorage.setItem("festalfas-personal-preferences", JSON.stringify(personalPrefs)); } catch { /* Preferencias activas en esta sesión. */ }
  }, [personalPrefs]);
  useEffect(() => {
    const openPenyaFromHash = () => {
      const match = window.location.hash.match(/^#penya-(.+)$/);
      if (!match?.[1]) return;
      const id = decodeURIComponent(match[1]);
      const found = penyes.find((item) => item.id === id);
      if (found) {
        setCurrentPage("penyes");
        setPenyaDetailFullscreen(true);
        setSelectedPenya(found);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    openPenyaFromHash();
    window.addEventListener("hashchange", openPenyaFromHash);
    return () => window.removeEventListener("hashchange", openPenyaFromHash);
  }, [penyes]);
  useEffect(() => {
    if (!noticias.length || typeof window === "undefined") return;
    const openFromHash = () => {
      const match = window.location.hash.match(/^#noticia=(.+)$/);
      const rawId = match?.[1];
      if (!rawId) return;
      const id = decodeURIComponent(rawId);
      const found = noticias.find((item:any) => String(item.id) === id);
      if (found) { setCurrentPage("noticias"); setNoticiaSeleccionada(found); }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [noticias]);

  useEffect(() => { setAccountPenyaId(String(accountUser?.user_metadata?.penya_id || "")); }, [accountUser?.id, accountUser?.user_metadata?.penya_id]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedPenyaId = params.get("penya");
    const token = params.get("invite");
    if (linkedPenyaId && penyes.some((item) => String(item.id) === linkedPenyaId)) {
      setAccountPenyaId(linkedPenyaId);
      setInviteToken(token);
      if (accountUser?.id) setShowPenyaJoinDialog(true);
    }
  }, [accountUser?.id, penyes]);
  const handleAccountSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setAccountBusy(true); setAccountMessage("");
    try {
      if (accountMode === "register") {
        if (accountPassword.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
        const selectedPenya = penyes.find(item => item.id === accountPenyaId);
        const { data, error } = await supabase.auth.signUp({ email: accountEmail.trim(), password: accountPassword, options: { data: { full_name: accountName.trim(), penya_id: accountPenyaId || null, penya_nombre: selectedPenya?.nombre || null, penya_ids: accountPenyaId ? [accountPenyaId] : [] } } });
        if (error) throw error;
        setAccountMessage(data.session ? "¡Cuenta creada! Ya has iniciado sesión." : "Registro iniciado. Revisa tu correo para confirmar la cuenta antes de entrar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: accountEmail.trim(), password: accountPassword });
        if (error) throw error;
        setAccountMessage("Sesión iniciada correctamente.");
      }
      setAccountPassword("");
    } catch (error) { setAccountMessage(error instanceof Error ? error.message : "No se ha podido completar la operación."); }
    finally { setAccountBusy(false); }
  };
  const saveAccountPenya = async () => {
    if (!accountUser) return;
    if (!accountPenyaId) {
      if (penyaMembership?.id) {
        const { error } = await (supabase as any).from("penya_miembros").delete().eq("user_id", accountUser.id);
        if (error) { setAccountMessage(error.message); return; }
      }
      setPenyaMembership(null); setMisPenyes([]);
      setAccountMessage("Has indicado que no perteneces a ninguna peña.");
      return;
    }
    await solicitarPenya(accountPenyaId, inviteToken);
  };
  const submitFeedback = async (event:React.FormEvent) => {
    event.preventDefault();setFeedbackBusy(true);setFeedbackMessage("");
    try { const {error}=await supabase.from("site_feedback").insert({tipo:feedbackType,titulo:feedbackTitle.trim(),descripcion:feedbackDescription.trim(),email:feedbackEmail.trim()||null,pagina:window.location.href,estado:"pendiente"}); if(error)throw error; setFeedbackTitle("");setFeedbackDescription("");setFeedbackEmail("");setFeedbackMessage("Gracias. Tu comentario se ha enviado y aparecerá en el panel de administración para revisarlo."); }
    catch(error) {setFeedbackMessage(error instanceof Error?error.message:"No se ha podido enviar. Inténtalo de nuevo más tarde.");}
    finally{setFeedbackBusy(false);}
  };
  const savePersonalPreferences = async () => {
    setAccountBusy(true); setAccountMessage("");
    try {
      if (accountUser) {
        const { error } = await supabase.auth.updateUser({ data: { festalfas_preferences: personalPrefs } });
        if (error) throw error;
      }
      localStorage.setItem("festalfas-personal-preferences", JSON.stringify(personalPrefs));
      setAccountMessage("Tus ajustes personales se han guardado.");
    } catch (error) { setAccountMessage(error instanceof Error ? error.message : "No se han podido guardar los ajustes."); }
    finally { setAccountBusy(false); }
  };
  const todos: Lugar[] = useMemo(() => [
    ...lugaresFijos,
    ...mapPoints,
    ...penyes.filter((p) => p.lat != null && p.lng != null).map((p) => ({ id: p.id, categoria: "penya" as const, nombre: p.nombre, descripcion: p.direccion ?? "", lat: Number(p.lat), lng: Number(p.lng), foto: p.foto, fotoZoom: penyaProfileLogoSettings[p.id]?.zoom ?? 100, fotoX: penyaProfileLogoSettings[p.id]?.x ?? 50, fotoY: penyaProfileLogoSettings[p.id]?.y ?? 50, esMayorales: String(p.id) === String(mayoralesPenyaId) })),
    ...actos.filter((a) => a.lat != null && a.lng != null && eventoSigueActivo(a,now)).map((a) => ({ id: "acto-" + a.id, categoria: a.tipo as Categoria, nombre: a.titulo, descripcion: a.descripcion || a.lugar || "", lat: Number(a.lat), lng: Number(a.lng), dia:a.dia, hora:a.hora, detalleId:"acto-"+a.id })),
    ...eventosActivos.filter((e) => e.lat != null && e.lng != null).map((e) => ({ id: "evento-" + e.id, categoria: "evento" as const, nombre: e.titulo, descripcion: e.descripcion || e.lugar || "", lat: Number(e.lat), lng: Number(e.lng), dia:e.dia, hora:e.hora, detalleId:"evento-"+e.id })),
  ], [penyes, actos, eventosActivos, mapPoints, now, penyaProfileLogoSettings, mayoralesPenyaId]);

  const visibles = useMemo(() => todos.filter((l) => (!cat || l.categoria === cat) && l.nombre.toLowerCase().includes(q.toLowerCase())), [todos, cat, q]);

  const selectedPenyaEvents = selectedPenya ? eventos.filter((e) => eventoSigueActivo(e, now) && (e.penya_id === selectedPenya.id || [e.titulo, e.descripcion, e.lugar].some((v) => normalizarBusqueda(v).includes(normalizarBusqueda(selectedPenya.nombre))))) : [];
  const selectedPenyaActs = selectedPenya ? actos.filter((a) => eventoSigueActivo(a, now) && [a.titulo, a.descripcion, a.lugar].some((v) => normalizarBusqueda(v).includes(normalizarBusqueda(selectedPenya.nombre)))) : [];
  const selectedPenyaNews = selectedPenya ? noticias.filter((n:any) => n.publicado && (n.penya_id === selectedPenya.id || normalizarBusqueda([n.penya_nombre, n.autor].join(" ")).includes(normalizarBusqueda(selectedPenya.nombre)))).slice().sort((a:any,b:any) => String(b.fecha||b.created_at||"").localeCompare(String(a.fecha||a.created_at||""))).slice(0,3) : [];
  const selectedPenyaCustomBlocks = (() => { try { const all=JSON.parse(siteContent["penyes_perfiles_json"]||"{}"); const blocks=all?.[selectedPenya?.id||""]; return Array.isArray(blocks)?blocks.filter((block:any)=>block&&typeof block==="object"):[]; } catch { return []; } })();
  const selectedPenyaAcceptsVisits = (() => { try { const settings=JSON.parse(siteContent["penyes_visitas_json"]||"{}"); return settings?.[selectedPenya?.id||""]===true; } catch { return false; } })();
  const selectedPenyaAwards: PenyaAward[] = (() => { try { const parsed=JSON.parse(siteContent["penyes_premios_json"]||"[]"); const omitted=JSON.parse(siteContent["penyes_premios_omitidos_json"]||"[]"); const all=mergeSeededPenyaAwards(Array.isArray(parsed)?parsed:[],penyes,Array.isArray(omitted)?omitted.map(String):[]); return all.filter(a=>penyaAwardBelongsTo(a,selectedPenya)); } catch { return []; } })();
  const selectedPenyaBannerBlock = selectedPenyaCustomBlocks.find((block:any)=>block.type==="banner");
  const selectedPenyaBannerGradient = `linear-gradient(110deg, ${/^#[0-9a-fA-F]{6}$/.test(selectedPenyaBannerBlock?.colorStart||"")?selectedPenyaBannerBlock.colorStart:"#173f52"} 0%, color-mix(in srgb, ${/^#[0-9a-fA-F]{6}$/.test(selectedPenyaBannerBlock?.colorStart||"")?selectedPenyaBannerBlock.colorStart:"#173f52"} 78%, ${/^#[0-9a-fA-F]{6}$/.test(selectedPenyaBannerBlock?.colorEnd||"")?selectedPenyaBannerBlock.colorEnd:"#c6a24b"}) 24%, color-mix(in srgb, ${/^#[0-9a-fA-F]{6}$/.test(selectedPenyaBannerBlock?.colorStart||"")?selectedPenyaBannerBlock.colorStart:"#173f52"} 48%, ${/^#[0-9a-fA-F]{6}$/.test(selectedPenyaBannerBlock?.colorEnd||"")?selectedPenyaBannerBlock.colorEnd:"#c6a24b"}) 50%, color-mix(in srgb, ${/^#[0-9a-fA-F]{6}$/.test(selectedPenyaBannerBlock?.colorStart||"")?selectedPenyaBannerBlock.colorStart:"#173f52"} 18%, ${/^#[0-9a-fA-F]{6}$/.test(selectedPenyaBannerBlock?.colorEnd||"")?selectedPenyaBannerBlock.colorEnd:"#c6a24b"}) 76%, ${/^#[0-9a-fA-F]{6}$/.test(selectedPenyaBannerBlock?.colorEnd||"")?selectedPenyaBannerBlock.colorEnd:"#c6a24b"} 100%)`;
  const selectedPenyaPhotoBlocks = (() => { const legacy=selectedPenyaCustomBlocks.filter((block:any)=>block.type==="photo" && typeof block.url==="string" && /^https?:\/\//i.test(block.url)); const merged=new Map<string,any>(legacy.map((block:any)=>[block.url,{...block,visible:block.visible!==false}])); penyaPhotos.filter((photo:any)=>photo.penya_id===selectedPenya?.id).forEach((photo:any)=>{const previous=merged.get(photo.url)||{type:"photo",title:"Fotografía",content:"",url:photo.url};merged.set(photo.url,{...previous,id:photo.id,featured:photo.destacada===true,visible:photo.visible!==false,url:photo.url});});return [...merged.values()].filter((block:any)=>block.visible!==false); })();
  const selectedPenyaLogoBlocks = selectedPenyaCustomBlocks.filter((block:any)=>block.type==="logo" && typeof block.url==="string" && /^https?:\/\//i.test(block.url));
  const selectedPenyaGallery = selectedPenya ? [...new Set([
    ...selectedPenyaPhotoBlocks.filter((block:any)=>block.featured===true).slice(0,3).map((block:any)=>block.url),
    ...selectedPenyaPhotoBlocks.filter((block:any)=>block.featured!==true).map((block:any)=>block.url),
    ...selectedPenyaLogoBlocks.map((block:any)=>block.url),
    ...selectedPenyaEvents.map((e:any) => e.imagen_url || e.imagen || e.foto_url || e.foto),
    ...selectedPenyaActs.map((a:any) => a.imagen_url || a.imagen || a.foto_url || a.foto)
  ].filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url) && (url !== selectedPenyaFoto || selectedPenyaLogoBlocks.some((block:any)=>block.url===url)) ))] : [];
  const selectedPenyaFeaturedGallery = selectedPenyaPhotoBlocks.filter((block:any)=>block.featured===true).slice(0,3).map((block:any)=>block.url);
  const selectedPenyaPhotoStyle=(url:string)=>{const block=selectedPenyaPhotoBlocks.find((item:any)=>item.url===url);const isLogo=selectedPenyaLogoBlocks.some((item:any)=>item.url===url);return {objectPosition:(block?.positionX??50)+"% "+(block?.positionY??50)+"%",objectFit:isLogo?"contain" as const:"cover" as const,backgroundColor:isLogo?"#ffffff":"#edf3f1",transform:"scale("+((block?.zoom??100)/100)+")",transformOrigin:(block?.positionX??50)+"% "+(block?.positionY??50)+"%"};};
  // Las noticias automáticas solo pueden usar la lista creada por el extractor de galerías.
  // No se aceptan los campos heredados "galeria"/"imagenes", que podían contener logos del sitio.
  const noticiaImagenes: string[] = (() => {
    if (!noticiaSeleccionada) return [];
    const fuentes: unknown[] = noticiaSeleccionada.automatico
      ? (Array.isArray(noticiaSeleccionada.imagenes_url) ? noticiaSeleccionada.imagenes_url : [])
      : [...(Array.isArray(noticiaSeleccionada.galeria) ? noticiaSeleccionada.galeria : []), ...(Array.isArray(noticiaSeleccionada.imagenes) ? noticiaSeleccionada.imagenes : []), ...(Array.isArray(noticiaSeleccionada.imagenes_url) ? noticiaSeleccionada.imagenes_url : [])];
    const vistas = new Set<string>();
    for (const media of fuentes) {
      const bruta = typeof media === "string" ? media : (media as { url?: unknown; src?: unknown; imagen_url?: unknown } | null)?.url
        || (media as { src?: unknown } | null)?.src
        || (media as { imagen_url?: unknown } | null)?.imagen_url;
      if (typeof bruta !== "string") continue;
      if (!/^https?:\/\//i.test(bruta)) continue;
      if (bruta === noticiaSeleccionada.imagen_url) continue;
      if (/(?:union[-_ ]?europea|european[-_ ]?union|sede[-_ ]?electr[oó]nica|sede[-_ ]?electronica|logo(?:type)?|logotipo|favicon|icon(?:o)?|sprite|banner|accesibilidad|accessibility|cabecera|header|footer|menu)/i.test(bruta)) continue;
      vistas.add(bruta);
    }
    return [...vistas];
  })();

  useEffect(() => {
    if (penyaFotoAmpliada === null || !selectedPenyaGallery.length) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setPenyaFotoAmpliada(null); setPenyaFotoZoom(1); }
      if (event.key === "ArrowRight") { setPenyaFotoZoom(1); setPenyaFotoAmpliada(current => current === null ? null : (current + 1) % selectedPenyaGallery.length); }
      if (event.key === "ArrowLeft") { setPenyaFotoZoom(1); setPenyaFotoAmpliada(current => current === null ? null : (current - 1 + selectedPenyaGallery.length) % selectedPenyaGallery.length); }
    };
    window.addEventListener("keydown",handleKey);
    return ()=>window.removeEventListener("keydown",handleKey);
  },[penyaFotoAmpliada,selectedPenyaGallery.length]);
  useEffect(() => {
    if (fotoAmpliada === null || noticiaImagenes.length === 0) return;
    const galleryLength = noticiaImagenes.length;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFotoAmpliada(null);
      if (event.key === "ArrowRight") setFotoAmpliada(current => current === null ? null : (current + 1) % galleryLength);
      if (event.key === "ArrowLeft") setFotoAmpliada(current => current === null ? null : (current - 1 + galleryLength) % galleryLength);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fotoAmpliada, noticiaSeleccionada, noticiaImagenes.length]);
  const featuredPhotoEditorModal = managingPenyaPhotos ? <div className="fixed inset-0 z-[2147483100] festalfas-modal-backdrop flex items-start justify-center overflow-y-auto p-3 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6"><section className="my-auto w-full max-w-4xl rounded-3xl bg-background p-4 shadow-2xl sm:p-6"><Suspense fallback={<div className="min-h-48 animate-pulse rounded-2xl bg-muted" />}><PenyaPhotoManager penya={managingPenyaPhotos} onCancel={()=>setManagingPenyaPhotos(null)} onSaved={()=>{void (async()=>{const {data}=await supabase.from("site_content").select("clave,valor");setSiteContent(Object.fromEntries((data||[]).map((x:any)=>[x.clave,x.valor])));await cargar();})();}}/></Suspense></section></div> : null;
  const penyaProfileEditorModal = editingPenyaProfile ? <div className="fixed inset-0 z-[2147483101] festalfas-modal-backdrop flex items-start justify-center overflow-y-auto p-3 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6"><section className="my-auto w-full max-w-4xl rounded-3xl bg-background p-4 shadow-2xl sm:p-6"><Suspense fallback={<div className="min-h-48 animate-pulse rounded-2xl bg-muted" />}><AdminPenyaEditor penya={editingPenyaProfile} onCancel={()=>setEditingPenyaProfile(null)} onSaved={()=>{setEditingPenyaProfile(null);void (async()=>{const {data}=await supabase.from("site_content").select("clave,valor");setSiteContent(Object.fromEntries((data||[]).map((x:any)=>[x.clave,x.valor])));await cargar();})();}}/></Suspense></section></div> : null;
  const renderNewsCard = (n:any) => <button type="button" key={n.id} onClick={()=>{setNoticiaSeleccionada(n);window.scrollTo({top:0,behavior:"smooth"});}} className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
    {n.tipo!=="video"&&n.imagen_url&&<div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden"><img src={n.imagen_url} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]"/></div>}
    <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
      <div className="mb-2 flex min-h-6 flex-wrap items-center gap-2">{n.destacada&&<span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-900">Destacada</span>}<span className={"inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider "+(esNoticiaMayorales(n)?"bg-amber-100 text-amber-900":n.tipo==="video"?"bg-rose-100 text-rose-900":n.tipo==="externa"?"bg-slate-100 text-slate-700":n.tipo==="oficial"?"bg-sky-100 text-sky-900":"bg-primary/10 text-primary")}>{esNoticiaMayorales(n)?"Mayorales 2027":n.tipo==="video"?"Vídeo":n.tipo==="externa"?(n.fuente||"Medio externo"):n.tipo==="oficial"?"Información oficial":"Peñas"}</span>{(n.video_url||(n.galeria||[]).length>0||(n.imagenes_url||[]).length>0)&&<span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{n.video_url?"Vídeo":"Galería"}</span>}</div>
      <p className="text-xs font-medium text-muted-foreground">{new Date(n.fecha||n.created_at||Date.now()).toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})}</p>
      <h2 className="mt-2 break-words text-base font-bold leading-tight text-foreground transition group-hover:text-primary sm:text-lg">{n.titulo}</h2>
      {limpiarTextoNoticia(n.resumen)&&<p className="mt-2 line-clamp-4 break-words text-[0.82rem] leading-relaxed text-muted-foreground sm:text-sm">{limpiarTextoNoticia(n.resumen)}</p>}
      <span className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-bold text-primary">{n.tipo==="video"?"Ver vídeo y noticia":"Leer noticia"} <span aria-hidden="true">→</span></span>
    </div>
  </button>;

  const renderFeaturedNewsCard = (n:any) => <button type="button" key={n.id} onClick={()=>{setNoticiaSeleccionada(n);window.scrollTo({top:0,behavior:"smooth"});}} className="group grid w-full min-w-0 grid-cols-1 overflow-hidden rounded-3xl border-2 border-primary/20 bg-card text-left shadow-md transition duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
    {(n.imagen_url||videoCover(n.video_url))&&<div className="relative min-h-52 overflow-hidden bg-muted md:min-h-[280px]"><img src={n.imagen_url||videoCover(n.video_url)} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full min-h-52 w-full object-cover transition duration-500 group-hover:scale-[1.025] md:min-h-[280px]"/></div>}
    <div className="flex min-w-0 flex-col justify-center p-5 sm:p-7 md:p-9">
      <div className="mb-3 flex flex-wrap items-center gap-2"><span className="inline-flex rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-900">★ Noticia destacada</span><span className={"inline-flex rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider "+(esNoticiaMayorales(n)?"bg-amber-100 text-amber-900":n.tipo==="video"?"bg-rose-100 text-rose-900":n.tipo==="externa"?"bg-slate-100 text-slate-700":n.tipo==="oficial"?"bg-sky-100 text-sky-900":"bg-primary/10 text-primary")}>{esNoticiaMayorales(n)?"Mayorales 2027":n.tipo==="video"?"Vídeo":n.tipo==="externa"?(n.fuente||"Medio externo"):n.tipo==="oficial"?"Información oficial":"Peñas"}</span></div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{new Date(n.fecha||n.created_at||Date.now()).toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})}</p>
      <h3 className="mt-3 text-xl font-extrabold leading-tight text-primary transition group-hover:text-secondary sm:text-2xl lg:text-3xl">{n.titulo}</h3>
      {limpiarTextoNoticia(n.resumen)&&<p className="mt-3 line-clamp-5 text-sm leading-relaxed text-muted-foreground sm:text-base lg:text-lg">{limpiarTextoNoticia(n.resumen)}</p>}
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-primary sm:text-base">{n.tipo==="video"?"Ver vídeo y noticia":"Leer noticia completa"} <span aria-hidden="true">→</span></span>
    </div>
  </button>;

  const goMap = (id?: string) => {
    if (!id) return;
    setCurrentPage("home");
    const mapCategory:Categoria|null=id.startsWith("evento-")?"evento":id.startsWith("acto-")?(actos.find((item:any)=>"acto-"+item.id===id)?.tipo??null):"penya";
    setCat(mapCategory);
    setQ("");
    setFocus(null);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById("mapa")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setFocus(id);
    }));
  };
  const closePenyaDetail = () => {
    setSelectedPenya(null);
    setPenyaDetailFullscreen(false);
    const savedScrollLeft=penyaCarouselScrollLeftRef.current;
    requestAnimationFrame(()=>{
      const carousel=penyaCarouselRef.current;
      if(carousel&&savedScrollLeft!==null)carousel.scrollLeft=savedScrollLeft;
    });
  };

  return (
    <div className="page-bg relative min-h-screen" style={{ "--pink": mayoralesPrimaryColor, "--primary": mayoralesPrimaryColor, "--secondary": mayoralesPrimaryColor, "--accent": mayoralesPrimaryColor, "--ring": mayoralesPrimaryColor, "--cat-penya": mayoralesPrimaryColor, "--mayorales-accent": mayoralesColor, "--background": siteContent["theme_background"] || "oklch(0.975 0.012 90)", "--gradient-page": `linear-gradient(180deg, ${siteContent["theme_background"] || "oklch(0.985 0.008 90)"}, ${siteContent["theme_background"] || "oklch(0.965 0.014 90)"})` } as React.CSSProperties}>
      {!authReady && <div className="fixed inset-0 z-[2147483600] bg-white" aria-label="Cargando PENYERA" />}
      {authReady && !accountUser && !guestMode && <WelcomeGate artworkSettings={siteContent["welcome_gate_artworks_json"]||""} invitationName={penyes.find(p=>String(p.id)===new URLSearchParams(window.location.search).get("penya"))?.nombre || ""} onContinueAsGuest={()=>{try{localStorage.setItem("penyera-access-mode","guest");}catch{/* La elección se mantiene durante esta visita. */}setGuestMode(true);}} />}
      {showWelcomePreview && esAdminWeb && <WelcomeGate preview artworkSettings={siteContent["welcome_gate_artworks_json"]||""} onContinueAsGuest={()=>setShowWelcomePreview(false)} onClose={()=>setShowWelcomePreview(false)} />}
      {showPenyaJoinDialog && accountUser && <div className="fixed inset-0 z-[2147483601] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="penya-join-title">
        <div className="w-full max-w-md space-y-4 rounded-3xl bg-background p-6 shadow-2xl">
          <div><p className="text-xs font-extrabold uppercase tracking-wider text-primary">Comunidad PENYERA</p><h2 id="penya-join-title" className="mt-1 text-2xl font-extrabold text-primary">{inviteToken?"Te han invitado a una peña":"¿Perteneces a alguna peña?"}</h2><p className="mt-2 text-sm text-muted-foreground">{inviteToken?"Completa la solicitud para que los miembros de la peña puedan aprobar tu incorporación.":"Selecciona la peña a la que perteneces. Tu solicitud será revisada por el administrador o por un miembro aprobado."}</p></div>
          <label className="block space-y-1 text-sm font-bold">Selecciona tu peña<select value={accountPenyaId} disabled={Boolean(inviteToken)} onChange={e=>setAccountPenyaId(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 font-normal"><option value="">Elige una peña</option>{penyes.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
          <button type="button" disabled={accountBusy || penyaMembershipLoading || !accountPenyaId} onClick={()=>void solicitarPenya(accountPenyaId,inviteToken)} className="w-full rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground">{accountBusy?"Enviando solicitud…":"Enviar solicitud de asociación"}</button>
          <button type="button" onClick={()=>{setShowPenyaJoinDialog(false);setPenyaPromptDismissedFor(accountUser.id);}} className="w-full rounded-full border border-border px-5 py-3 text-sm font-bold">Ahora no</button>
        </div>
      </div>}
      {featuredPhotoEditorModal}
      {penyaProfileEditorModal}
      <nav aria-label="Navegación principal" className="flex items-center justify-between gap-0 overflow-hidden rounded-full border px-1 shadow-[0_5px_18px_rgba(20,39,52,.16),0_1px_4px_rgba(255,255,255,.95)_inset] backdrop-blur-2xl [backdrop-filter:blur(24px)_saturate(155%)]" style={{position:"fixed",left:"50vw",right:"auto",top:"auto",bottom:"calc(env(safe-area-inset-bottom) + 10px)",width:"min(460px, calc(100vw - 24px))",maxWidth:"calc(100vw - 24px)",height:"62px",minHeight:"62px",boxSizing:"border-box",transform:"translate3d(-50%, 0, 0)",translate:"none",margin:0,zIndex:2147483000,backgroundColor:`color-mix(in srgb, ${mayoralesColor} 9%, rgba(245,248,250,.94))`,borderColor:`color-mix(in srgb, ${mayoralesColor} 22%, white)`}}>
        {(["home","penyes","eventos","noticias"] as const).map((page,index)=>{
          const labels={home:"Inicio",eventos:"Eventos",penyes:"Peñas",noticias:"Noticias"};
          const active=currentPage===page;
          return <button key={page} type="button" aria-current={active?"page":undefined} onClick={()=>{setMapFullscreen(false);setSelectedPenya(null);setPenyaDetailFullscreen(false);setEventFormPenya(null);setForm(false);setShareReminder(false);setNoticiaSeleccionada(null);setCurrentPage(page);window.scrollTo({top:0,behavior:"smooth"});}} className={"relative z-10 flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0 overflow-hidden rounded-full px-0 py-0 text-center leading-none transition-colors duration-200 "+(active?"text-white":"text-primary/75 hover:text-primary")}>
            <span className="grid h-[30px] w-[30px] shrink-0 place-items-center leading-none">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="block h-[25px] w-[25px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {page==="home"?<><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>:page==="eventos"?<><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M8 2.8v4M16 2.8v4M3 9h18M8 13h3M8 16.5h6"/></>:page==="penyes"?<><circle cx="9" cy="8" r="3.2"/><path d="M2.8 20c.4-3.5 2.5-5.4 6.2-5.4s5.8 1.9 6.2 5.4M16 5.2a3 3 0 0 1 0 5.7M17 14.8c2.4.5 3.7 2.2 4.1 5.2"/></>:page==="noticias"?<><path d="M5 4h14a2 2 0 0 1 2 2v14H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M7 8h4v4H7zM14 8h4M14 12h4M7 16h11"/></>:<><path d="M10.2 2.8h3.6l.55 2.05a7.6 7.6 0 0 1 1.55.9l2.02-.62 1.8 3.12-1.48 1.52c.12.58.12 1.18 0 1.76l1.48 1.52-1.8 3.12-2.02-.62a7.6 7.6 0 0 1-1.55.9l-.55 2.05h-3.6l-.55-2.05a7.6 7.6 0 0 1-1.55-.9l-2.02.62-1.8-3.12 1.48-1.52a4.4 4.4 0 0 1 0-1.76L4.28 8.23l1.8-3.12 2.02.62a7.6 7.6 0 0 1 1.55-.9z"/><circle cx="12" cy="10.65" r="2.65"/></>}
              </svg>
            </span>
            <span className="sr-only">{labels[page]}</span>
          </button>;
        })}
        <span aria-hidden="true" className={"pointer-events-none absolute inset-y-1 left-1 z-0 w-[calc((100%-8px)/4)] rounded-full border border-white/35 shadow-[0_5px_18px_rgba(18,35,47,.18),0_1px_4px_rgba(255,255,255,.2)_inset] backdrop-blur-2xl transition-transform duration-300 ease-[cubic-bezier(.22,.61,.36,1)] "+(currentPage==="info"?"opacity-0":"")} style={{backgroundColor:mayoralesPrimaryColor,transform:"translateX(calc("+(["home","penyes","eventos","noticias"].indexOf(currentPage)*100)+"%))"}}/>
      </nav>
      {!selectedPenya&&<button type="button" onClick={()=>{if(currentPage==="info"){setSettingsClosing(true);window.setTimeout(()=>{setCurrentPage("home");setSettingsClosing(false);},220);}else{setSettingsClosing(false);setCurrentPage("info");window.scrollTo({top:0,behavior:"smooth"});}}} aria-label={currentPage==="info"?"Cerrar ajustes":"Abrir ajustes"} title="Ajustes" className="fixed right-3 top-[calc(env(safe-area-inset-top)+12px)] z-[2147483001] grid h-11 w-11 place-items-center rounded-full border border-white/35 bg-[rgba(23,63,82,.34)] text-white shadow-md backdrop-blur-2xl [backdrop-filter:blur(18px)_saturate(145%)] transition hover:rotate-12 hover:bg-[rgba(23,63,82,.58)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:right-6 sm:top-[calc(env(safe-area-inset-top)+16px)] sm:h-12 sm:w-12">
        <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-[22px] sm:w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.2 2.8h3.6l.55 2.05a7.6 7.6 0 0 1 1.55.9l2.02-.62 1.8 3.12-1.48 1.52c.12.58.12 1.18 0 1.76l1.48 1.52-1.8 3.12-2.02-.62a7.6 7.6 0 0 1-1.55.9l-.55 2.05h-3.6l-.55-2.05a7.6 7.6 0 0 1-1.55-.9l-2.02.62-1.8-3.12 1.48-1.52a4.4 4.4 0 0 1 0-1.76L4.28 8.23l1.8-3.12 2.02.62a7.6 7.6 0 0 1 1.55-.9z"/><circle cx="12" cy="10.65" r="2.65"/></svg>
        {unreadNotifications.length>0&&<span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" aria-label="Hay notificaciones sin leer"/>}
      </button>}
      {currentPage!=="home"&&<div aria-hidden="true" className={currentPage==="penyes"||currentPage==="noticias"?"h-0 shrink-0":"h-[58px] shrink-0 sm:h-[64px]"} />}
      {fotoAmpliada!==null&&noticiaImagenes[fotoAmpliada]&&<div role="dialog" aria-modal="true" aria-label="Fotografía ampliada" className="fixed inset-0 z-[7000] festalfas-modal-backdrop flex items-center justify-center p-3 animate-in fade-in duration-200" onClick={()=>setFotoAmpliada(null)}><button type="button" onClick={()=>setFotoAmpliada(null)} aria-label="Cerrar fotografía" className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-3xl text-white transition hover:rotate-90 hover:bg-white/25">×</button><button type="button" aria-label="Fotografía anterior" onClick={e=>{e.stopPropagation();setFotoAmpliada((fotoAmpliada-1+noticiaImagenes.length)%noticiaImagenes.length);}} className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl text-white transition hover:scale-110 hover:bg-white/25 sm:left-5">‹</button><div className="flex max-h-full max-w-full flex-col items-center gap-3" onClick={e=>e.stopPropagation()}><img src={noticiaImagenes[fotoAmpliada]} alt={noticiaSeleccionada?.titulo+" · foto "+(fotoAmpliada+1)} style={{width:"min(96vw, 1800px)",height:"min(86svh, 1200px)"}} width={1800} height={1200} loading="eager" fetchPriority="high" decoding="async" draggable={false} className="max-h-[86svh] max-w-[96vw] rounded-lg object-contain shadow-2xl animate-in zoom-in-95 duration-300"/><div className="flex items-center gap-3 text-sm font-semibold text-white"><span>{fotoAmpliada+1} / {noticiaImagenes.length}</span><a href={noticiaImagenes[fotoAmpliada]} download target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="rounded-full border border-white/30 bg-white/15 px-4 py-2 transition hover:scale-105 hover:bg-white/25">↓ Descargar foto</a></div></div><button type="button" aria-label="Fotografía siguiente" onClick={e=>{e.stopPropagation();setFotoAmpliada((fotoAmpliada+1)%noticiaImagenes.length);}} className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl text-white transition hover:scale-110 hover:bg-white/25 sm:right-5">›</button></div>}
      {currentPage==="home" && <>
      <section className="home-hero relative left-1/2 flex min-h-[100svh] w-screen max-w-none -translate-x-1/2 items-end overflow-hidden">
        {heroImage ? <img src={heroImage} alt="Portada de las fiestas de l'Alfàs del Pi" width={1920} height={1280} loading="eager" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300" style={{transform:"scale("+(Number(siteContent["hero_image_scale"]||100)/100)+")"}} /> : <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[#173f52] via-[#236579] to-[#d4af37]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-brown/90 via-brown/20 to-transparent" />
        <div className="relative mx-auto w-full max-w-[min(96vw,1600px)] px-4 pb-9 sm:px-5 sm:pb-16">
          <div className="rise relative mb-4 aspect-[988/232] w-full max-w-[min(100%,880px)] min-w-0">
            <button type="button" onClick={() => setBrandInfoOpen(true)} aria-label="Qué significa PENYERA" className="absolute bottom-0 left-0 block w-[88%] max-w-full min-w-0 rounded-lg text-left sm:w-[80%] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"><img src="/penyera-logo-oficial.svg" alt="PENYERA" width="988" height="232" fetchPriority="high" decoding="async" className="block h-auto w-full max-w-full object-contain object-left drop-shadow-[0_4px_22px_rgba(0,0,0,0.28)]" /></button>
          </div>
          <div className="mb-3 h-[7px] w-full max-w-36 rounded-full bg-[#2587a8] shadow-[0_1px_5px_rgba(0,0,0,0.25)]" aria-hidden="true" />
          <p className="rise mt-0 max-w-xl text-sm font-medium text-on-image/90 sm:text-lg">{siteContent["hero_subtitulo"] || edicion.subtitulo}</p>
          <div className="mt-6 mb-2">
            <p className="rise text-xs font-extrabold uppercase tracking-[.22em] text-white sm:text-sm">Festes 2027</p>
            <p className="rise mt-1 text-[10px] font-medium tracking-wide text-white/75 sm:text-xs">Cuenta atrás para el comienzo de las fiestas</p>
          </div>
          <CountdownFiestas />
        </div>
      </section>


      {brandInfoOpen && <div className="fixed inset-0 z-[100100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setBrandInfoOpen(false);}}><section role="dialog" aria-modal="true" aria-labelledby="penyera-brand-title" className="relative w-full max-w-lg rounded-[1.75rem] border border-white/15 bg-[#102f3b] p-6 text-white shadow-2xl sm:p-8"><button type="button" onClick={()=>setBrandInfoOpen(false)} aria-label="Cerrar" className="absolute right-4 top-4 rounded-full border border-white/20 px-3 py-1.5 text-lg leading-none text-white/80 transition hover:bg-white/10">×</button><img src="/penyera-isotipo.svg" alt="" aria-hidden="true" className="mb-5 h-16 w-16 object-contain" /><p className="text-[10px] font-extrabold uppercase tracking-[.24em] text-white/60">Nuestra identidad</p><h2 id="penyera-brand-title" className="mt-1 text-3xl font-black tracking-tight">PENYERA</h2><p className="mt-4 text-sm leading-relaxed text-white/85 sm:text-base">PENYERA es un nombre creado para poner en el centro aquello que hace únicas nuestras fiestas: las peñas y, sobre todo, las personas que las forman.</p><p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">El isotipo reúne dos ideas en una sola figura: una persona que se mueve y se encuentra con las demás, y una chispa de fuegos artificiales que representa la energía y la celebración. Sus formas nacen de un mismo punto para simbolizar unión, diversidad y sentimiento de pertenencia.</p><p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">Porque una peña no es solo un nombre o un local: es su gente, la amistad, los recuerdos y todo lo que compartimos.</p><button type="button" onClick={()=>setBrandInfoOpen(false)} className="mt-6 w-full rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#173f52] transition hover:bg-white/90">Entendido</button></section></div>}
      <main className="mx-auto w-full max-w-[min(96vw,1600px)] px-3 pb-28 pt-8 sm:px-5">
        {proximasActividades.length > 0 && <section aria-labelledby="proxima-actividad-title" className="mb-7 overflow-hidden rounded-[1.75rem] border border-primary/15 bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 px-4 py-4 sm:px-6">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-primary">Apunta la fecha</p><h2 id="proxima-actividad-title" className="mt-1 text-xl font-extrabold text-primary sm:text-2xl">Lo próximo en las fiestas</h2></div>
            <button type="button" onClick={() => { setCurrentPage("eventos"); window.scrollTo({top:0,behavior:"smooth"}); }} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground sm:text-sm">Ver programa completo →</button>
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-3 sm:gap-3 sm:p-4">
            {proximasActividades.map((item:any)=><button type="button" key={item._origen+"-"+item.id} onClick={() => { setCurrentPage(item._origen==="penya"?"eventos":"eventos"); if(item._origen==="programa") setDia(item.dia); setFilterDay("all"); window.scrollTo({top:0,behavior:"smooth"}); }} className="flex min-w-0 items-center gap-3 rounded-2xl bg-primary/[.045] p-3 text-left transition hover:bg-primary/10">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground">{item.hora||"★"}</span>
              <span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{fmtDia(item.dia)} · {item._origen==="penya"?"Plan de una peña":"Programa oficial"}</span><span className="mt-1 block line-clamp-2 text-sm font-extrabold leading-snug text-primary">{item.titulo}</span>{item.lugar&&<span className="mt-1 block truncate text-[11px] text-muted-foreground">📍 {item.lugar}</span>}</span>
            </button>)}
          </div>
        </section>}
        <section id="mapa" className="scroll-mt-24">
          <SectionTitle>Mapa de peñas y fiestas</SectionTitle>
          <div className="glass grid grid-cols-1 gap-3 rounded-[1.5rem] p-2 sm:gap-4 sm:rounded-[2rem] sm:p-3">
            {!mapFullscreen && <div className="space-y-3 p-1 sm:p-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ui.buscar} aria-label="Buscar en el mapa" className="w-full rounded-full border border-input bg-glass px-4 py-2.5 outline-none focus:ring-2 focus:ring-ring" />
              <div className="flex flex-wrap gap-2">
                <Chip active={!cat} onClick={() => setCat(null)}>{ui.todos}</Chip>
                {cats.map((c) => (
                  <Chip key={c} active={cat === c} onClick={() => setCat(c)}><span className={`h-2.5 w-2.5 rounded-full ${catBg[c]}`} />{ui.categorias[c]}</Chip>
                ))}
              </div>
              {penyes.some((p)=>p.lat==null||p.lng==null)||actos.some((a)=>a.lat==null||a.lng==null)||eventos.some((e)=>e.lat==null||e.lng==null) ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">Algunas peñas o actividades no aparecen en el mapa porque todavía no tienen coordenadas exactas verificadas. No se han inventado ubicaciones.</p> : null}
            </div>}
            {!mapFullscreen && <div ref={mapViewportRef} className="relative h-[390px] overflow-hidden rounded-[1.25rem] sm:h-[500px] sm:rounded-[1.5rem] md:h-[600px]">
              <button type="button" onClick={() => setMapFullscreen(true)} aria-label="Ampliar mapa a pantalla completa" className="absolute left-3 top-3 z-[1200] rounded-full border border-white/70 bg-white/95 px-4 py-2 text-sm font-bold text-[#173f52] shadow-lg">⛶ Pantalla completa</button>
              <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
                <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}>
                  {mapShouldLoad ? <FestMap lugares={visibles} focusId={focus} onPenyaClick={(id) => { setPenyaDetailFullscreen(false); setMapPenyaPreview(true); setSelectedPenya(penyes.find((p) => p.id === id) ?? null); }} onItemClick={(id)=>{setCurrentPage("eventos");setFilterDay("all");setFilterCategory(id.startsWith("acto-")?"actuaciones":"penyes");window.scrollTo({top:0,behavior:"smooth"});}} /> : <div className="h-full animate-pulse bg-gradient-to-br from-[#e8efed] to-[#d5e1df]" aria-label="El mapa se cargará al acercarte" />}
                </Suspense>
              </ClientOnly>
            </div>}
          </div>
          <section aria-labelledby="annual-calendar-title" className="relative mt-7 overflow-hidden rounded-[1.8rem] border border-white/80 bg-gradient-to-br from-white/85 via-[#f7f8f6]/75 to-[#e5edf0]/85 p-5 text-foreground shadow-[0_12px_40px_rgba(38,55,65,.10)] backdrop-blur-2xl sm:p-7">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(255,255,255,.98),transparent_42%),radial-gradient(ellipse_at_95%_100%,rgba(145,181,196,.38),transparent_44%)]"/>
            <div className="relative z-10 flex min-h-[150px] flex-col items-center justify-center text-center">
              <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-white/90 bg-white/65 text-primary shadow-sm"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M8 2.8v4M16 2.8v4M3 9h18M8 13h3M8 16.5h6"/></svg></span>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary/65">Agenda durante todo el año</p>
              <h2 id="annual-calendar-title" className="mt-1 text-xl font-extrabold text-primary sm:text-2xl">Calendario festero</h2>
              <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#c6a24b]/35 bg-[#c6a24b]/10 px-4 py-1.5 text-xs font-bold tracking-wide text-[#92732d]"><span className="h-1.5 w-1.5 rounded-full bg-[#c6a24b]"/>Próximamente</span>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">Estamos preparando un calendario para consultar todos los actos y celebraciones festeras durante el año. Muy pronto estará disponible.</p>
            </div>
          </section>
          <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-primary/15 bg-white/70 p-5 shadow-sm sm:p-7">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Una nueva etapa</p>
              <h2 className="mt-2 text-2xl font-bold text-primary sm:text-3xl">{siteContent["mayorales_titulo"] || "Mayorales 2027 · Peña CuBaTa"}</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{siteContent["mayorales_texto"] || "La mayoralía de 2027 ya está confirmada: la peña CuBaTa será la encargada de representar y organizar las fiestas del próximo año. ¡Enhorabuena!"}</p>
              <img className="mx-auto mt-5 h-auto w-full max-w-2xl object-contain" src="/cubata-logo.svg" alt="Logotipo original de la peña CuBaTa: Cobre, Bario y Tántalo" loading="lazy" />
              {siteContent["mayorales_media_url"]?.trim() ? <div className="mt-5 overflow-hidden rounded-2xl bg-black">{/\.(mp4|webm|ogg)(\?.*)?$/i.test(siteContent["mayorales_media_url"]) ? <video className="max-h-[520px] w-full" controls playsInline preload="metadata" src={siteContent["mayorales_media_url"]} /> : <img className="max-h-[520px] w-full object-contain" src={siteContent["mayorales_media_url"]} alt="Contenido adicional de los Mayorales" loading="lazy" />}</div> : null}
              {siteContent["mayorales_cuenta_url"]?.trim() && <a className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground" href={siteContent["mayorales_cuenta_url"]} target="_blank" rel="noreferrer">Seguir la cuenta de los Mayorales ↗</a>}
            </div>
          </section>
        </section>
      </main>
      </>}
      {currentPage==="eventos" && <main className="mx-auto min-h-[75vh] w-full max-w-[min(96vw,1600px)] px-3 pb-32 pt-8 sm:px-5">
        <section id="eventos" className="scroll-mt-24">
          <SectionTitle>Eventos</SectionTitle>
          <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-primary/15 bg-primary/[.045] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><h3 className="text-lg font-extrabold text-primary">¿Organizas algo en l’Alfàs?</h3><p className="text-sm text-muted-foreground">Propón una fiesta, concierto, encuentro o actividad para incluirla en la agenda festera.</p></div><button type="button" onClick={() => setCommunityEventForm(true)} className="shrink-0 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">＋ Proponer evento</button></div>
          <label className="mb-4 block"><span className="sr-only">Buscar eventos</span><input type="search" value={eventsSearch} onChange={e=>setEventsSearch(e.target.value)} placeholder="Buscar eventos por nombre, peña o lugar…" className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-base shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"/></label>
          <details className="glass mb-5 rounded-2xl p-3 sm:p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-primary">
              <span className="flex min-w-0 items-center gap-2"><span>☷ Filtros</span><span className="truncate text-xs font-medium text-muted-foreground">{({upcoming:"Próximos eventos",today:"Hoy",tomorrow:"Mañana",all:"Todos los días"} as const)[filterDay]} · {({all:"Todas las categorías",programa:"Programa oficial",actuaciones:"Actuaciones",penyes:"Eventos de peñas"} as const)[filterCategory]}</span></span>
              <span className="shrink-0 text-sm">⌄</span>
            </summary>
            <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
              <div><p className="mb-2 text-xs font-bold text-muted-foreground">DÍA</p><div className="flex flex-wrap gap-2">{[["upcoming","Próximos"],["today","Hoy"],["tomorrow","Mañana"],["all","Todos"]].map(([value,label])=><Chip key={value} active={filterDay===value} onClick={()=>setFilterDay(value as any)}>{label}</Chip>)}</div></div>
              <div><p className="mb-2 text-xs font-bold text-muted-foreground">CATEGORÍA</p><div className="flex flex-wrap gap-2">{[["all","Todas"],["programa","Programa"],["actuaciones","Actuaciones"],["penyes","Peñas"]].map(([value,label])=><Chip key={value} active={filterCategory===value} onClick={()=>setFilterCategory(value as any)}>{label}</Chip>)}</div></div>
              <button type="button" onClick={()=>{setFilterDay("upcoming");setFilterCategory("all");}} className="text-xs font-bold text-primary underline">Quitar todos los filtros</button>
            </div>
          </details>
          {filterCategory!=="penyes"&&<><div className="mb-6 space-y-2">
            <h3 className="text-2xl font-bold text-primary">{filterCategory==="programa"?"Programa oficial":filterCategory==="actuaciones"?"Actuaciones y festes al carrer":"Actos y actuaciones"}</h3>
            <p className="text-sm text-muted-foreground">Pulsa en cada evento para consultar su descripción, fecha y lugar.</p>
          </div>
          {visibleActs.length===0?<div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">No hay actos ni actuaciones que coincidan con estos filtros.</div>:<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">{visibleActs.map((a) => {
              const t = String(a.titulo || "").toLocaleLowerCase("es");
              const festaCarrer = /tardeo|mañaneo|mananeo|nocheo|festes? al carrer|fiestas? en la calle/.test(t);
              const portada = a.imagen_url || a.imagen || a.foto_url || a.foto || "";
              return <details id={"acto-"+a.id} key={a.id} className="glass group min-w-0 overflow-hidden rounded-xl border border-border/60 shadow-sm sm:rounded-3xl">
                <summary className="cursor-pointer list-none">
                  <div className="relative aspect-[5/4] overflow-hidden bg-gradient-to-br from-[#f4e8e9] via-[#ead9df] to-[#e9e3d7]">
                    {portada ? <img src={portada} alt={a.titulo} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"/> : <div className="absolute inset-0 flex items-center justify-center p-5 text-center"><span className="font-display text-base font-bold leading-tight text-[#765563] sm:text-3xl">{a.titulo}</span></div>}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#173f52]/90 via-[#173f52]/55 to-transparent p-2 pt-10 text-white sm:p-4 sm:pt-16">
                      <div className="flex items-end gap-3">
                        <div className="flex w-[62px] shrink-0 flex-col items-center rounded-xl border border-white/50 bg-white/90 px-1.5 py-2 text-center text-[#173f52] shadow-md sm:w-[86px] sm:rounded-2xl sm:px-3 sm:py-3">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider sm:text-xs">{new Date(String(a.dia).slice(0, 10) + "T12:00:00").toLocaleDateString("es-ES", { month: "short" }).replace(".", "")}</span>
                          <span className="font-display text-2xl font-bold leading-none sm:text-4xl">{new Date(String(a.dia).slice(0, 10) + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit" })}</span>
                          <span className="mt-1 text-[10px] font-bold sm:text-sm">{a.hora || "Hora por confirmar"}</span>
                        </div>
                        <div className="min-w-0 flex-1 pb-0.5">
                          <span className="mb-1 inline-block rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#765563] sm:mb-2 sm:px-2.5 sm:py-1 sm:text-[10px]">{festaCarrer ? "Festa al carrer" : a.tipo === "evento" ? "Evento oficial" : "Actuación"}</span>
                          <h3 className="line-clamp-3 text-xs font-bold leading-tight text-white sm:text-xl">{a.titulo}</h3>
                          <p className="mt-1.5 text-[10px] font-semibold text-white/90 sm:mt-2 sm:text-xs">Ver detalles <span className="inline-block transition group-open:rotate-180">⌄</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </summary>
                <div className="space-y-2 border-t border-border/50 p-2 sm:space-y-3 sm:p-4">
                  {a.descripcion && <p className="text-sm leading-relaxed text-muted-foreground">{a.descripcion}</p>}
                  <p className="text-sm"><strong>Fecha:</strong> {fmtDia(a.dia)}{a.hora ? " · " + a.hora : ""}</p>
                  {a.lugar && <p className="text-sm"><strong>Lugar:</strong> {a.lugar}</p>}
                  {a.lat != null && a.lng != null && <button onClick={() => goMap("acto-" + a.id)} className="glass-btn px-4 py-2 text-sm font-bold">Ver en el mapa de la web</button>}
                </div>
              </details>;
            })}</div>}
          </>}
          {filterCategory!=="programa"&&filterCategory!=="actuaciones"&&<><div className="mt-10 space-y-3">
            <h3 className="text-2xl font-bold text-primary">Eventos de las peñas</h3>
            {!filteredPenyaEvents.length ? <div className="glass rounded-3xl p-6 text-muted-foreground">{eventosActivos.length?"No hay eventos de peñas que coincidan con estos filtros.":"Todavía no hay eventos de peñas publicados."}</div> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">{filteredPenyaEvents.map((e) => {
              const imagen = e.imagen_url || e.imagen || e.foto_url || e.foto;
              const penyaAsociada = penyes.find(p => p.id === e.penya_id) || penyes.find(p => [e.titulo, e.descripcion, e.lugar].some((v) => String(v || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(p.nombre.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, ""))));
              const penyaNombre = penyaAsociada?.nombre;
              return <article id={"evento-"+e.id} key={e.id} className="glass min-w-0 overflow-hidden rounded-xl border border-border/60 shadow-sm sm:rounded-3xl">
                <div className="relative aspect-[5/4] overflow-hidden bg-gradient-to-br from-[#f4e8e9] via-[#ead9df] to-[#e9e3d7]">
                  {imagen ? <img src={imagen} alt={e.titulo} loading="lazy" className="absolute inset-0 h-full w-full object-cover"/> : <div className="absolute inset-0 flex items-center justify-center p-5 text-center"><span className="font-display text-xl font-bold text-[#173f52] sm:text-3xl">{e.titulo}</span></div>}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#f4eee5] via-[#f4eee5]/95 to-[#f4eee5]/0 px-2 pb-2 pt-10 text-[#173f52] sm:px-4 sm:pb-4 sm:pt-16">
                    <div className="flex items-end justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-xs font-extrabold leading-tight text-[#173f52] sm:text-xl">{e.titulo}</h3>
                        <p className="mt-1 text-[10px] font-bold text-[#59443c] sm:mt-2 sm:text-sm">{fmtDia(e.dia)}{e.hora ? " · " + e.hora : ""}</p>
                        {e.lugar && <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-[#59443c] sm:text-sm">📍 {e.lugar}</p>}
                        {e.descripcion && <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[#59443c] sm:text-sm">{e.descripcion}</p>}
                      </div>
                      {penyaNombre && <div className="max-w-[34%] shrink-0 flex flex-col items-end gap-1 text-right"><img src={penyaAsociada?.foto || ""} alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm sm:h-11 sm:w-11"/><span className="text-[9px] font-extrabold leading-tight text-[#173f52] sm:text-xs">{penyaNombre}</span></div>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">{e.lat != null && e.lng != null && <button onClick={() => goMap("evento-" + e.id)} className="text-[10px] font-bold text-[#173f52] sm:text-sm">📍 Ver ubicación</button>}</div>
              </article>;
            })}</div>}
          </div></>}
          
<section id="programa" className="scroll-mt-24">
          <SectionTitle>{ui.nav.programa}</SectionTitle>
          {!dias.length ? (
            <div className="glass rounded-3xl p-6 text-muted-foreground">{ui.programaPendiente}</div>
          ) : (
            <>
              <div className="mb-5 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">{dia === todayKey ? "Programa de hoy" : "Día seleccionado"}</p>
                <h3 className="mt-1 text-xl font-bold capitalize text-primary sm:text-2xl">{dia ? fmtDia(dia) : "Selecciona un día"}</h3>
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Consulta otros días</p>
              <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                {dias.map((d) => (
                  <Chip key={d} active={dia === d} onClick={() => setDia(d)}>
                    <span className="inline-block whitespace-nowrap first-letter:uppercase">{d === todayKey ? "Hoy · " : ""}{fmtDia(d)}</span>
                  </Chip>
                ))}
              </div>
              <div className="space-y-3">
                {[...actos.filter((a) => a.dia === dia && eventoSigueActivo(a,now))].sort((a, b) => {
                  const minutes = (h: string) => { const match = (h || "00:00").match(/^(\d{1,2}):(\d{2})/); if (!match) return 0; const value = Number(match[1]) * 60 + Number(match[2]); return value < 5 * 60 ? value + 24 * 60 : value; };
                  return minutes(a.hora) - minutes(b.hora);
                }).map((a) => {
                  const title = String(a.titulo || "").toLocaleLowerCase("es");
                  const festaCarrer = /tardeo|mañaneo|mananeo|nocheo|festes? al carrer|fiestas? en la calle/.test(title);
                  const esActuacion = !festaCarrer && a.tipo === "actuacion";
                  const etiqueta = festaCarrer ? "Festa al carrer" : esActuacion ? "Actuación" :
                    /albaes|maleta|despertà|desperta|pasacalles|visita de los mayorales/.test(title) ? "Tradición" :
                    /misa|trisagio|jubileo|santísimo|procesión|ofrenda/.test(title) ? "Acto religioso" :
                    /infantil|niño|niños|familiar|chocolatada/.test(title) ? "Actividad familiar" :
                    /autobús|bus lanzadera/.test(title) ? "Transporte" : "Actividad";
                  return <article id={"programa-acto-"+a.id} key={a.id} className="glass flex flex-col gap-1.5 rounded-xl p-2 sm:flex-row sm:items-center sm:gap-3 sm:rounded-3xl sm:p-5">
                    <div className="font-display text-xl font-bold text-primary sm:w-28 sm:text-3xl">{a.hora || "—"}</div>
                    <div className="flex-1">
                      <span className={`mb-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase text-on-image ${esActuacion ? catBg.actuacion : festaCarrer ? "bg-pink" : catBg.evento}`}>{etiqueta}</span>
                      <h4 className="text-xs font-bold leading-tight sm:text-xl">{a.titulo}</h4>
                      {a.descripcion && <p className="mt-1 hidden text-sm text-muted-foreground sm:block">{a.descripcion}</p>}
                      {a.lugar && <p className="mt-2 text-sm text-muted-foreground">📍 {a.lugar}</p>}
                    </div>
                    <div className="flex items-center gap-2">{a.lat != null && a.lng != null ? <button onClick={() => goMap("acto-" + a.id)} className="glass-btn px-4 py-2 text-sm font-bold">Ver en el mapa</button> : null}</div>
                  </article>;
                })}
                {!actos.some((a) => a.dia === dia) && <p className="glass rounded-2xl p-5 text-muted-foreground">No hay actos publicados para este día.</p>}
              </div>
            </>
          )}
        </section>
        </section>
      </main>}      {currentPage==="penyes" && <main className="relative z-0 mx-auto min-h-[75vh] w-full min-w-0 max-w-[1600px] px-4 pb-32 pt-0 sm:px-5 sm:pt-0">
        <section id="penyes" className="scroll-mt-24">
          <div className="relative left-1/2 -mt-3 mb-6 min-h-[360px] w-screen -translate-x-1/2 overflow-hidden rounded-b-[1.75rem] bg-gradient-to-br from-[#173f52] via-[#236579] to-[#2c7180] px-5 py-10 text-white shadow-[0_12px_32px_rgba(23,63,82,.16)] sm:mb-8 sm:mt-0 sm:min-h-[420px] sm:px-8 sm:py-12">
            {siteContent["penyes_banner_image_url"] ? <img src={siteContent["penyes_banner_image_url"]} alt="" aria-hidden="true" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center"/> : null}
            {siteContent["penyes_banner_image_url"] ? <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#102f40]/20 via-[#173f52]/35 to-[#102f40]/75"/> : null}
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-64 w-64 rounded-full border-[28px] border-white/10"/>
            <div className="relative z-10 mx-auto flex min-h-[280px] w-full max-w-[1500px] flex-col justify-center sm:min-h-[330px]">
              <p className="text-[10px] font-extrabold uppercase tracking-[.24em] text-white/70 sm:text-xs">La vida festera de l'Alfàs del Pi</p>
              <h2 className="mt-2 break-words text-[2rem] font-extrabold leading-tight sm:text-5xl">Nuestras peñas</h2><p className="mt-1 text-sm font-semibold text-white/85">44 peñas asociadas según la publicación municipal de 2026</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">Descubre quién está detrás de cada peña, conoce su música y su ambiente, encuentra sus próximas actividades y guarda tus favoritas.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold">{penyes.length} {penyes.length===1?"peña":"peñas"} registradas</span>
                <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold">{misPenyes.length} favoritas</span>
              </div>
            </div>
          </div>

          <div className="mb-4 flex min-w-0 justify-end gap-2 sm:mb-5">
            <button onClick={()=>{setPenyaMusicFilter("Todas");setPenyaOnlyMine(false);setPenyaSearch("");}} className="rounded-full border border-border px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary/5">Limpiar filtros</button>
            <button onClick={() => setForm(true)} className="rounded-full bg-pink px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5">+ {ui.addPenya}</button>
          </div>

          <div className="mb-5 flex min-w-0 flex-col gap-3 rounded-2xl border border-border/70 bg-card/70 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-wider text-primary">Encuentra tu ambiente</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {penyaMusicOptions.map(tipo=><button key={tipo} onClick={()=>setPenyaMusicFilter(tipo)} aria-pressed={penyaMusicFilter===tipo} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${penyaMusicFilter===tipo?"border-primary bg-primary text-primary-foreground":"border-border bg-background text-muted-foreground hover:border-primary/40"}`}>{tipo}</button>)}
              </div>
            </div>
            <button onClick={()=>setPenyaOnlyMine(v=>!v)} aria-pressed={penyaOnlyMine} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${penyaOnlyMine?"border-[#173f52] bg-[#173f52] text-white":"border-border bg-background text-primary"}`}>{penyaOnlyMine?"★ Mostrando mis peñas":"☆ Ver solo mis peñas"}</button>
          </div>

          <aside role="note" className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#f0b8b8] bg-gradient-to-r from-[#fff1f1] to-[#fde7e7] p-4 text-[#8f3038] shadow-sm sm:flex-row sm:items-center"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#efb0b4] bg-[#fbd7d9] text-[#b8323e]"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 22 20H2L12 3Z"/><path d="M12 9v5M12 17.5h.01"/></svg></span><div className="min-w-0 flex-1"><p className="font-extrabold">¿Eres responsable de una peña?</p><p className="mt-1 text-sm leading-relaxed">Próximamente podrás solicitar ser administrador de una peña en esta web. Te pediremos nombre y apellidos para comprobar tu vinculación con la peña y aprobar el acceso. Después podrás invitar a sus miembros mediante un enlace.</p></div><span className="shrink-0 self-start rounded-full border border-[#e9a7ad] bg-white/75 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#a43a43] sm:self-center">Próximamente</span></aside>

          <div className="mb-7 grid min-w-0 grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,1fr)_minmax(260px,380px)_auto]">
            <div className="min-w-0"><h3 className="text-xl font-extrabold text-primary sm:text-2xl">Directorio de peñas</h3><p className="mt-1 text-xs text-muted-foreground sm:text-sm">Abre cualquier ficha para ver fotos, planes, noticias y cómo llegar.</p></div>
            <label className="relative block min-w-0"><span className="sr-only">Buscar peñas en el directorio</span><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">⌕</span><input type="search" value={penyaSearch} onChange={e=>setPenyaSearch(e.target.value)} placeholder="Buscar una peña…" className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"/></label>
            <button onClick={()=>{setCurrentPage("home");setCat("penya");window.scrollTo({top:0,behavior:"smooth"});}} className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs font-bold text-primary transition hover:bg-primary/10">📍 Ver todas en el mapa</button>
          </div>

          {!penyes.length ? (
            <div className="glass rounded-3xl p-6 text-muted-foreground">{ui.sinPenyes}</div>
          ) : visiblePenyes.length===0 ? (
            <div className="glass rounded-3xl p-8 text-center"><p className="font-bold text-primary">No encontramos peñas con esos filtros</p><p className="mt-1 text-sm text-muted-foreground">Prueba con otra búsqueda o limpia los filtros.</p><button onClick={()=>{setPenyaSearch("");setPenyaMusicFilter("Todas");setPenyaOnlyMine(false);}} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Mostrar todas las peñas</button></div>
          ) : (
            <div className="relative mx-auto w-full max-w-[1180px] lg:max-w-none">
              {visiblePenyes.length>1&&!searchingPenyes&&<button type="button" aria-label="Peña anterior" onClick={()=>{const el=penyaCarouselRef.current;if(!el)return;const current=nearestPenyaCardIndex(el);const target=Math.max(0,current-1);setActivePenyaCard(target);centerPenyaCard(target,"smooth");}} className="absolute left-1 top-[43%] z-30 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/85 text-xl text-[#173f52] shadow-lg backdrop-blur-xl transition hover:scale-105 lg:grid">‹</button>}
              {visiblePenyes.length>1&&!searchingPenyes&&<button type="button" aria-label="Peña siguiente" onClick={()=>{const el=penyaCarouselRef.current;if(!el)return;const current=nearestPenyaCardIndex(el);const target=Math.min(el.children.length-1,current+1);setActivePenyaCard(target);centerPenyaCard(target,"smooth");}} className="absolute right-1 top-[43%] z-30 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/85 text-xl text-[#173f52] shadow-lg backdrop-blur-xl transition hover:scale-105 lg:grid">›</button>}
              <div ref={penyaCarouselRef} onScroll={(event)=>handlePenyaCarouselScroll(event.currentTarget)} className={searchingPenyes?"relative flex flex-wrap justify-center gap-5 overflow-visible px-2 py-6":"penya-coverflow relative "+(penyaCarouselInitialized?"is-ready":"is-initializing")+" flex snap-x snap-mandatory items-center overflow-x-auto overscroll-x-contain px-[calc(50%-112px)] py-16 sm:px-[calc(50%-130px)] lg:px-[calc(50%-150px)]"}>
                {loopedPenyes.map((p,index)=>{
                  const fallbackColors=["#5968D8","#E45D70","#13A6C3","#19A887","#D28B35","#8559C7","#287DAD","#C45D91"];
                  const cardConfig=penyaCardSettings[p.id]||{};
                  const colorSeed=String(p.id||p.nombre||"penya").split("").reduce((hash,char)=>(hash*31+char.charCodeAt(0))>>>0,7);
                  const color=/^#[0-9a-fA-F]{6}$/.test(cardConfig.color||"")?cardConfig.color!:(/^#[0-9a-fA-F]{6}$/.test(p.color||"")?p.color!:fallbackColors[colorSeed%fallbackColors.length]);
                  const logo=cardConfig.logo_url||"";
                  const logoScale=Number.isFinite(cardConfig.logo_scale)?Math.max(50,Math.min(180,cardConfig.logo_scale!)):100;
                  const logoX=Number.isFinite(cardConfig.logo_x)?Math.max(0,Math.min(100,cardConfig.logo_x!)):50;
                  const logoY=Number.isFinite(cardConfig.logo_y)?Math.max(0,Math.min(100,cardConfig.logo_y!)):50;
                  const rgb=(color||"").match(/[0-9a-f]{2}/gi)?.map(value=>parseInt(value,16))||[89,104,216];
                  const linear=rgb.map(value=>{const channel=value/255;return channel<=0.04045?channel/12.92:Math.pow((channel+0.055)/1.055,2);});
                  const luminance=0.2126*linear[0]!+0.7152*linear[1]!+0.0722*linear[2]!;
                  const cardTextColor=luminance>0.56?"#17232a":"#ffffff";
                  const cardTextShadow="none";
                  const cardTitle=String(cardConfig.title||p.nombre).trim()||p.nombre;
                  const shortDescription=String(cardConfig.description??p.informacion??"").replace(/\s+/g," ").trim();
                  const cardDescription=shortDescription.length>104?shortDescription.slice(0,101).trimEnd()+"…":shortDescription;
                  const offset=index-activePenyaCard;
                  const visualOffset=searchingPenyes?offset:((offset+visiblePenyes.length/2)%visiblePenyes.length+visiblePenyes.length)%visiblePenyes.length-visiblePenyes.length/2;
                  const centered=visualOffset===0;
                  return <article id={"penya-"+p.id+"-"+index} key={p.id+"-"+index} tabIndex={0} aria-label={`Abrir ficha de ${cardTitle}`} onClick={()=>{penyaCarouselScrollLeftRef.current=penyaCarouselRef.current?.scrollLeft??null;setPenyaDetailFullscreen(true);setSelectedPenya(p);}} onKeyDown={(e)=>{if(e.target===e.currentTarget&&(e.key==="Enter"||e.key===" ")){e.preventDefault();penyaCarouselScrollLeftRef.current=penyaCarouselRef.current?.scrollLeft??null;setPenyaDetailFullscreen(true);setSelectedPenya(p);}}} style={{backgroundColor:color,zIndex:searchingPenyes?1:centered?100:Math.abs(visualOffset)===1?20:1,transform:searchingPenyes?"none":`perspective(1100px) translateY(${centered?-8:Math.min(22,Math.abs(visualOffset)*10)}px) scale(${centered?1.08:Math.max(.68,.88-Math.max(0,Math.abs(visualOffset)-1)*.08)}) rotateY(${visualOffset===0?0:visualOffset<0?13:-13}deg)`,opacity:searchingPenyes?1:Math.abs(visualOffset)>3?.18:Math.max(.35,1-Math.abs(visualOffset)*.18)}} className={`penya-coverflow-card group relative ${searchingPenyes?"is-search-result":centered?"is-active":Math.abs(visualOffset)===1?(visualOffset<0?"is-side is-side-left":"is-side is-side-right"):""} ${!searchingPenyes&&index%Math.max(visiblePenyes.length,1)===0?"is-loop-start":""} h-[320px] w-[224px] shrink-0 snap-center cursor-pointer overflow-visible rounded-[2rem] border border-white/25 shadow-[0_18px_42px_rgba(19,38,53,.18)] outline-none transition-[transform,opacity,filter,box-shadow] duration-350 ease-out focus-visible:ring-4 focus-visible:ring-primary/40 ${searchingPenyes?"!transition-none":""} sm:h-[360px] sm:w-[260px] lg:h-[400px] lg:w-[290px]`}>
                    <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
                      <div className="absolute inset-x-0 top-0 z-10 p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 style={{color:cardTextColor}} className="penya-card-title break-words text-[24px] font-bold leading-[1.05] tracking-[-.035em] sm:text-[30px]">{cardTitle}</h3>
                            {cardDescription&&<p style={{color:cardTextColor,textShadow:cardTextShadow}} className="mt-2 line-clamp-3 max-w-[30ch] text-[13px] font-semibold leading-[1.45] opacity-100 sm:text-sm">{cardDescription}</p>}
                          </div>
                          {misPenyes.includes(p.id)&&<span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/20 text-sm text-white ring-1 ring-white/40" aria-label="Mi peña">★</span>}
                        </div>
                        {(mayoralesPenyaId&&String(p.id)===String(mayoralesPenyaId))&&<span className="mt-3 inline-flex items-center gap-1 rounded-full border border-[#d4af37] bg-gradient-to-r from-[#fff4c2] via-[#f4d77a] to-[#d4af37] px-2.5 py-1 text-[9px] font-extrabold tracking-wide text-[#684b08] shadow-[0_2px_8px_rgba(142,103,20,.22)]">♛ MAYORALES {mayoralesAnio}</span>}{p.asociada===false&&<span className="mt-3 inline-flex rounded-full border border-white/40 bg-black/15 px-2.5 py-1 text-[9px] font-extrabold tracking-wide" style={{color:cardTextColor}}>No asociada</span>}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-[78%]">
                        {logo?<img src={logo} alt={"Logo de "+p.nombre} loading="lazy" decoding="async" style={{objectPosition:`${logoX}% ${logoY}%`,transform:`translate(${(logoX-50)/2}%,${(logoY-50)/2}%) scale(${logoScale/100})`}} className="absolute inset-x-1 bottom-[-8px] h-full w-[calc(100%-8px)] object-contain transition-transform duration-500 ease-[cubic-bezier(.2,.75,.25,1)] group-hover:-translate-y-2"/>:<div className="absolute inset-x-0 bottom-4 text-center text-8xl font-black text-white/90">{p.nombre.trim().charAt(0).toLocaleUpperCase("es")}</div>}
                      </div>
                    </div>
                  </article>;
                })}
              </div>
              <p className="mt-1 text-center text-[10px] font-semibold tracking-wide text-[#8aa0a1] lg:hidden">Desliza para descubrir las peñas</p>
              <p className="mt-1 hidden text-center text-[10px] font-semibold tracking-wide text-[#8aa0a1] lg:block">Usa las flechas para explorar las peñas</p>
            </div>
          )}

          <div className="mt-10 rounded-3xl border border-border/70 bg-card/70 p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-primary">Agenda festera</p><h3 className="mt-1 text-xl font-extrabold text-primary sm:text-2xl">Planes de las peñas</h3><p className="mt-1 text-sm text-muted-foreground">Actividades publicadas por las peñas y próximas citas.</p></div><button onClick={()=>{setCurrentPage("eventos");setFilterCategory("penyes");setFilterDay("upcoming");window.scrollTo({top:0,behavior:"smooth"});}} className="text-xs font-bold text-primary underline">Ver agenda completa →</button></div>
            {eventosActivos.length===0?<p className="mt-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">Todavía no hay actividades de peñas publicadas. Cuando se anuncien, aparecerán aquí.</p>:<div className="mt-4 grid gap-3 md:grid-cols-2">{eventosActivos.slice(0,4).map(e=>{const owner=penyes.find(p=>p.id===e.penya_id);return <button key={e.id} onClick={()=>{if(owner){setSelectedPenya(owner);setPenyaDetailFullscreen(true);}else{setCurrentPage("eventos");setFilterCategory("penyes");}}} className="rounded-2xl border border-border bg-background/80 p-4 text-left transition hover:border-primary/40 hover:shadow-md"><p className="text-[10px] font-extrabold uppercase tracking-wider text-primary">{owner?.nombre||"Actividad de peñas"}{e.dia?" · "+fmtDia(e.dia):""}</p><p className="mt-2 font-bold text-foreground">{e.titulo}</p>{e.lugar&&<p className="mt-1 text-xs text-muted-foreground">📍 {e.lugar}</p>}</button>;})}</div>}
          </div>
        </section>
      </main>}
      
{currentPage==="info" && <main className={"mx-auto min-h-[75vh] w-full max-w-6xl space-y-8 px-3 pb-32 pt-5 sm:px-5 sm:pt-8 "+(settingsClosing?"animate-out fade-out slide-out-to-top-2 duration-200":"animate-in fade-in slide-in-from-top-2 duration-300")}>
        <section aria-labelledby="settings-title" className="space-y-6">
          {esAdminWeb && <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-primary/[.035] p-4"><div><p className="text-sm font-extrabold text-primary">Pantalla inicial</p><p className="mt-1 text-xs text-muted-foreground">Previsualiza cómo verán la bienvenida los usuarios que todavía no se han identificado.</p></div><button type="button" onClick={()=>setShowWelcomePreview(true)} className="rounded-full bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-sm">Ver pantalla inicial</button></section>}
          <WhatsNewAnnouncement userKey={accountUser?.email} config={siteContent} penyes={penyes.map((penya)=>({id:String(penya.id),nombre:penya.nombre,foto:penya.foto||penyaCardSettings[penya.id]?.logo_url||(penya as any).logo_url||"",color:penyaCardSettings[penya.id]?.color||penya.color||"",title:penyaCardSettings[penya.id]?.title||penya.nombre}))} />
          <div className="rounded-[1.75rem] border border-primary/15 bg-gradient-to-br from-card via-card to-primary/[.06] p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z"/></svg></span><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-primary">Tu espacio personal</p><h1 id="settings-title" className="mt-0.5 text-3xl font-black text-primary sm:text-4xl">Ajustes</h1></div></div><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Gestiona tu cuenta, la peña a la que perteneces y cómo quieres utilizar PENYERA.</p><nav aria-label="Secciones de ajustes" className="mt-5 flex flex-wrap gap-2"><a href="#account-settings" className="rounded-full border border-border bg-background/80 px-3.5 py-2 text-xs font-bold text-primary transition hover:border-primary/40"><span className="inline-flex items-center gap-2"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/></svg>Mi cuenta</span></a><a href="#preferences-settings" className="rounded-full border border-border bg-background/80 px-3.5 py-2 text-xs font-bold text-primary transition hover:border-primary/40"><span className="inline-flex items-center gap-2"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>Preferencias</span></a><a href="#notifications-settings-title" className="rounded-full border border-border bg-background/80 px-3.5 py-2 text-xs font-bold text-primary transition hover:border-primary/40"><span className="inline-flex items-center gap-2"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>Notificaciones</span></a><a href="#feedback-settings-title" className="rounded-full border border-border bg-background/80 px-3.5 py-2 text-xs font-bold text-primary transition hover:border-primary/40"><span className="inline-flex items-center gap-2"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11.5h8M8 8.5h5"/></svg>Ayuda</span></a></nav></div>
          <div className="grid items-start gap-4 xl:grid-cols-2">
            <section id="account-settings" className="glass scroll-mt-24 rounded-3xl border border-primary/15 p-5 shadow-sm sm:p-6">
              {accountUser ? <div className="space-y-4"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/></svg></span><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-primary">Sesión iniciada</p><h2 className="text-lg font-extrabold">{accountUser.user_metadata?.full_name || accountUser.email}</h2><p className="text-xs text-muted-foreground">{accountUser.email}</p></div></div><div className="space-y-3 rounded-2xl border border-primary/15 bg-primary/[.035] p-3">
                  <div className="space-y-1"><p className="text-sm font-bold">Mi peña</p>
                    {penyaMembership?.estado === "aprobado" ? <p className="text-sm text-emerald-700">Perteneces a {penyes.find(p=>String(p.id)===String(penyaMembership.penya_id))?.nombre || "tu peña"}.</p> : penyaMembership?.estado === "pendiente" ? <p className="text-sm font-semibold text-amber-700">Tu solicitud está pendiente de aprobación.</p> : penyaMembership?.estado === "rechazado" ? <p className="text-sm text-muted-foreground">Tu solicitud anterior fue denegada. Puedes volver a solicitar la asociación.</p> : <p className="text-sm text-muted-foreground">Todavía no estás asociado a ninguna peña.</p>}
                  </div>
                  {penyaMembership?.estado !== "aprobado" && <><label className="block space-y-1 text-sm font-bold">¿A qué peña perteneces?<select value={accountPenyaId} onChange={e=>setAccountPenyaId(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 font-normal"><option value="">Selecciona una peña</option>{penyes.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label><button type="button" disabled={accountBusy || !accountPenyaId} onClick={()=>void saveAccountPenya()} className="rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground">{accountBusy?"Enviando…":"Solicitar asociación"}</button></>}
                  {esAdminWeb && <label className="block space-y-1 text-sm font-bold">Peña para gestionar<select value={accountPenyaId} onChange={e=>setAccountPenyaId(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 font-normal"><option value="">Selecciona una peña</option>{penyes.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>}{(esAdminWeb || penyaMembership?.estado === "aprobado") && <button type="button" disabled={accountBusy || !(esAdminWeb ? accountPenyaId : penyaMembership?.penya_id)} onClick={()=>void crearEnlaceInvitacion(String(esAdminWeb ? accountPenyaId : penyaMembership?.penya_id || ""))} className="rounded-full border border-primary/25 px-4 py-2 text-sm font-bold text-primary">Copiar enlace para invitar</button>}
                </div>
                {(esAdminWeb || penyaMembership?.estado === "aprobado") && <div className="space-y-3 rounded-2xl border border-border p-3">
                  <div><h3 className="text-sm font-extrabold">Solicitudes de asociación</h3><p className="text-xs text-muted-foreground">Revisa quién quiere unirse a {esAdminWeb?"las peñas":"tu peña"}.</p></div>
                  {penyaMemberRoster.filter(m=>m.estado==="pendiente").length===0 ? <p className="text-xs text-muted-foreground">No hay solicitudes pendientes.</p> : penyaMemberRoster.filter(m=>m.estado==="pendiente").map(m=><div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 p-3"><div><p className="text-sm font-bold">{m.display_name || "Usuario"}</p><p className="text-xs text-muted-foreground">{penyes.find(p=>String(p.id)===String(m.penya_id))?.nombre || "Peña"} · {new Date(m.solicitado_en || m.joined_at).toLocaleDateString("es-ES")}</p></div><div className="flex gap-2"><button type="button" disabled={accountBusy} onClick={()=>void revisarSolicitudPenya(m.id,true)} className="rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Aprobar</button><button type="button" disabled={accountBusy} onClick={()=>void revisarSolicitudPenya(m.id,false)} className="rounded-full border border-border px-3 py-2 text-xs font-bold">Denegar</button></div></div>)}
                </div><button type="button" disabled={accountBusy} onClick={async()=>{setAccountBusy(true);await supabase.auth.signOut();setAccountMessage("Has cerrado sesión.");setAccountBusy(false);}} className="rounded-full border border-border px-4 py-2 text-sm font-bold">Cerrar sesión</button></div> : <>
                <div className="mb-4 flex gap-2 rounded-full bg-muted/70 p-1"><button type="button" onClick={()=>{setAccountMode("register");setAccountMessage("");}} className={"flex-1 rounded-full px-3 py-2 text-sm font-bold "+(accountMode==="register"?"bg-primary text-primary-foreground shadow":"text-muted-foreground")}>Crear cuenta</button><button type="button" onClick={()=>{setAccountMode("login");setAccountMessage("");}} className={"flex-1 rounded-full px-3 py-2 text-sm font-bold "+(accountMode==="login"?"bg-primary text-primary-foreground shadow":"text-muted-foreground")}>Iniciar sesión</button></div>
                <form onSubmit={handleAccountSubmit} className="space-y-3"><h2 className="text-xl font-extrabold text-primary">{accountMode==="register"?"Regístrate en PENYERA":"Bienvenido de nuevo"}</h2>{accountMode==="register"&&<><label className="block space-y-1 text-sm font-semibold">Nombre<input autoComplete="name" required maxLength={80} value={accountName} onChange={e=>setAccountName(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring" placeholder="Tu nombre"/></label><label className="block space-y-1 text-sm font-semibold">¿A qué peña perteneces? <span className="font-normal text-muted-foreground">(opcional)</span><select value={accountPenyaId} onChange={e=>setAccountPenyaId(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 font-normal"><option value="">No pertenezco a ninguna / Prefiero indicarlo después</option>{penyes.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select><span className="block text-xs font-normal text-muted-foreground">Podrás cambiar esta información más adelante en Ajustes.</span></label></>}<label className="block space-y-1 text-sm font-semibold">Correo electrónico<input type="email" autoComplete="email" required value={accountEmail} onChange={e=>setAccountEmail(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring" placeholder="nombre@correo.com"/></label><label className="block space-y-1 text-sm font-semibold">Contraseña<input type="password" autoComplete={accountMode==="register"?"new-password":"current-password"} minLength={8} required value={accountPassword} onChange={e=>setAccountPassword(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring" placeholder="Mínimo 8 caracteres"/></label><button disabled={accountBusy} className="w-full rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-sm">{accountBusy?"Procesando…":accountMode==="register"?"Crear mi cuenta":"Entrar"}</button></form>
              </>}
              {accountMessage&&<p role="status" className="mt-3 rounded-xl bg-primary/5 p-3 text-sm text-primary">{accountMessage}</p>}
            </section>
            <section id="preferences-settings" className="glass scroll-mt-24 space-y-4 rounded-3xl border border-primary/15 p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary" aria-hidden="true"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg></span><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-primary">Personalización</p><h2 className="mt-1 text-xl font-extrabold text-primary">Preferencias de la web</h2><p className="mt-1 text-xs text-muted-foreground">Se guardan en este dispositivo y, al iniciar sesión, también en tu cuenta.</p></div></div><label className="flex items-start gap-3 rounded-2xl border border-border/70 p-3"><input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={personalPrefs.showImportantNotices} onChange={e=>setPersonalPrefs(p=>({...p,showImportantNotices:e.target.checked}))}/><span><span className="block text-sm font-bold">Mostrar avisos importantes</span><span className="block text-xs text-muted-foreground">Controla si aparecen los comunicados destacados mientras navegas.</span></span></label><label className="flex items-start gap-3 rounded-2xl border border-border/70 p-3"><input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={personalPrefs.reduceMotion} onChange={e=>setPersonalPrefs(p=>({...p,reduceMotion:e.target.checked}))}/><span><span className="block text-sm font-bold">Reducir animaciones</span><span className="block text-xs text-muted-foreground">Reduce transiciones y movimientos de la interfaz.</span></span></label><label className="flex items-start gap-3 rounded-2xl border border-border/70 p-3"><input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={personalPrefs.largeText} onChange={e=>setPersonalPrefs(p=>({...p,largeText:e.target.checked}))}/><span><span className="block text-sm font-bold">Texto más grande</span><span className="block text-xs text-muted-foreground">Aumenta el tamaño de los textos para facilitar la lectura.</span></span></label><label className="flex items-start gap-3 rounded-2xl border border-border/70 p-3"><input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={personalPrefs.highContrast} onChange={e=>setPersonalPrefs(p=>({...p,highContrast:e.target.checked}))}/><span><span className="block text-sm font-bold">Mayor contraste</span><span className="block text-xs text-muted-foreground">Refuerza el contraste de textos secundarios y bordes.</span></span></label><button type="button" disabled={accountBusy} onClick={()=>void savePersonalPreferences()} className="rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground">Guardar mis ajustes</button></section>
          </div>
          {accountUser && penyes.some(p=>puedeAdministrarPenya(p.id)) && <section className="mt-6 space-y-3 rounded-3xl border border-primary/15 bg-primary/[.035] p-5 shadow-sm"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-primary">Panel de gestión</p><h2 className="mt-1 text-xl font-extrabold text-primary">Peñas que administras</h2><p className="mt-1 text-xs text-muted-foreground">Desde aquí puedes editar la ficha completa o gestionar sus fotografías.</p></div><div className="space-y-3">{penyes.filter(p=>puedeAdministrarPenya(p.id)).map(p=>{const members=penyaMemberRoster.filter(member=>String(member.penya_id)===String(p.id));const avatar=p.foto||p.foto_url||(p as any).logo_url||"";const avatarUrl=avatar?(avatar.startsWith("http")?avatar:supabase.storage.from("penyes").getPublicUrl(avatar).data.publicUrl):"";return <div key={p.id} className="rounded-2xl border border-border bg-background p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-white">{avatarUrl?<img src={avatarUrl} alt={"Perfil de "+p.nombre} style={getPenyaPhotoImageStyle(penyaProfileLogoSettings[p.id])} className="block h-full w-full rounded-full object-cover" loading="lazy" decoding="async"/>:<span className="grid h-full w-full place-items-center font-black text-primary">{p.nombre.slice(0,1).toUpperCase()}</span>}</div><div className="min-w-0"><p className="truncate text-sm font-extrabold text-primary">{p.nombre}</p><p className="text-xs text-muted-foreground">{members.length} {members.length===1?"usuario":"usuarios"} vinculados</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setManagingPenyaPhotos(p)} className="rounded-full border border-primary/25 bg-background px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5">Gestionar imágenes</button><button type="button" onClick={()=>setEditingPenyaProfile(p)} className="rounded-full bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground transition hover:opacity-90">Editar ficha</button></div></div><div className="mt-3 flex flex-wrap gap-2 border-t border-border/70 pt-3">{members.length?members.map(member=><span key={member.user_id} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pl-1 pr-3 text-xs font-semibold text-foreground">{member.avatar_url?<img src={member.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover"/>:<span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 font-bold text-primary">{String(member.display_name||"U").slice(0,1).toUpperCase()}</span>}{member.display_name||"Usuario"}</span>):<span className="text-xs text-muted-foreground">Todavía no hay usuarios vinculados a esta peña.</span>}</div></div>})}</div></section>}
        </section>
        <section aria-labelledby="feedback-settings-title" className="scroll-mt-24 space-y-4 rounded-3xl border border-border/70 bg-card/60 p-5 sm:p-6">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-primary">Ayúdanos a mejorar</p><h2 id="feedback-settings-title" className="mt-1 text-xl font-extrabold text-primary sm:text-2xl">Sugerir cambios o informar de errores</h2><p className="mt-1 text-sm text-muted-foreground">Cuéntanos qué mejorarías o qué ha dejado de funcionar. El equipo lo revisará desde administración. El correo es opcional y solo se guardará si lo escribes.</p></div>
          <form onSubmit={submitFeedback} className="glass grid gap-3 rounded-3xl border border-primary/15 p-4 sm:grid-cols-2 sm:p-5">
            <label className="space-y-1 text-sm font-bold">Tipo<select value={feedbackType} onChange={e=>setFeedbackType(e.target.value as "sugerencia"|"error")} className="w-full rounded-xl border border-input bg-background px-3 py-3 font-normal"><option value="sugerencia">Sugerencia de mejora</option><option value="error">Informar de un error</option></select></label>
            <label className="space-y-1 text-sm font-bold">Correo de contacto (opcional)<input type="email" maxLength={254} value={feedbackEmail} onChange={e=>setFeedbackEmail(e.target.value)} placeholder="Añade un correo si quieres recibir respuesta" className="w-full rounded-xl border border-input bg-background px-3 py-3 font-normal"/></label>
            <label className="space-y-1 text-sm font-bold sm:col-span-2">Título<input required minLength={3} maxLength={100} value={feedbackTitle} onChange={e=>setFeedbackTitle(e.target.value)} placeholder="Resume la sugerencia o el problema" className="w-full rounded-xl border border-input bg-background px-3 py-3 font-normal"/></label>
            <label className="space-y-1 text-sm font-bold sm:col-span-2">Descripción<textarea required minLength={10} maxLength={2000} rows={4} value={feedbackDescription} onChange={e=>setFeedbackDescription(e.target.value)} placeholder="Explica qué ocurre o qué cambiarías…" className="w-full rounded-xl border border-input bg-background px-3 py-3 font-normal"/></label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button type="submit" disabled={feedbackBusy} className="rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground">{feedbackBusy?"Enviando…":"Enviar comentario"}</button>{feedbackMessage&&<p role="status" className="text-sm text-muted-foreground">{feedbackMessage}</p>}</div>
          </form>
        </section>
        <section aria-labelledby="faq-title" className="space-y-4 rounded-3xl border border-border/70 bg-card/60 p-5 sm:p-6">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-primary">Ayuda</p><h2 id="faq-title" className="mt-1 text-xl font-extrabold text-primary sm:text-2xl">Preguntas frecuentes</h2><p className="mt-1 text-sm text-muted-foreground">Respuestas rápidas a las dudas más habituales.</p></div>
          <div className="space-y-2">
            {[
              ["¿Cómo añado una peña al directorio?","Desde la opción para añadir una peña, completa el nombre y los datos disponibles. Las solicitudes públicas quedan pendientes de revisión antes de publicarse."],
              ["¿Por qué mi peña aparece en el mapa pero no en el carrusel?","El mapa puede contener puntos independientes. Para aparecer en el directorio, la peña debe existir en el registro de peñas y estar publicada."],
              ["¿Cómo puedo corregir los datos de una peña?","Entra en Ajustes y envía una sugerencia indicando el nombre de la peña y los datos que hay que corregir."],
              ["¿Cómo se publican los eventos de una peña?","Los eventos enviados se revisan desde administración antes de mostrarse en la web."],
              ["¿Cómo contacto si encuentro un fallo?","Utiliza el formulario de esta página, selecciona «Informar de un error» y describe los pasos para reproducirlo."],
              ["¿Necesito una cuenta para consultar la web?","No. El directorio, el mapa y la información pública se pueden consultar sin iniciar sesión. La cuenta permite guardar preferencias y asociar una peña a tu perfil."]
            ].map(([question,answer])=><details key={question} className="group rounded-2xl border border-border/70 bg-card/70 px-4 py-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-primary [&::-webkit-details-marker]:hidden">{question}<span aria-hidden="true" className="text-lg transition-transform group-open:rotate-45">＋</span></summary><p className="pt-3 text-sm leading-relaxed text-muted-foreground">{answer}</p></details>)}
          </div>
        </section>
        <section aria-labelledby="notifications-settings-title" className="scroll-mt-24 space-y-4 rounded-3xl border border-border/70 bg-card/60 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-primary">Tu actividad</p><h2 id="notifications-settings-title" className="mt-1 text-xl font-extrabold text-primary sm:text-2xl">Notificaciones</h2><p className="mt-1 text-sm text-muted-foreground">{unreadNotifications.length?unreadNotifications.length+" pendientes de leer":"Estás al día con tus avisos."}</p></div><button type="button" onClick={markAllNotificationsRead} disabled={!unreadNotifications.length} className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-primary disabled:opacity-40">Marcar todas como leídas</button></div>
          <div className="rounded-2xl border border-primary/15 bg-primary/[.045] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><h3 className="text-sm font-extrabold text-primary">Novedades de la web</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Vuelve a abrir la presentación y descubre las novedades y mejoras de PENYERA cuando quieras.</p></div><button type="button" onClick={()=>window.dispatchEvent(new Event("penyera:open-whats-new"))} className="shrink-0 rounded-full bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground">Ver novedades</button></div></div>
          <div className="grid gap-3 md:grid-cols-2">
            {avisosNotificaciones.length?avisosNotificaciones.map((aviso:any)=><article key={aviso.id} className={"rounded-2xl border p-4 transition-colors "+(readNotificationIds.includes(String(aviso.id))?"border-border/70 bg-card/70":"border-primary/20 bg-white shadow-sm")}><div className="flex items-start gap-3"><span className={"mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full "+(readNotificationIds.includes(String(aviso.id))?"bg-transparent":"bg-red-500")}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-extrabold text-primary">{aviso.titulo}</h3>{aviso.importante&&<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold text-amber-900">Importante</span>}</div><p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{aviso.descripcion}</p>{aviso.publicar_en&&<p className="mt-2 text-[10px] text-muted-foreground">{new Date(aviso.publicar_en).toLocaleString("es-ES",{dateStyle:"medium",timeStyle:"short"})}</p>}{!readNotificationIds.includes(String(aviso.id))&&<button type="button" onClick={()=>markNotificationRead(String(aviso.id))} className="mt-2 text-xs font-extrabold text-primary underline underline-offset-2">Marcar como leída</button>}</div></div></article>):<div className="rounded-2xl border border-dashed border-border bg-card/50 px-5 py-10 text-center md:col-span-2"><span className="text-3xl">♧</span><p className="mt-2 text-sm font-extrabold text-primary">No tienes notificaciones</p><p className="mt-1 text-xs text-muted-foreground">Aquí aparecerán los avisos generales y los dirigidos a tu cuenta.</p></div>}
          </div>
        </section>
      </main>}
      {currentPage!=="home" && avisosVisibles.length>0 && <section aria-label="Avisos importantes" className="mx-auto mb-8 w-full max-w-[min(96vw,1600px)] space-y-2 px-3 sm:px-5">{avisosVisibles.map((aviso:any)=><article key={aviso.id} className={`rounded-2xl border p-3 sm:p-4 ${aviso.importante?"border-amber-400 bg-amber-50 text-amber-950 shadow-md":"border-border bg-background/80 text-foreground"}`}><div className="flex items-start gap-3"><span className="text-xl">{aviso.importante?"⚠️":"📢"}</span><div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-wide">{aviso.importante?"Aviso importante":"Comunicado"}</p><h2 className="font-bold">{aviso.titulo}</h2><p className="mt-1 text-sm">{aviso.descripcion}</p></div></div></article>)}</section>}
      {currentPage==="noticias" && <main className={noticiaSeleccionada ? "w-full min-h-[85vh] px-0 pb-32 pt-0" : "w-full min-h-[85vh] max-w-none px-3 pb-32 pt-8 sm:px-5"}>
        {noticiaSeleccionada ? <article className="w-full max-w-none">
          <section className="relative left-1/2 mb-6 isolate flex min-h-[48svh] w-screen max-w-none -translate-x-1/2 items-end overflow-hidden rounded-t-none rounded-b-3xl border-0 bg-[#173f52] shadow-none sm:min-h-[76vh] lg:min-h-[82vh]">
            <button type="button" onClick={()=>{setNoticiaSeleccionada(null);window.scrollTo({top:0,behavior:"smooth"});}} className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 rounded-full border border-white/80 bg-white/95 px-5 py-2.5 text-sm font-bold text-[#173f52] shadow-lg transition hover:bg-white sm:right-8 sm:top-8">Volver</button>
            {noticiaSeleccionada.tipo!=="video"&&noticiaSeleccionada.imagen_url ? <><img src={noticiaSeleccionada.imagen_url} alt={noticiaSeleccionada.titulo} loading="eager" className="absolute inset-0 h-full w-full object-cover object-center" /><div className="absolute inset-0 bg-gradient-to-t from-[#102f3d]/95 via-[#102f3d]/35 to-transparent" /></> : <div className="absolute inset-0 bg-gradient-to-br from-[#173f52] via-[#236579] to-[#102f3d]" />}
            <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-6 pt-24 sm:px-6 sm:pb-12 sm:pt-28 lg:pb-16">
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-white/90"><span className={`rounded-full px-3 py-1.5 font-bold uppercase tracking-wider ${esNoticiaMayorales(noticiaSeleccionada)?"bg-amber-100 text-amber-900":noticiaSeleccionada.tipo==="video"?"bg-rose-100 text-rose-900":noticiaSeleccionada.tipo==="externa"?"bg-slate-100 text-slate-700":noticiaSeleccionada.tipo==="oficial"?"bg-sky-100 text-sky-900":"bg-primary/10 text-primary"}`}>{esNoticiaMayorales(noticiaSeleccionada)?"Mayorales 2027":noticiaSeleccionada.tipo==="video"?"Vídeo":noticiaSeleccionada.tipo==="externa"?(noticiaSeleccionada.fuente||"Medio externo"):noticiaSeleccionada.tipo==="oficial"?"Información oficial":"Noticias de las peñas"}</span>{noticiaSeleccionada.autor && <span className="text-white/85">{noticiaSeleccionada.autor}</span>}{noticiaSeleccionada.fuente&&<span className="text-white/85">Fuente: {noticiaSeleccionada.fuente}</span>}<span className="text-white/85">{new Date(noticiaSeleccionada.fecha||noticiaSeleccionada.created_at||Date.now()).toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})}</span></div>
              <h1 className="max-w-4xl text-2xl font-extrabold leading-tight text-white drop-shadow-[0_3px_16px_rgba(0,0,0,0.35)] sm:text-5xl lg:text-6xl">{noticiaSeleccionada.titulo}</h1>
            </div>
          </section>
          <div className="w-full max-w-none px-4 sm:px-6 lg:px-8">
          <div className="mb-7 flex justify-end border-b border-border/60 pb-4"><button type="button" onClick={async()=>{const url=window.location.origin+"/noticia/"+encodeURIComponent(String(noticiaSeleccionada.id));const title=noticiaSeleccionada.titulo||"Noticia de PENYERA";const text=noticiaSeleccionada.resumen||"Lee esta noticia en PENYERA";try{if(navigator.share){let files:File[]=[];if(noticiaSeleccionada.imagen_url){try{const response=await fetch(noticiaSeleccionada.imagen_url);if(!response.ok)throw new Error("No se pudo descargar la imagen");const blob=await response.blob();let imageBlob=blob;let mime=blob.type||"image/jpeg";if(mime.includes("svg")){const objectUrl=URL.createObjectURL(blob);try{const image=new Image();await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("No se pudo preparar la imagen"));image.src=objectUrl;});const canvas=document.createElement("canvas");canvas.width=image.naturalWidth||1200;canvas.height=image.naturalHeight||630;const context=canvas.getContext("2d");if(!context)throw new Error("No se pudo preparar la imagen");context.drawImage(image,0,0,canvas.width,canvas.height);imageBlob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error("No se pudo convertir la imagen")),"image/png"));mime="image/png";}finally{URL.revokeObjectURL(objectUrl);}}const extension=mime.includes("png")?"png":mime.includes("webp")?"webp":"jpg";const safeName=title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"noticia";files=[new File([imageBlob],"festalfas-"+safeName+"."+extension,{type:mime})];}catch(error){console.warn("No se pudo adjuntar la imagen de la noticia; se compartirá el enlace.",error);}}if(files.length&&navigator.canShare?.({files})){await navigator.share({files,title,text,url});}else{await navigator.share({title,text,url});}}else{await navigator.clipboard.writeText(url);window.alert("Enlace de la noticia copiado.");}}catch(error){if(!(error instanceof DOMException&&error.name==="AbortError")){try{await navigator.clipboard.writeText(url);window.alert("Enlace de la noticia copiado.");}catch{window.prompt("Copia el enlace de la noticia:",url);}}}}} className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-secondary">↗ Compartir noticia</button></div>
          {noticiaSeleccionada.resumen && <p className="mt-5 border-l-[3px] border-secondary pl-4 text-[0.9rem] font-semibold leading-[1.65] text-primary sm:mt-9 sm:pl-6 sm:text-2xl">{noticiaSeleccionada.resumen}</p>}
          <div className="mt-5 space-y-3 text-[0.9rem] leading-[1.65] text-foreground sm:mt-9 sm:space-y-5 sm:text-base sm:leading-[1.8]">{limpiarTextoNoticia(noticiaSeleccionada.contenido).split(/\n\s*\n/).filter((bloque:string)=>bloque.trim()).map((bloque:string,index:number)=>{const texto=bloque.trim();const esTitulo=/^[A-ZÁÉÍÓÚÜÑ «»0-9:¿?¡!,.]+$/.test(texto)&&texto.length<85;const partes=texto.split(/(https?:\/\/[^\s<>"']+)/gi);const contenidoEnlazado=partes.map((parte:string,j:number)=>/^https?:\/\//i.test(parte)?<a key={j} href={parte.replace(/[),.;!?]+$/,"")} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline decoration-secondary underline-offset-4 transition-colors hover:text-secondary break-words">{parte}</a>:parte);return esTitulo?<h2 key={index} className="mt-5 border-l-[3px] border-secondary pl-3 text-base font-bold leading-snug text-primary sm:mt-9 sm:pl-4 sm:text-xl">{texto}</h2>:<p key={index} className={index===0?"font-medium leading-[1.65] text-foreground":"leading-[1.65] text-foreground"}>{contenidoEnlazado}</p>;})}</div>
          {Array.isArray(noticiaSeleccionada.enlaces)&&noticiaSeleccionada.enlaces.filter((e:any)=>e?.url&&/^https?:\/\//i.test(e.url)).length>0&&<section className="mt-8 rounded-2xl border border-primary/15 bg-primary/[.035] p-4 sm:p-5"><h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-primary">Enlaces de interés</h2><ul className="space-y-2">{noticiaSeleccionada.enlaces.filter((e:any)=>e?.url&&/^https?:\/\//i.test(e.url)).map((e:any,j:number)=><li key={j}><a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 font-semibold text-primary underline underline-offset-4 transition hover:text-secondary"><span aria-hidden="true">↗</span>{e.titulo||e.texto||"Abrir enlace"}</a></li>)}</ul></section>}
          {noticiaSeleccionada.video_url&&<div className="relative mb-8 aspect-video w-full overflow-hidden rounded-xl bg-black shadow-md sm:rounded-2xl">{esVideoDirecto(noticiaSeleccionada.video_url)?<video className="h-full w-full" controls playsInline preload="metadata" src={noticiaSeleccionada.video_url}/>:videoEmbedUrl(noticiaSeleccionada.video_url)?<iframe className="h-full w-full" src={videoEmbedUrl(noticiaSeleccionada.video_url)} title={"Vídeo: "+noticiaSeleccionada.titulo} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/>:<a href={noticiaSeleccionada.video_url} target="_blank" rel="noreferrer" className="flex h-full items-center justify-center text-lg font-bold text-white underline">▶ Ver vídeo en su plataforma original</a>}</div>}
          {noticiaImagenes.length>0&&<section className="mb-9 mt-14 border-t border-border/70 pt-8 sm:mt-16 sm:pt-10"><div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-2xl font-extrabold text-primary sm:text-3xl">Galería de imágenes</h2><p className="mt-1 text-sm text-muted-foreground">Fotografías de la publicación original{noticiaSeleccionada.fuente?` · Fuente: ${noticiaSeleccionada.fuente}`:""}</p></div><span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">{noticiaImagenes.length} {noticiaImagenes.length===1?"foto":"fotos"}</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">{noticiaImagenes.map((url:string,i:number)=><button key={url} type="button" onClick={()=>setFotoAmpliada(i)} aria-label={"Ampliar fotografía "+(i+1)} className="group relative flex min-h-36 cursor-zoom-in items-center justify-center overflow-hidden rounded-xl bg-muted shadow-sm outline-none transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-4 focus-visible:ring-primary/30 active:scale-[.97] sm:min-h-52 sm:rounded-2xl"><img src={url} alt={noticiaSeleccionada.titulo+" · foto "+(i+1)} loading="lazy" className="h-full max-h-[620px] min-h-36 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 group-active:scale-100 sm:min-h-52"/><span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold text-white opacity-100 shadow transition-opacity sm:opacity-0 sm:group-hover:opacity-100">⌕ Ampliar</span></button>)}</div></section>}

          {(noticiaSeleccionada.fuente||noticiaSeleccionada.fuente_url)&&<div className="mt-10 border-t border-border/70 pt-5 text-right"><p className="text-xs leading-relaxed text-muted-foreground">{noticiaSeleccionada.tipo==="oficial"?"Información oficial de:":"Fuente de la información:"} <strong className="font-semibold text-foreground">{noticiaSeleccionada.fuente||noticiaSeleccionada.autor||"Publicación original"}</strong></p>{noticiaSeleccionada.fuente_url&&<a href={noticiaSeleccionada.fuente_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-4 transition hover:text-secondary">{noticiaSeleccionada.automatico?"Consultar publicación original":"Ver publicación original"} ↗</a>}</div>}
          </div>
        </article> : <>
          <header className="relative z-10 flex items-center gap-3 bg-background px-1 pb-4 pt-2 sm:gap-6 sm:pb-5"><div className="min-w-0 flex-1"><p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-primary sm:text-xs sm:tracking-[.2em]">Actualidad festera</p><h1 className="mt-0.5 text-2xl font-extrabold leading-tight text-primary sm:mt-2 sm:text-5xl">Noticias</h1><p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground sm:mt-3 sm:text-sm sm:leading-normal">Toda la actualidad de las fiestas: comunicados oficiales, novedades y noticias de nuestras peñas y otras fuentes.</p></div><label className="w-[48%] shrink-0 sm:w-[min(42%,480px)]"><span className="sr-only">Buscar noticias</span><input type="search" value={newsSearch} onChange={e=>setNewsSearch(e.target.value)} placeholder="Buscar noticias…" className="w-full rounded-xl border border-border bg-card/95 px-3 py-2.5 text-xs text-foreground shadow-sm outline-none backdrop-blur-xl transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-base"/></label></header>
          {visibleNews.length ? <div className="relative isolate space-y-8">
            {featuredNews.length>0&&<section aria-labelledby="featured-news-title" className="relative left-1/2 z-0 mb-8 -mt-0 w-screen max-w-none -translate-x-1/2 overflow-hidden"><div className="relative h-[58svh] min-h-[380px] max-h-[680px] w-full overflow-hidden bg-[#102f3d] sm:h-[70vh] sm:min-h-[500px] lg:h-[76vh] lg:max-h-[820px]">{featuredNews[0].imagen_url?<img src={featuredNews[0].imagen_url} alt={featuredNews[0].titulo} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-center"/>:<div className="absolute inset-0 bg-gradient-to-br from-[#173f52] via-[#236579] to-[#102f3d]"/>}<div className="absolute inset-0 bg-gradient-to-t from-[#102f3d] via-[#102f3d]/45 to-[#102f3d]/10"/><div className="absolute inset-0 bg-gradient-to-b from-[#102f3d]/75 via-[#102f3d]/25 to-transparent"/><div className="relative z-10 flex h-[58svh] min-h-[380px] max-h-[680px] w-full flex-col justify-end px-5 pb-8 pt-8 sm:h-[70vh] sm:min-h-[500px] sm:px-8 sm:pb-12 lg:h-[76vh] lg:max-h-[820px]"><span className="mb-4 inline-flex w-fit rounded-full bg-[#d5b45b] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#17313b]">{esNoticiaMayorales(featuredNews[0])?"Mayorales 2027":featuredNews[0].tipo==="oficial"?"Información oficial":featuredNews[0].tipo==="externa"?(featuredNews[0].fuente||"Medio externo"):"Actualidad festera"}</span><h2 id="featured-news-title" className="w-full text-3xl font-extrabold leading-[1.05] text-white drop-shadow-lg sm:text-5xl lg:text-7xl">{featuredNews[0].titulo}</h2><div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-white/75"><span>{new Date(featuredNews[0].fecha||featuredNews[0].created_at||Date.now()).toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})}</span>{featuredNews[0].fuente&&<span>· {featuredNews[0].fuente}</span>}</div><button type="button" onClick={()=>{setNoticiaSeleccionada(featuredNews[0]);window.scrollTo({top:0,behavior:"smooth"});}} className="mt-6 w-fit rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#173f52] shadow-lg transition hover:-translate-y-0.5">Leer noticia completa →</button></div><div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background"/></div></section>}
            {(visibleNews.length>0)&&<section aria-labelledby="latest-news-title" className="relative z-10 -mt-10 rounded-t-[2rem] bg-background px-1 pt-8 shadow-[0_-24px_48px_rgba(0,0,0,.12)] sm:-mt-14 sm:px-3 sm:pt-10"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-primary">Sigue al día</p><h2 id="latest-news-title" className="text-xl font-extrabold text-primary sm:text-2xl">Más noticias</h2></div><span className="text-xs text-muted-foreground">{regularNews.length+Math.max(0,featuredNews.length-1)} publicaciones</span></div><div className="grid min-w-0 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleNews.map(renderNewsCard)}</div></section>}
          </div> : <div className="rounded-3xl border border-dashed border-border bg-card/60 px-5 py-14 text-center"><p className="text-4xl">▤</p><h2 className="mt-3 text-xl font-bold text-primary">{newsSearch?"No hay noticias que coincidan":"Todavía no hay noticias publicadas"}</h2><p className="mt-2 text-sm text-muted-foreground">{newsSearch?"Prueba con otras palabras.":"Aquí aparecerán las últimas novedades oficiales y de las peñas."}</p></div>}
        </>}
      </main>}


      {mapFullscreen && typeof document !== "undefined" && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Mapa a pantalla completa" className="fixed inset-0 z-[99999] h-[100dvh] w-screen overflow-hidden bg-[#f3eee6]">
          <div className="absolute inset-0">
            <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
              <Suspense fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
                <FestMap lugares={visibles} focusId={focus} onPenyaClick={(id) => { setMapFullscreen(false); setPenyaDetailFullscreen(false); setMapPenyaPreview(true); setSelectedPenya(penyes.find((p) => p.id === id) ?? null); }} onItemClick={(id)=>{setMapFullscreen(false);setCurrentPage("eventos");setFilterDay("all");setFilterCategory(id.startsWith("acto-")?"actuaciones":"penyes");window.scrollTo({top:0,behavior:"smooth"});}} />
              </Suspense>
            </ClientOnly>
          </div>
          <button type="button" onClick={() => setMapFullscreen(false)} className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-[100000] rounded-full border border-white bg-white px-5 py-3 text-sm font-bold text-[#173f52] shadow-xl">✕ Cerrar mapa</button>
        </div>, document.body
      )}
      {<footer className="space-y-4 px-5 pb-32 text-center text-sm text-muted-foreground">
        <p>PENYERA · {new Date().getFullYear()}</p>
        <button onClick={() => void shareWebsite()} className="glass-btn rounded-full px-6 py-3 font-bold text-primary">↗ Compartir la web</button>
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => shareOn("whatsapp", window.location.href, "Fiestas de l'Alfàs del Pi", "Consulta las peñas y las últimas noticias de las fiestas.")} className="glass-btn rounded-full px-4 py-2 text-xs font-bold">WhatsApp</button>
          <button onClick={() => shareOn("facebook", window.location.href, "Fiestas de l'Alfàs del Pi", "Consulta las peñas, la agenda y las novedades.")} className="glass-btn rounded-full px-4 py-2 text-xs font-bold">Facebook</button>
          <button onClick={() => shareOn("telegram", window.location.href, "Fiestas de l'Alfàs del Pi", "Consulta las peñas, la agenda y las novedades.")} className="glass-btn rounded-full px-4 py-2 text-xs font-bold">Telegram</button>
          <button onClick={() => shareOn("x", window.location.href, "Fiestas de l'Alfàs del Pi", "Consulta las peñas, la agenda y las novedades.")} className="glass-btn rounded-full px-4 py-2 text-xs font-bold">X</button>
          <button onClick={() => shareOn("email", window.location.href, "Fiestas de l'Alfàs del Pi", "Consulta las peñas, la agenda y las novedades.")} className="glass-btn rounded-full px-4 py-2 text-xs font-bold">Correo</button>
          <button onClick={() => void copyShareLink(window.location.href)} className="glass-btn rounded-full px-4 py-2 text-xs font-bold">Copiar enlace</button>
        </div>
      </footer>}
      {currentPage==="home" && shareReminder && <aside role="status" aria-live="polite" className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[2100] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-border bg-background p-4 shadow-2xl">
        <div className="min-w-0 flex-1"><p className="font-bold text-primary">¿Compartimos las fiestas?</p><p className="text-sm text-muted-foreground">Pasa la web a tus amigos para que nadie se pierda el programa ni los eventos.</p></div>
        <button onClick={() => { setShareReminder(false); localStorage.setItem("fiestas-share-reminder-last", String(Date.now())); }} className="shrink-0 rounded-full px-3 py-2 text-sm">Ahora no</button>
        <button onClick={() => { setShareReminder(false); void shareWebsite(); }} className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Compartir</button>
      </aside>}

      {selectedPenya && penyaGalleryOpen && <div className="fixed inset-0 z-[2147483102] festalfas-modal-backdrop flex items-center justify-center p-3 pt-[max(.75rem,env(safe-area-inset-top))]" role="dialog" aria-modal="true" aria-label={"Galería de "+selectedPenya.nombre} onClick={()=>{setPenyaGalleryOpen(false);setPenyaFotoAmpliada(null);setPenyaFotoZoom(1);}}>
        <section className="max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] border border-white/70 bg-[#f5f8f7] p-4 shadow-2xl sm:p-7" onClick={e=>e.stopPropagation()}>
          <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#9a7a32]">Recuerdos compartidos</p><h2 className="mt-1 text-xl font-black text-[#173f52] sm:text-2xl">Galería de {selectedPenya.nombre}</h2><p className="mt-1 text-xs text-[#6c8285]">{selectedPenyaGallery.length} elementos</p></div><div className="flex shrink-0 items-center gap-2">{<button type="button" onClick={()=>{if(puedeGestionarPenya(selectedPenya.id)){setPenyaGalleryOpen(false);setManagingPenyaPhotos(selectedPenya);}else window.alert("Solo los miembros de esta peña pueden añadir o modificar información. Selecciona tu peña en Ajustes o inicia sesión con una cuenta vinculada a ella.");}} className="inline-flex items-center gap-1.5 rounded-full bg-[#173f52] px-3 py-2 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-[#24566a] sm:px-4 sm:text-xs">＋ Añadir imágenes</button>}<button type="button" onClick={()=>{setPenyaGalleryOpen(false);setPenyaFotoAmpliada(null);setPenyaFotoZoom(1);}} aria-label="Cerrar galería" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#d6e2df] bg-white text-lg font-bold text-[#173f52]">✕</button></div></div>
          {selectedPenyaGallery.length>0?<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{selectedPenyaGallery.map((url,index)=><figure key={url} className="overflow-hidden rounded-xl border border-[#dce7e4] bg-white p-1.5 shadow-sm"><button type="button" onClick={()=>{setPenyaFotoZoom(1);setPenyaFotoAmpliada(selectedPenyaGallery.indexOf(url));}} aria-label={"Ampliar fotografía "+(index+1)} className="block h-[124px] w-full overflow-hidden rounded-lg"><img src={url} alt={"Foto "+(index+1)+" de "+selectedPenya.nombre} loading="lazy" style={selectedPenyaPhotoStyle(url)} className="h-full w-full rounded-lg bg-[#edf3f1] object-cover transition-transform duration-500 ease-out hover:scale-[1.02]"/></button><figcaption className="px-1 pb-1 pt-2 text-[10px] font-semibold text-[#52666b]">{selectedPenyaLogoBlocks.some((block:any)=>block.url===url)?"Logo oficial":selectedPenyaFeaturedGallery.includes(url)?"Foto destacada":"Recuerdo de la peña"}</figcaption></figure>)}</div>:<p className="rounded-xl border border-dashed border-[#cbdcdd] p-8 text-center text-sm text-[#6c8285]">Todavía no hay fotografías en esta galería.</p>}
        </section>
      </div>}
      {selectedPenya && penyaFotoAmpliada!==null && selectedPenyaGallery[penyaFotoAmpliada] && <div role="dialog" aria-modal="true" aria-label="Fotografía ampliada" className="fixed inset-0 z-[2147483103] festalfas-modal-backdrop flex items-center justify-center p-3 animate-in fade-in duration-300" onClick={()=>{setPenyaFotoAmpliada(null);setPenyaFotoZoom(1);}}><button type="button" aria-label="Cerrar fotografía" onClick={()=>{setPenyaFotoAmpliada(null);setPenyaFotoZoom(1);}} className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 text-3xl text-white transition duration-300 hover:rotate-90 hover:bg-white/20">×</button><button type="button" aria-label="Fotografía anterior" onClick={e=>{e.stopPropagation();setPenyaFotoZoom(1);setPenyaFotoAmpliada(i=>(i===null?0:(i-1+selectedPenyaGallery.length)%selectedPenyaGallery.length));}} className="absolute left-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/40 text-2xl text-white sm:left-5">‹</button><button type="button" aria-label="Fotografía siguiente" onClick={e=>{e.stopPropagation();setPenyaFotoZoom(1);setPenyaFotoAmpliada(i=>(i===null?0:(i+1)%selectedPenyaGallery.length));}} className="absolute right-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/40 text-2xl text-white sm:right-5">›</button><div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/20 bg-black/45 px-4 py-2 text-xs font-bold text-white"><button type="button" onClick={e=>{e.stopPropagation();setPenyaFotoZoom(v=>Math.max(1,v-.25));}}>−</button><span>{penyaFotoAmpliada+1} / {selectedPenyaGallery.length} · {Math.round(penyaFotoZoom*100)}%</span><button type="button" onClick={e=>{e.stopPropagation();setPenyaFotoZoom(v=>Math.min(3,v+.25));}}>＋</button></div><img src={selectedPenyaGallery[penyaFotoAmpliada]} alt={"Fotografía ampliada de "+selectedPenya.nombre} onClick={e=>{e.stopPropagation();setPenyaFotoZoom(v=>v>=2.5?1:v+0.5);}} onTouchStart={e=>{(e.currentTarget as HTMLImageElement).dataset["touchX"]=String(e.touches[0]?.clientX??0);}} onTouchEnd={e=>{const start=Number((e.currentTarget as HTMLImageElement).dataset["touchX"]||0);const delta=(e.changedTouches[0]?.clientX??start)-start;if(Math.abs(delta)>55)setPenyaFotoAmpliada(current=>current===null?null:(current+(delta<0?1:-1)+selectedPenyaGallery.length)%selectedPenyaGallery.length);}} style={{...selectedPenyaPhotoStyle(selectedPenyaGallery[penyaFotoAmpliada]),transform:`${selectedPenyaPhotoStyle(selectedPenyaGallery[penyaFotoAmpliada]).transform} scale(${penyaFotoZoom})`}} className="max-h-[82dvh] max-w-[94vw] cursor-zoom-in rounded-xl object-contain shadow-2xl transition-transform duration-200 animate-in zoom-in-90 ease-out"/></div>}
      {selectedPenya && (mapPenyaPreview ? <div className="fixed inset-0 z-[6000] festalfas-modal-backdrop flex items-center justify-center p-3 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={()=>{setSelectedPenya(null);setMapPenyaPreview(false);}}>
        <section role="dialog" aria-modal="true" aria-label={"Resumen de "+selectedPenya.nombre} onClick={e=>e.stopPropagation()} className="relative mt-[62px] max-h-[calc(100dvh-7rem-env(safe-area-inset-bottom))] w-full max-w-[370px] overflow-visible rounded-[1.45rem] border border-white/80 bg-white shadow-[0_24px_80px_rgba(4,24,33,.38)]">
          <button type="button" aria-label="Cerrar" onClick={()=>{setSelectedPenya(null);setMapPenyaPreview(false);}} className="absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-full border border-[#dce6e5] bg-white text-sm font-bold text-[#52666b] shadow-md">✕</button>
          <div className="pointer-events-none absolute left-1/2 top-0 z-20 grid h-[124px] w-[124px] shrink-0 -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-full border-[6px] border-white bg-[#edf3f3] text-3xl font-black text-[#173f52] shadow-[0_8px_24px_rgba(4,24,33,.2)]">{selectedPenyaLogo?<img src={selectedPenyaLogo} alt="" style={getPenyaPhotoImageStyle(penyaProfileLogoSettings[selectedPenya.id])} className="block h-full w-full min-h-0 min-w-0 rounded-full bg-white object-cover"/>:selectedPenya.nombre.slice(0,1).toUpperCase()}</div>
          <div className="max-h-[calc(100dvh-7rem-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain rounded-[1.45rem] px-4 pb-4 pt-[4.6rem]">
            <div className="min-w-0 text-center"><h2 className="mx-auto max-w-full break-words text-[20px] font-black leading-tight tracking-tight text-[#173f52]">{selectedPenya.nombre}</h2>{mayoralesPenyaId&&String(selectedPenya.id)===String(mayoralesPenyaId)&&<div className="mt-2 flex justify-center"><span className="inline-flex items-center gap-1 rounded-full border border-[#e6ce91] bg-[#fff7df] px-2.5 py-1 text-[9px] font-extrabold tracking-wide text-[#765c25]">♛ MAYORALES {mayoralesAnio}</span></div>}</div>
            
            {selectedPenya.direccion&&<div className="mt-3 flex items-start gap-2 rounded-xl border border-[#e5eceb] bg-[#f5f8f7] px-3 py-2.5 text-[11px] font-semibold leading-snug text-[#52666b]"><span className="text-[#b18d3d]">📍</span><span className="min-w-0">{selectedPenya.direccion}</span></div>}
            <div className="mt-3 flex flex-wrap gap-1.5">{selectedPenya.tipo_musica&&<span className="rounded-full bg-[#eaf1f2] px-2.5 py-1 text-[10px] font-bold text-[#24576a]">♫ {selectedPenya.tipo_musica}</span>}{(selectedPenyaEvents.length+selectedPenyaActs.length)>0&&<span className="rounded-full bg-[#f7f0df] px-2.5 py-1 text-[10px] font-bold text-[#806a2d]">▣ {selectedPenyaEvents.length+selectedPenyaActs.length} actividades</span>}</div>
            <div className="mt-3 rounded-2xl border border-[#e2eae8] bg-[#f5f8f7] px-2.5 pb-2.5 pt-2"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-[#52666b]">Momentos destacados</span><button type="button" onClick={()=>setPenyaGalleryOpen(true)} className="text-[9px] font-extrabold text-[#24576a] underline underline-offset-2">Ver todas ({selectedPenyaGallery.length})</button></div><div className="relative mx-auto flex h-[150px] w-full max-w-[440px] items-center justify-center overflow-hidden rounded-xl bg-[#e8efed]">
              {[0,1,2].map((slot)=>{const url=selectedPenyaFeaturedGallery[slot];const positions=["left-1/2 top-1 z-30 -translate-x-1/2 rotate-0","left-[12%] top-5 z-10 rotate-[-9deg]","right-[12%] top-5 z-20 rotate-[9deg]"];const widths=["w-[38%]","w-[32%]","w-[32%]"];return url?<button key={slot} type="button" onClick={()=>setPenyaFotoAmpliada(selectedPenyaGallery.indexOf(url))} aria-label={"Ampliar foto destacada "+(slot+1)} className={"absolute h-[124px] overflow-hidden rounded-xl border-[4px] border-white bg-white shadow-lg "+positions[slot]+" "+widths[slot]}><img src={url} alt={"Foto destacada "+(slot+1)+" de "+selectedPenya.nombre} loading="lazy" decoding="async" style={selectedPenyaPhotoStyle(url)} className="h-full w-full bg-white object-cover"/></button>:<div key={slot} aria-hidden="true" className={"absolute flex h-[112px] items-center justify-center rounded-xl border-[4px] border-white bg-gradient-to-br from-[#f2f6f4] to-[#d6e4e1] text-[#8ba29c] shadow-md "+positions[slot]+" "+widths[slot]}><span className="text-2xl">▧</span></div>;})}
            </div>
            <div className="mt-2 flex justify-center">
              <button type="button" onClick={()=>puedeGestionarPenya(selectedPenya.id)?setManagingPenyaPhotos(selectedPenya):window.alert("Solo las cuentas autorizadas como miembros de esta peña pueden añadir o modificar información. Seleccionar la peña en Ajustes no concede permisos automáticamente; la pertenencia debe estar aprobada.")} className="rounded-full bg-[#173f52] px-4 py-2 text-[10px] font-extrabold text-white shadow-md">＋ Añadir imágenes</button>
            </div>
          </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={()=>{setMapPenyaPreview(false);setCurrentPage("penyes");setPenyaDetailFullscreen(true);window.scrollTo({top:0,behavior:"smooth"});}} className="flex-1 rounded-xl bg-[#173f52] px-3 py-3 text-[12px] font-extrabold text-white shadow-sm transition hover:bg-[#24566a]">Ver ficha completa <span aria-hidden="true">↗</span></button>
              <button type="button" aria-label="Cerrar ventana" onClick={()=>{setSelectedPenya(null);setMapPenyaPreview(false);}} className="rounded-xl border border-[#dce6e5] bg-white px-4 py-3 text-[12px] font-bold text-[#52666b] transition hover:bg-[#f5f8f7]">Cerrar</button>
            </div>
          </div>
        </section>
      </div> : (
        <div className={`fixed inset-0 z-[2147483002] flex justify-center ${penyaDetailFullscreen ? "bg-[#102f3d] items-stretch p-0" : "festalfas-modal-backdrop items-end p-0 pt-[max(1rem,env(safe-area-inset-top))] sm:items-center sm:p-5"}`} onClick={() => closePenyaDetail()}>
          <section role="dialog" aria-modal="true" aria-label={selectedPenya.nombre} onClick={(e) => e.stopPropagation()} className={`penya-profile-sheet w-full overflow-auto overscroll-contain border border-border bg-background pb-[calc(105px+env(safe-area-inset-bottom))] shadow-[0_30px_100px_rgba(4,25,34,.42)] ${penyaDetailFullscreen ? "h-[100dvh] max-h-[100dvh] max-w-none rounded-none" : "max-h-[94dvh] max-w-[min(96vw,1500px)] rounded-t-[1.75rem] sm:rounded-[2rem]"}`}>
            <div className="penya-profile-banner relative isolate h-[250px] overflow-hidden bg-[#c9e9f1] sm:h-[330px] lg:h-[370px]" style={{height:`clamp(250px,25vw,${selectedPenyaBannerBlock?.height??370}px)`,background:selectedPenyaBannerBlock?.bannerMode==="image"&&selectedPenyaBannerBlock?.url?`linear-gradient(180deg,rgba(23,63,82,.12) 0%,rgba(23,63,82,.03) 34%,rgba(23,63,82,.12) 62%,rgba(23,63,82,.34) 100%),url("${selectedPenyaBannerBlock.url}") center / cover no-repeat`:selectedPenyaBannerBlock?selectedPenyaBannerGradient:"linear-gradient(90deg,#173f52,#286477 55%,#c6a24b)",backgroundPosition:selectedPenyaBannerBlock?.bannerMode==="image"?`${selectedPenyaBannerBlock?.positionX??50}% ${selectedPenyaBannerBlock?.positionY??50}%`:"center",backgroundSize:selectedPenyaBannerBlock?.bannerMode==="image"?`${(selectedPenyaBannerBlock?.zoom??100)}%`:"cover"}}>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                {/* Zona reservada para las pegatinas personalizadas de cada peña. */}
              </div>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20" style={{background:"linear-gradient(180deg, transparent 0%, transparent 34%, color-mix(in srgb, var(--background) 5%, transparent) 48%, color-mix(in srgb, var(--background) 18%, transparent) 62%, color-mix(in srgb, var(--background) 42%, transparent) 76%, color-mix(in srgb, var(--background) 72%, transparent) 88%, var(--background) 100%)"}}/>
              <button onClick={() => closePenyaDetail()} aria-label="Cerrar ficha" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-30 grid h-10 w-10 place-items-center rounded-full border border-white/65 bg-white/65 text-lg font-bold text-[#173f52] shadow-lg backdrop-blur-xl transition hover:scale-105">✕</button>
            </div>
            <div className="relative z-30 mx-auto -mt-[160px] w-full max-w-[1500px] px-4 pb-5 sm:-mt-[142px] sm:px-7 lg:px-12 xl:px-16 2xl:px-20">
              <div className="relative flex flex-col items-center text-center">
                <div className="relative z-30 grid h-44 w-44 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-white text-5xl font-black text-[#173f52] shadow-[0_10px_34px_rgba(4,25,34,.22)] sm:h-56 sm:w-56  lg:h-72 lg:w-72 xl:h-80 xl:w-80" >{selectedPenyaLogo?<img src={selectedPenyaLogo} alt={"Foto de perfil de "+selectedPenya.nombre} style={getPenyaPhotoImageStyle(penyaProfileLogoSettings[selectedPenya.id])} className="h-full w-full bg-white object-cover"/>:selectedPenya.nombre.slice(0,1).toUpperCase()}</div>
                {(mayoralesPenyaId&&String(selectedPenya.id)===String(mayoralesPenyaId))&&<div className="mt-2"><span className="inline-flex items-center gap-1 rounded-full border border-[#e6ce91] bg-[#fff7df] px-3 py-1 text-[10px] font-extrabold tracking-wide text-[#765c25] sm:text-xs">♛ MAYORALES {mayoralesAnio}</span></div>}
                <h2 className="mt-2 max-w-4xl break-words text-[26px] font-black leading-tight tracking-tight text-[#173f52] sm:mt-3 sm:text-4xl lg:text-[2.65rem]">{selectedPenya.nombre}</h2>

                
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">{puedeAdministrarPenya(selectedPenya.id)&&<button type="button" onClick={()=>setEditingPenyaProfile(selectedPenya)} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground shadow-sm transition hover:-translate-y-0.5">⚙ Editar mi peña</button>}{selectedPenya.lat!=null&&selectedPenya.lng!=null&&<button type="button" onClick={()=>{const id=selectedPenya.id;setSelectedPenya(null);setPenyaDetailFullscreen(false);goMap(id);}} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#d8e5e2] bg-white/90 px-4 py-2 text-xs font-extrabold text-[#24576a] shadow-sm transition hover:-translate-y-0.5">📍 Ver en el mapa</button>}{!selectedPenya.direccion&&<span className="inline-flex min-h-9 items-center rounded-full border border-[#e5eceb] bg-[#f5f8f7] px-3 py-2 text-[11px] font-bold text-[#52666b]">Sin ubicación registrada</span>}{selectedPenyaAcceptsVisits&&<span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-800"><span aria-hidden="true">✓</span> Esta peña acepta visitas</span>}</div>
              </div>
              {(() => {
                const profileTags = selectedPenyaCustomBlocks.filter((block:any)=>block.type==="tag" && String(block.title||"").trim() && !/^(acepta visitas|esta peña acepta visitas|puertas abiertas)$/i.test(String(block.title).trim())).map((block:any)=>String(block.title).trim());
                const memberCount = [(selectedPenya as any).miembros_actuales, (selectedPenya as any).numero_miembros, (selectedPenya as any).miembros].find((value)=>typeof value==="number" && Number.isFinite(value) && value>0);
                const tags = [...(selectedPenya.asociada===false ? ["No asociada"] : []), ...(selectedPenya.tipo_musica ? ["♫ "+selectedPenya.tipo_musica] : []), ...(memberCount ? ["👥 "+memberCount+" miembros"] : []), ...profileTags, ...(misPenyes.includes(selectedPenya.id) ? ["★ Mi peña"] : [])].slice(0,4);
                const profilePhotos = selectedPenyaFeaturedGallery.slice(0,3);
                return <>
                  <div id="ficha-presentacion" className="mb-1 flex min-h-8 flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {tags.map((tag,index)=><span key={index} className={["rounded-full border px-3 py-1.5 text-[10px] font-bold shadow-sm sm:text-xs", "border-[#f3c5d7] bg-[#fff0f5] text-[#9d4567]", "border-[#c6d9f4] bg-[#edf5ff] text-[#315f9a]", "border-[#d7c8ed] bg-[#f5efff] text-[#70509b]", "border-[#c9e5d8] bg-[#eefaf3] text-[#367457]"][index%5]}>{tag}</span>)}
                  </div>
                  <section id="ficha-galeria" className="relative mt-5 overflow-hidden bg-transparent px-0 pb-3 pt-2 sm:mt-7">
                    <div className="mb-3 flex items-end justify-between gap-3 px-1"><div><h3 className="text-xl font-extrabold tracking-tight text-[#173f52] sm:text-2xl">Momentos destacados</h3><p className="mt-1 text-xs text-[#7b9293] sm:text-sm">Sus recuerdos más destacados</p></div><button type="button" onClick={()=>setPenyaGalleryOpen(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#d4e0de] bg-white px-3 py-2 text-[10px] font-extrabold text-[#24576a] shadow-sm transition hover:border-[#d4af37] sm:px-4 sm:text-xs">Ver galería ↗ <span className="rounded-full bg-[#edf3f1] px-1.5 py-0.5">{selectedPenyaGallery.length}</span></button></div>
                    <div className="relative mx-auto h-[250px] w-full max-w-none sm:h-[340px] lg:h-[430px] xl:h-[460px]">
                      {[0,1,2].map((slot)=>{const url=profilePhotos[slot];const positions=["left-1/2 top-0 z-30 -translate-x-1/2 rotate-0","left-[7%] top-8 z-10 -rotate-[9deg]","right-[7%] top-8 z-20 rotate-[9deg]"];const widths=["w-[48%] sm:w-[40%] lg:w-[38%] xl:w-[36%]","w-[43%] sm:w-[38%] lg:w-[36%] xl:w-[34%]","w-[43%] sm:w-[38%] lg:w-[36%] xl:w-[34%]"];return url?<button key={slot} type="button" onClick={()=>setPenyaFotoAmpliada(selectedPenyaGallery.indexOf(url))} aria-label={"Ampliar fotografía destacada "+(slot+1)} className={"group absolute h-[220px] overflow-hidden rounded-[1.25rem] border-[4px] border-white bg-[#e6eeeb] shadow-[0_12px_32px_rgba(23,63,82,.18)] transition-[transform,box-shadow] duration-700 ease-[cubic-bezier(.2,.75,.25,1)] will-change-transform hover:z-40 hover:scale-[1.055] hover:shadow-[0_20px_44px_rgba(23,63,82,.28)] sm:h-[310px] lg:h-[350px] sm:rounded-[1.5rem] "+positions[slot]+" "+widths[slot]}><img src={url} alt={selectedPenya.nombre+" · recuerdo "+(slot+1)} loading="lazy" decoding="async" style={selectedPenyaPhotoStyle(url)} className="h-full w-full object-cover"/></button>:<div key={slot} aria-hidden="true" className={"absolute flex h-[220px] items-center justify-center overflow-hidden rounded-[1.25rem] border-[4px] border-white bg-gradient-to-br from-[#edf3f1] to-[#dce8e4] text-[#8ba29c] shadow-[0_12px_32px_rgba(23,63,82,.12)] sm:h-[310px] lg:h-[350px] sm:rounded-[1.5rem] "+positions[slot]+" "+widths[slot]}><span className={slot===0?"text-5xl sm:text-6xl":"text-3xl sm:text-4xl"}>▧</span></div>;})}
                    </div>
                    <div className="mt-3 flex min-h-9 items-center justify-center">
                      <button type="button" onClick={()=>puedeGestionarPenya(selectedPenya.id)?setManagingPenyaPhotos(selectedPenya):avisarAccesoPenya()} className="rounded-full bg-[#173f52] px-5 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-[#24566a]">＋ Añadir imágenes</button>
                    </div>
                  </section>
                </>;
              })()}
              <PenyaAwardsSection awards={selectedPenyaAwards} penyaName={selectedPenya.nombre} siteContent={siteContent}/>
              <div className="mt-4 grid grid-cols-1 items-start gap-3 sm:gap-4 lg:grid-cols-2">
              
              {selectedPenyaCustomBlocks.length>0 && <div id="ficha-personalizada" className="mt-3 space-y-3 scroll-mt-24">
                {selectedPenyaCustomBlocks.map((block:any,index:number)=>{
                  const title=String(block.title||"").trim(); const content=String(block.content||"").trim(); const url=safeHttpUrl(block.url);
                  if(block.type==="photo")return null;
                  if(block.type==="video"&&url){const embed=penyaVideoEmbed(url);return <section key={block.id||index} className="rounded-2xl border border-border/70 bg-white/60 p-4 sm:p-5">{title&&<h3 className="mb-3 text-lg font-extrabold text-primary">{title}</h3>}{embed.endsWith(".mp4")?<video src={embed} controls playsInline preload="metadata" className="w-full rounded-xl bg-black"/>:embed?<div className="aspect-video overflow-hidden rounded-xl bg-black"><iframe src={embed} title={title||"Vídeo de "+selectedPenya.nombre} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/></div>:<a href={url} target="_blank" rel="noreferrer" className="text-sm font-bold text-primary underline">Ver vídeo ↗</a>}</section>;}
                  if(block.type==="link"&&url)return <section key={block.id||index} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-primary/[0.045] p-4 sm:p-5"><div>{title&&<h3 className="font-extrabold text-primary">{title}</h3>}{content&&<p className="mt-1 text-sm text-muted-foreground">{content}</p>}</div><a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-full bg-[#173f52] px-4 py-2 text-sm font-bold text-white">Abrir enlace ↗</a></section>;
                  if(block.type==="highlight"&&(title||content))return <section key={block.id||index} className="rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#f7f1df] to-[#eef4f0] p-5 text-[#173f52] sm:p-6"><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#92701d]">Nuestra esencia</p>{title&&<h3 className="mt-1 text-xl font-extrabold">{title}</h3>}{content&&<p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{content}</p>}</section>;
                  if(block.type==="list"&&(title||content))return <section key={block.id||index} className="rounded-2xl border border-border/70 bg-white/60 p-4 sm:p-5">{title&&<h3 className="mb-3 text-lg font-extrabold text-primary">{title}</h3>}<ul className="grid gap-2 sm:grid-cols-2">{content.split(String.fromCharCode(10)).map((item:string,i:number)=>item.trim()&&<li key={i} className="flex items-start gap-2 text-sm text-foreground"><span className="mt-0.5 text-primary">✦</span><span>{item.trim()}</span></li>)}</ul></section>;
                  if((block.type==="text"||!block.type)&&(title||content))return <section key={block.id||index} className="rounded-2xl border border-border/70 bg-white/60 p-4 sm:p-5">{title&&<h3 className="mb-2 text-lg font-extrabold text-primary">{title}</h3>}{content&&<p className="whitespace-pre-line text-[15px] leading-7 text-[#40575e] sm:text-base sm:leading-8">{content}</p>}</section>;
                  return null;
                })}
              </div>}
              {selectedPenyaNews.length > 0 && <section id="ficha-novedades" className="col-span-full mt-4 w-full min-w-0 rounded-[1.5rem] border border-[#dce7e4] bg-white p-4 shadow-[0_8px_28px_rgba(23,63,82,.055)] sm:p-6"><h3 className="mb-3 text-xl font-extrabold text-primary">Lo último de nuestra peña</h3><div className="space-y-3">{selectedPenyaNews.map((n:any)=><button key={n.id} type="button" onClick={()=>{setSelectedPenya(null);setCurrentPage("noticias");setNoticiaSeleccionada(n);window.scrollTo({top:0,behavior:"smooth"});}} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-white/75 p-3 text-left transition hover:border-primary/40 hover:shadow-sm"><span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{new Date(n.fecha||n.created_at||Date.now()).toLocaleDateString("es-ES",{day:"numeric",month:"short"})}</span><span className="mt-1 block font-bold leading-snug text-primary">{n.titulo}</span><span className="mt-1 block text-xs font-bold text-primary">Ver publicación →</span></span></button>)}</div></section>}

              <div id="ficha-planes" className="min-w-0 rounded-[1.5rem] border border-[#dce7e4] bg-white p-5 shadow-[0_8px_28px_rgba(23,63,82,.055)] sm:p-7 lg:col-span-2">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold text-primary">Próximos planes</h3>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agenda</span>
                </div>
                {(eventos.filter((e) => eventoSigueActivo(e,now) && (e.penya_id === selectedPenya.id || [e.titulo, e.descripcion, e.lugar].some((v) => String(v || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(selectedPenya.nombre.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, ""))))).length + actos.filter((a) => eventoSigueActivo(a,now) && [a.titulo, a.descripcion, a.lugar].some((v) => String(v || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(selectedPenya.nombre.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "")))).length) ? (
                  <div className="space-y-3">
                    {[...eventos.filter((e) => eventoSigueActivo(e,now) && (e.penya_id === selectedPenya.id || [e.titulo, e.descripcion, e.lugar].some((v) => String(v || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(selectedPenya.nombre.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, ""))))), ...actos.filter((a) => eventoSigueActivo(a,now) && [a.titulo, a.descripcion, a.lugar].some((v) => String(v || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(selectedPenya.nombre.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, ""))))].map((e) => {
                      const fecha = new Date(String(e.dia).slice(0, 10) + "T12:00:00");
                      const diaNumero = fecha.toLocaleDateString("es-ES", { day: "2-digit" });
                      const mes = fecha.toLocaleDateString("es-ES", { month: "short" }).replace(".", "").toUpperCase();
                      return <article key={e.id} className="overflow-hidden rounded-2xl border border-border/70 bg-white/70 shadow-sm">
                        <div className="grid grid-cols-[104px_1fr] sm:grid-cols-[124px_1fr]">
                          <div className="flex min-h-[142px] flex-col items-center justify-center bg-[#e8b9c9] px-2 py-4 text-center text-[#173f52]">
                            <span className="text-xs font-extrabold uppercase tracking-[0.18em]">{mes}</span>
                            <span className="font-display text-5xl font-bold leading-none">{diaNumero}</span>
                            <span className="mt-2 rounded-full bg-white/70 px-3 py-1 text-sm font-bold">{e.hora || "Hora por confirmar"}</span>
                          </div>
                          <div className="min-w-0 p-4 sm:p-5">
                            <h4 className="text-lg font-bold leading-tight text-primary sm:text-xl">{e.titulo}</h4>
                            {e.descripcion && <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{e.descripcion}</p>}
                            {e.lugar && <p className="mt-3 text-xs font-semibold text-muted-foreground">📍 {e.lugar}</p>}
                          </div>
                        </div>
                        {e.imagen_url && <img src={e.imagen_url} alt={"Cartel de " + e.titulo} loading="lazy" className="max-h-64 w-full object-cover" />}
                      </article>;
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-glass p-5 text-sm text-muted-foreground">Esta peña todavía no ha publicado ningún plan. ¡Vuelve a consultar sus próximos planes pronto!</div>
                )}
              </div>

              <div className="mt-5 flex w-full flex-nowrap items-stretch justify-center gap-2 rounded-2xl border border-[#dce7e4] bg-white/90 p-2 shadow-sm sm:mx-auto sm:max-w-4xl sm:gap-3 sm:p-3">
                <button onClick={() => puedeGestionarPenya(selectedPenya.id) ? setEventFormPenya(selectedPenya) : avisarAccesoPenya()} className="flex min-w-0 flex-1 items-center justify-center rounded-xl bg-primary px-1.5 py-3 text-center text-[10px] font-bold leading-tight text-primary-foreground sm:px-3 sm:text-sm">＋ <span>Proponer un plan</span></button>
                <button disabled={penyaMembershipLoading} onClick={() => void toggleMiPenya(selectedPenya.id)} aria-pressed={misPenyes.includes(selectedPenya.id)} className="flex min-w-0 flex-1 items-center justify-center rounded-xl border border-primary/20 bg-white px-1.5 py-3 text-center text-[10px] font-bold leading-tight text-primary sm:px-3 sm:text-sm">{misPenyes.includes(selectedPenya.id) ? "★ " : "☆ "}<span>Mi peña</span></button>
                {instagramUrl(selectedPenya.instagram) && <a className="flex min-w-0 flex-1 items-center justify-center rounded-xl bg-[#173f52] px-1.5 py-3 text-center text-[10px] font-bold leading-tight text-white sm:px-3 sm:text-sm" href={instagramUrl(selectedPenya.instagram)!} target="_blank" rel="noreferrer"><span>Instagram ↗</span></a>}
                <button onClick={() => puedeGestionarPenya(selectedPenya.id) ? setEventFormPenya(selectedPenya) : avisarAccesoPenya()} className="flex min-w-0 flex-1 items-center justify-center rounded-xl border border-primary/20 bg-white px-1.5 py-3 text-center text-[10px] font-bold leading-tight text-primary sm:px-3 sm:text-sm"><span>{selectedPenya.tiene_evento ? "Añadir evento" : "+ Añadir evento"}</span></button>
              </div>
              {penyaAccessNotice && <div role="status" className="mt-3 rounded-xl border border-[#e7d7a7] bg-[#fff9e9] px-4 py-3 text-xs leading-relaxed text-[#72591d]"><strong>Solo los miembros de esta peña pueden añadir o modificar información.</strong> Selecciona esta peña en Ajustes de tu cuenta o inicia sesión con una cuenta vinculada a ella. La edición completa de la ficha está reservada a sus administradores. <button type="button" onClick={()=>setPenyaAccessNotice(false)} className="ml-1 font-extrabold underline">Cerrar</button></div>}
              {puedeAdministrarPenya(selectedPenya.id) && <div className="mt-8 flex justify-center border-t border-[#dce7e4] pt-6"><button type="button" onClick={()=>setEditingPenyaProfile(selectedPenya)} className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-sm transition hover:opacity-90">⚙ Editar ficha de esta peña</button></div>}
              </div>
            </div>
          </section>
        </div>
      ))}
      {eventFormPenya && (
        <ClientOnly><Suspense fallback={null}><AddPenyaEventForm penyaId={eventFormPenya.id} penyaName={eventFormPenya.nombre} onClose={() => setEventFormPenya(null)} onSaved={(organizaEvento) => { setEventFormPenya(null); void cargar(); window.alert(organizaEvento ? "¡Evento enviado! Aparecerá en la web cuando sea aprobado." : "Se ha guardado que esta peña no organiza ningún evento."); }} /></Suspense></ClientOnly>
      )}

      {communityEventForm && <ClientOnly><Suspense fallback={null}><AddCommunityEventForm onClose={() => setCommunityEventForm(false)} onSaved={() => { setCommunityEventForm(false); void cargar(); window.alert("¡Propuesta enviada! Se revisará antes de publicarse en la agenda."); }} /></Suspense></ClientOnly>}

      {form && (
        <ClientOnly>
          <Suspense fallback={null}>
            <AddPenyaForm onClose={() => setForm(false)} onSaved={() => { setForm(false); cargar(); }} />
          </Suspense>
        </ClientOnly>
      )}
      <CopyrightFooter />
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-2xl font-bold text-primary sm:mb-8 sm:text-5xl">{children}</h2>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "glass-btn"}`}>
      {children}
    </button>
  );
}
