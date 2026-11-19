import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { edicion, lugares as lugaresFijos, ui, type Categoria, type Lugar } from "@/content/fiestas";
import { supabase } from "@/integrations/supabase/client";
import AdminPenyaEditor from "@/components/AdminPenyaEditor";
import CopyrightFooter from "@/components/CopyrightFooter";
import { noticiaCuBaTa2027 } from "@/content/noticia-cubata-2027";
import { noticiaCestaNavidad2027 } from "@/content/noticia-cesta-navidad-2027";
import { noticiaDesfileHumor2026 } from "@/content/noticia-desfile-humor-2026";
const videoCover=(url?:string)=>{if(!url)return "";const match=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/i);return match?"https://img.youtube.com/vi/"+match[1]+"/hqdefault.jpg":"";};


const FestMap = lazy(() => import("@/components/FestMap"));
const AddPenyaForm = lazy(() => import("@/components/AddPenyaForm"));
const AddPenyaEventForm = lazy(() => import("@/components/AddPenyaEventForm"));
const AddCommunityEventForm = lazy(() => import("@/components/AddCommunityEventForm"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "festalfàs" },
      { name: "description", content: "Descubre festalfàs: programa de fiestas de l'Alfàs del Pi, peñas, eventos, mapa, actualidad y noticias de las fiestas." },
      { name: "keywords", content: "festalfàs, festalfas, fiestas l'Alfàs del Pi, fiestas Alfaz del Pi, peñas Alfaz del Pi, programa fiestas Alfaz, eventos Alfaz del Pi" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "festalfàs" },
      { property: "og:description", content: "Programa de fiestas, peñas, eventos, mapa y noticias de l'Alfàs del Pi." },
      { property: "og:url", content: "https://festalfas.vercel.app/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://festalfas.vercel.app/" },
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

function esPenyaCuBaTa(nombre: string) {
  const nombreNormalizado = nombre.toLocaleLowerCase("es").normalize("NFD").replace(/[^a-z0-9]/g, "");
  return nombreNormalizado.includes("cubata") || nombreNormalizado.includes("cobrebariotantalo") ||
    (nombreNormalizado.includes("cobre") && nombreNormalizado.includes("bario") && nombreNormalizado.includes("tantal"));
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
type PenyaDb = { id: string; nombre: string; direccion: string | null; lat: number | null; lng: number | null; foto: string; tipo_musica: string; tiene_evento?: boolean; instagram?: string | null; informacion?: string | null };
const penyaStickerSets = [
  [{src:"https://w7.pngwing.com/pngs/57/50/png-transparent-trumpet-musical-instrument-ico-icon-carnival-holidays-text-orange.png",className:"penya-sticker-dolcaina"},{src:"https://w7.pngwing.com/pngs/557/101/png-transparent-watercolor-splashes-of-party-popper-emoji-confetti-and-celebration-vibes.png",className:"penya-sticker-confetti"}],
  [{src:"https://e7.pngegg.com/pngimages/566/125/png-clipart-firecracker-fireworks-fireworks-holidays-illustrator.png",className:"penya-sticker-polvora"},{src:"https://w7.pngwing.com/pngs/99/907/png-transparent-musical-ensemble-school-band-marching-band-citizens-band-radio-team-logo-musician.png",className:"penya-sticker-banda"}],
  [{src:"https://w7.pngwing.com/pngs/557/101/png-transparent-watercolor-splashes-of-party-popper-emoji-confetti-and-celebration-vibes.png",className:"penya-sticker-confetti"},{src:"https://w7.pngwing.com/pngs/57/50/png-transparent-trumpet-musical-instrument-ico-icon-carnival-holidays-text-orange.png",className:"penya-sticker-dolcaina"},{src:"https://e7.pngegg.com/pngimages/566/125/png-clipart-firecracker-fireworks-fireworks-holidays-illustrator.png",className:"penya-sticker-polvora"}]
];
function getPenyaStickerSet(id:string){const seed=Array.from(id).reduce((sum,char)=>sum+char.charCodeAt(0),0);return penyaStickerSets[seed%penyaStickerSets.length]||penyaStickerSets[0]!;}
const safeHttpUrl=(value:any)=>{try{const url=new URL(String(value||""));return url.protocol==="https:"||url.protocol==="http:"?url.toString():"";}catch{return "";}};
const penyaVideoEmbed=(value:any)=>{const raw=safeHttpUrl(value);if(!raw)return "";try{const url=new URL(raw);if(url.hostname==="youtu.be")return "https://www.youtube-nocookie.com/embed/"+url.pathname.slice(1).split("/")[0];if(url.hostname.endsWith("youtube.com")){const id=url.searchParams.get("v")||url.pathname.split("/").filter(Boolean).pop();return id?"https://www.youtube-nocookie.com/embed/"+id:"";}if(url.hostname.endsWith("vimeo.com")){const id=url.pathname.split("/").filter(Boolean).pop();return id?"https://player.vimeo.com/video/"+id:"";}return /\.mp4(?:$|[?#])/i.test(url.pathname)?raw:"";}catch{return "";}};
const normalizarBusqueda=(value:any)=>String(value||"").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
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
  const [q, setQ] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [newsSearch, setNewsSearch] = useState("");
  const [penyaSearch, setPenyaSearch] = useState("");
  const [penyaMusicFilter, setPenyaMusicFilter] = useState("Todas");
  const [penyaOnlyMine, setPenyaOnlyMine] = useState(false);
  const [activePenyaCard, setActivePenyaCard] = useState(0);
  const [penyaCarouselInitialized, setPenyaCarouselInitialized] = useState(false);
  const [editingFeaturedPenya, setEditingFeaturedPenya] = useState<PenyaDb | null>(null);
  const penyaCarouselRef = useRef<HTMLDivElement | null>(null);
  const penyaScrollFrameRef = useRef<number | null>(null);
  const [eventsSearch, setEventsSearch] = useState("");
  const [filterDay, setFilterDay] = useState<"upcoming"|"today"|"tomorrow"|"all">("upcoming");
  const [filterCategory, setFilterCategory] = useState<"all"|"programa"|"actuaciones"|"penyes">("all");
  const [currentPage, setCurrentPage] = useState<"home"|"noticias"|"buscar"|"eventos"|"mapa"|"penyes"|"info">("home");
  const [accountUser, setAccountUser] = useState<any>(null);
  const [accountMode, setAccountMode] = useState<"register"|"login">("register");
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [personalPrefs, setPersonalPrefs] = useState({ showImportantNotices: true, reduceMotion: false, largeText: false, highContrast: false });
  const [avisos, setAvisos] = useState<any[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [mapPoints, setMapPoints] = useState<Lugar[]>([]);
  const [cat, setCat] = useState<Categoria | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [penyes, setPenyes] = useState<PenyaDb[]>([]);
  const [misPenyes, setMisPenyes] = useState<string[]>([]);
  const [actos, setActos] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [noticias, setNoticias] = useState<any[]>([]);
  const [noticiaSeleccionada, setNoticiaSeleccionada] = useState<any | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<number | null>(null);
  const [newsPopup, setNewsPopup] = useState<any[]>([]);
  const [siteContent, setSiteContent] = useState<Record<string,string>>({});
  const penyaCardSettings = useMemo(()=>{try{const parsed=JSON.parse(siteContent["penyas_cards_json"]||"{}");return parsed&&typeof parsed==="object"?parsed as Record<string,{color?:string;logo_url?:string;title?:string;description?:string;logo_scale?:number;logo_x?:number;logo_y?:number}>:{ };}catch{return {}; }},[siteContent]);
  const penyaProfileLogoSettings = useMemo(()=>{try{const parsed=JSON.parse(siteContent["penyes_logos_ficha_json"]||"{}");return parsed&&typeof parsed==="object"?parsed as Record<string,{zoom?:number;x?:number;y?:number;frameScale?:number}>:{ };}catch{return {}; }},[siteContent]);
  const [heroImage, setHeroImage] = useState("");
  const [form, setForm] = useState(false);
  const [shareReminder, setShareReminder] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [selectedPenya, setSelectedPenya] = useState<PenyaDb | null>(null);
  const [penyaDetailFullscreen, setPenyaDetailFullscreen] = useState(false);
  const [mapPenyaPreview, setMapPenyaPreview] = useState(false);
  const [penyaGalleryOpen, setPenyaGalleryOpen] = useState(false);
  const [penyaFotoAmpliada, setPenyaFotoAmpliada] = useState<number | null>(null);
  const [penyaFotoZoom,setPenyaFotoZoom]=useState(1);
  const [eventFormPenya, setEventFormPenya] = useState<PenyaDb | null>(null);
  const [communityEventForm, setCommunityEventForm] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [currentPage, noticiaSeleccionada?.id, mapFullscreen]);
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
  const mayoralesPenyaId = String(siteContent["mayorales_penya_id"]||"");
  const mayoralesAnio = String(siteContent["mayorales_anio"]||"2027");
  const visiblePenyes = useMemo(()=>[...penyes].filter(p=>(!penyaSearch.trim()||normalizarBusqueda([p.nombre,p.direccion,p.tipo_musica,p.informacion].join(" ")).includes(normalizarBusqueda(penyaSearch)))&&(penyaMusicFilter==="Todas"||String(p.tipo_musica||"").trim()===penyaMusicFilter)&&(!penyaOnlyMine||misPenyes.includes(p.id))).sort((a,b)=>Number(mayoralesPenyaId?b.id===mayoralesPenyaId:esPenyaCuBaTa(b.nombre))-Number(mayoralesPenyaId?a.id===mayoralesPenyaId:esPenyaCuBaTa(a.nombre))||a.nombre.localeCompare(b.nombre,"es",{sensitivity:"base"})),[penyes,penyaSearch,penyaMusicFilter,penyaOnlyMine,misPenyes,mayoralesPenyaId]);
  const loopedPenyes = visiblePenyes.length > 1 ? [...visiblePenyes,...visiblePenyes,...visiblePenyes] : [...visiblePenyes];
  const centerPenyaCard=useCallback((index:number,behavior:ScrollBehavior="auto")=>{const el=penyaCarouselRef.current;const card=el?.children[index] as HTMLElement|undefined;if(!el||!card)return;const delta=card.getBoundingClientRect().left-el.getBoundingClientRect().left;const left=el.scrollLeft+delta-(el.clientWidth-card.clientWidth)/2;el.scrollTo({left,behavior});},[]);
  const handlePenyaCarouselScroll=(el:HTMLDivElement)=>{if(penyaScrollFrameRef.current!==null)cancelAnimationFrame(penyaScrollFrameRef.current);penyaScrollFrameRef.current=requestAnimationFrame(()=>{const count=visiblePenyes.length;if(count<=1){setActivePenyaCard(0);penyaScrollFrameRef.current=null;return;}const center=el.getBoundingClientRect().left+el.clientWidth/2;let nearest=0;let distance=Number.POSITIVE_INFINITY;Array.from(el.children).forEach((child,index)=>{const rect=child.getBoundingClientRect();const d=Math.abs(rect.left+rect.width/2-center);if(d<distance){distance=d;nearest=index;}});if(nearest<count||nearest>=count*2){const normalized=((nearest%count)+count)%count;const targetIndex=normalized+count;const target=el.children[targetIndex] as HTMLElement|undefined;if(target){const delta=target.getBoundingClientRect().left-el.getBoundingClientRect().left;el.scrollLeft=el.scrollLeft+delta-(el.clientWidth-target.clientWidth)/2;}nearest=targetIndex;}setActivePenyaCard(current=>current===nearest?current:nearest);penyaScrollFrameRef.current=null;});};
  useEffect(()=>{if(currentPage!=="penyes"||!visiblePenyes.length){setPenyaCarouselInitialized(false);return;}setPenyaCarouselInitialized(false);const middle=visiblePenyes.length>1?visiblePenyes.length:0;setActivePenyaCard(middle);const frame=requestAnimationFrame(()=>{const el=penyaCarouselRef.current;const card=el?.children[middle] as HTMLElement|undefined;if(el&&card){const delta=card.getBoundingClientRect().left-el.getBoundingClientRect().left;el.scrollLeft=el.scrollLeft+delta-(el.clientWidth-card.clientWidth)/2;}setPenyaCarouselInitialized(true);});return()=>cancelAnimationFrame(frame);},[currentPage,visiblePenyes.length,penyaSearch,penyaMusicFilter,penyaOnlyMine,mayoralesPenyaId,misPenyes]);
  useEffect(()=>{if(!penyaCarouselInitialized)return;const handleResize=()=>centerPenyaCard(activePenyaCard);window.addEventListener("resize",handleResize,{passive:true});return()=>window.removeEventListener("resize",handleResize);},[penyaCarouselInitialized,activePenyaCard,centerPenyaCard]);
  useEffect(()=>()=>{if(penyaScrollFrameRef.current!==null)cancelAnimationFrame(penyaScrollFrameRef.current);},[]);
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
      if (Array.isArray(saved)) setMisPenyes(saved.filter((id): id is string => typeof id === "string"));
    } catch { setMisPenyes([]); }
  }, []);
  const toggleMiPenya = (id: string) => {
    setMisPenyes((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      try { localStorage.setItem("festalfas-mis-penyes", JSON.stringify(next)); } catch { /* La selección sigue activa durante esta visita. */ }
      return next;
    });
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
      const last = Number(localStorage.getItem(key) || 0);
      if (Date.now() - last >= 30 * 60 * 1000) setShareReminder(true);
    };
    const first = window.setTimeout(shouldShow, 90_000);
    const repeat = window.setInterval(shouldShow, 5 * 60 * 1000);
    return () => { window.clearTimeout(first); window.clearInterval(repeat); };
  }, []);

  const cargar = useCallback(async () => {
    const [penyaResult, { data: actosData }, { data: eventosData }, { data: contentData }] = await Promise.all([
      supabase.from("penyes").select("id,nombre,direccion,lat,lng,foto_url,tipo_musica,tiene_evento,instagram,informacion").eq("estado","aprobada").order("nombre"),
      supabase.from("actos").select("*").eq("publicado",true).order("dia").order("hora"),
      supabase.from("eventos").select("*").eq("publicado",true).order("dia").order("hora"),
      supabase.from("site_content").select("clave,valor"),
    ]);
    let data: any[] | null = penyaResult.data as any[] | null;
    if (penyaResult.error) {
      const legacyPenyes = await supabase.from("penyes").select("id,nombre,direccion,lat,lng,foto_url,tipo_musica,tiene_evento,informacion").eq("estado","aprobada").order("nombre");
      data = legacyPenyes.data?.map((p) => ({ ...p, instagram: "" })) ?? null;
    }
    const filas = actosData ?? [];
    // Los actos guardados se conservan en la base de datos. El programa de 2026
    // queda disponible en el archivo histórico y no se mezcla con la edición futura.
    setActos(filas);
    setEventos(eventosData ?? []);
    const content = Object.fromEntries((contentData ?? []).map((x:any)=>[x.clave,x.valor]));
    setSiteContent(content);
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
    if (!data) return;
    const urls = data.map((p) => p.foto_url ? (p.foto_url.startsWith("http") ? p.foto_url : supabase.storage.from("penyes").getPublicUrl(p.foto_url).data.publicUrl) : "");
    const cleanPenyes=data.map((p, i) => ({ ...p, foto: urls[i] ?? "" }));
    setPenyes(cleanPenyes);
    try { localStorage.setItem("festalfas-penyes-cache", JSON.stringify(cleanPenyes)); } catch { /* Caché opcional. */ }
  }, []);
  useEffect(() => {
    try {
      const cachedPoints = JSON.parse(localStorage.getItem("festalfas-map-points-cache") || "[]");
      if (Array.isArray(cachedPoints)) setMapPoints(cachedPoints);
      const cachedPenyes = JSON.parse(localStorage.getItem("festalfas-penyes-cache") || "[]");
      if (Array.isArray(cachedPenyes)) setPenyes(cachedPenyes);
    } catch { /* Se cargarán los datos actuales del servidor. */ }
    cargar();
  }, [cargar]);
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const user = data.session?.user ?? null;
      setAccountUser(user);
      const saved = user?.user_metadata?.festalfas_preferences;
      try {
        const local = JSON.parse(localStorage.getItem("festalfas-personal-preferences") || "{}");
        setPersonalPrefs({ showImportantNotices: saved?.showImportantNotices ?? local.showImportantNotices ?? true, reduceMotion: saved?.reduceMotion ?? local.reduceMotion ?? false, largeText: saved?.largeText ?? local.largeText ?? false, highContrast: saved?.highContrast ?? local.highContrast ?? false });
      } catch { setPersonalPrefs({ showImportantNotices: saved?.showImportantNotices ?? true, reduceMotion: saved?.reduceMotion ?? false, largeText: saved?.largeText ?? false, highContrast: saved?.highContrast ?? false }); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const user = session?.user ?? null;
      setAccountUser(user);
      const saved = user?.user_metadata?.festalfas_preferences;
      if (saved) setPersonalPrefs({ showImportantNotices: saved.showImportantNotices !== false, reduceMotion: saved.reduceMotion === true, largeText: saved.largeText === true, highContrast: saved.highContrast === true });
    });
    return () => { active = false; subscription.unsubscribe(); };
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
  useEffect(() => {
    if (!noticias.length || typeof window === "undefined" || sessionStorage.getItem("festalfas-news-popup-seen")) return;
    const latest = noticias.filter((item:any) => item.publicado).slice().sort((a:any,b:any) => String(b.fecha||b.created_at||"").localeCompare(String(a.fecha||a.created_at||""))).slice(0,1);
    if (!latest.length) return;
    const showTimer = window.setTimeout(() => {
      setNewsPopup(latest);
      sessionStorage.setItem("festalfas-news-popup-seen", "1");
      hideTimer = window.setTimeout(() => setNewsPopup([]), 7000);
    }, 900);
    let hideTimer: number | undefined;
    return () => { window.clearTimeout(showTimer); if (hideTimer) window.clearTimeout(hideTimer); };
  }, [noticias]);

  const handleAccountSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setAccountBusy(true); setAccountMessage("");
    try {
      if (accountMode === "register") {
        if (accountPassword.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
        const { data, error } = await supabase.auth.signUp({ email: accountEmail.trim(), password: accountPassword, options: { data: { full_name: accountName.trim() } } });
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
    ...penyes.filter((p) => p.lat != null && p.lng != null).map((p) => ({ id: p.id, categoria: "penya" as const, nombre: p.nombre, descripcion: p.direccion ?? "", lat: Number(p.lat), lng: Number(p.lng), foto: p.foto })),
    ...actos.filter((a) => a.lat != null && a.lng != null && eventoSigueActivo(a,now)).map((a) => ({ id: "acto-" + a.id, categoria: a.tipo as Categoria, nombre: a.titulo, descripcion: a.descripcion || a.lugar || "", lat: Number(a.lat), lng: Number(a.lng), dia:a.dia, hora:a.hora, detalleId:"acto-"+a.id })),
    ...eventosActivos.filter((e) => e.lat != null && e.lng != null).map((e) => ({ id: "evento-" + e.id, categoria: "evento" as const, nombre: e.titulo, descripcion: e.descripcion || e.lugar || "", lat: Number(e.lat), lng: Number(e.lng), dia:e.dia, hora:e.hora, detalleId:"evento-"+e.id })),
  ], [penyes, actos, eventosActivos, mapPoints, now]);

  const visibles = useMemo(() => todos.filter((l) => (!cat || l.categoria === cat) && l.nombre.toLowerCase().includes(q.toLowerCase())), [todos, cat, q]);

  const selectedPenyaEvents = selectedPenya ? eventos.filter((e) => eventoSigueActivo(e, now) && (e.penya_id === selectedPenya.id || [e.titulo, e.descripcion, e.lugar].some((v) => normalizarBusqueda(v).includes(normalizarBusqueda(selectedPenya.nombre))))) : [];
  const selectedPenyaActs = selectedPenya ? actos.filter((a) => eventoSigueActivo(a, now) && [a.titulo, a.descripcion, a.lugar].some((v) => normalizarBusqueda(v).includes(normalizarBusqueda(selectedPenya.nombre)))) : [];
  const selectedPenyaNews = selectedPenya ? noticias.filter((n:any) => n.publicado && (n.penya_id === selectedPenya.id || normalizarBusqueda([n.penya_nombre, n.autor].join(" ")).includes(normalizarBusqueda(selectedPenya.nombre)))).slice().sort((a:any,b:any) => String(b.fecha||b.created_at||"").localeCompare(String(a.fecha||a.created_at||""))).slice(0,3) : [];
  const selectedPenyaCustomBlocks = (() => { try { const all=JSON.parse(siteContent["penyes_perfiles_json"]||"{}"); const blocks=all?.[selectedPenya?.id||""]; return Array.isArray(blocks)?blocks.filter((block:any)=>block&&typeof block==="object"):[]; } catch { return []; } })();
  const selectedPenyaAcceptsVisits = (() => { try { const settings=JSON.parse(siteContent["penyes_visitas_json"]||"{}"); return settings?.[selectedPenya?.id||""]===true; } catch { return false; } })();
  const selectedPenyaBannerBlock = selectedPenyaCustomBlocks.find((block:any)=>block.type==="banner" && typeof block.url==="string" && /^https?:\/\//i.test(block.url));
  const selectedPenyaBanner = selectedPenyaBannerBlock?.url || "";
  const selectedPenyaPhotoBlocks = selectedPenyaCustomBlocks.filter((block:any)=>block.type==="photo" && typeof block.url==="string" && /^https?:\/\//i.test(block.url));
  const selectedPenyaGallery = selectedPenya ? [...new Set([
    ...selectedPenyaPhotoBlocks.filter((block:any)=>block.featured===true).slice(0,3).map((block:any)=>block.url),
    ...selectedPenyaPhotoBlocks.filter((block:any)=>block.featured!==true).map((block:any)=>block.url),
    ...selectedPenyaEvents.map((e:any) => e.imagen_url || e.imagen || e.foto_url || e.foto),
    ...selectedPenyaActs.map((a:any) => a.imagen_url || a.imagen || a.foto_url || a.foto)
  ].filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url) && url !== selectedPenya.foto && url !== selectedPenyaBanner))] : [];
  const selectedPenyaFeaturedGallery = selectedPenyaPhotoBlocks.filter((block:any)=>block.featured===true).slice(0,3).map((block:any)=>block.url);
  const selectedPenyaPhotoStyle=(url:string)=>{const block=selectedPenyaPhotoBlocks.find((item:any)=>item.url===url);return {objectPosition:`${block?.positionX??50}% ${block?.positionY??50}%`,transform:`scale(${(block?.zoom??100)/100})`};};
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
  const featuredPhotoEditorModal = editingFeaturedPenya ? <div className="fixed inset-0 z-[2147483100] flex items-start justify-center overflow-y-auto bg-[#071c25]/80 p-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md sm:p-6"><section className="my-auto w-full max-w-4xl rounded-3xl bg-background p-4 shadow-2xl sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-black">Añadir fotos destacadas · {editingFeaturedPenya.nombre}</h2><button type="button" onClick={()=>setEditingFeaturedPenya(null)} className="rounded-full border px-3 py-2 text-sm font-bold">Cerrar</button></div><AdminPenyaEditor penya={editingFeaturedPenya} onCancel={()=>setEditingFeaturedPenya(null)} onSaved={()=>{setEditingFeaturedPenya(null);void (async()=>{const {data}=await supabase.from("site_content").select("clave,valor");setSiteContent(Object.fromEntries((data||[]).map((x:any)=>[x.clave,x.valor])));})();}}/></section></div> : null;
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
    setCat("penya");
    setQ("");
    setFocus(null);
    requestAnimationFrame(() => {
      setFocus(id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  return (
    <div className="page-bg relative min-h-screen" style={{ "--pink": siteContent["theme_accent"] || "oklch(0.68 0.12 190)", "--secondary": siteContent["theme_accent"] || "oklch(0.68 0.12 190)", "--accent": siteContent["theme_accent"] || "oklch(0.68 0.12 190)", "--ring": siteContent["theme_accent"] || "oklch(0.68 0.12 190)", "--cat-penya": siteContent["theme_accent"] || "oklch(0.68 0.12 190)", "--background": siteContent["theme_background"] || "oklch(0.975 0.012 90)", "--gradient-page": `linear-gradient(180deg, ${siteContent["theme_background"] || "oklch(0.985 0.008 90)"}, ${siteContent["theme_background"] || "oklch(0.965 0.014 90)"})` } as React.CSSProperties}>
      {featuredPhotoEditorModal}
      <nav aria-label="Navegación principal" style={{position:"fixed",left:"50vw",right:"auto",top:"auto",bottom:"calc(env(safe-area-inset-bottom) + 10px)",width:"min(460px, calc(100vw - 24px))",maxWidth:"calc(100vw - 24px)",height:"62px",minHeight:"62px",boxSizing:"border-box",transform:"translate3d(-50%, 0, 0)",translate:"none",margin:0,zIndex:2147483000}} className="flex items-center justify-between gap-0 overflow-hidden rounded-full border border-white/85 bg-[rgba(245,248,250,.94)] px-1 shadow-[0_5px_18px_rgba(20,39,52,.16),0_1px_4px_rgba(255,255,255,.95)_inset] backdrop-blur-2xl [backdrop-filter:blur(24px)_saturate(155%)]">
        {(["home","penyes","eventos","noticias"] as const).map((page,index)=>{
          const labels={home:"Inicio",eventos:"Eventos",penyes:"Peñas",noticias:"Noticias"};
          const active=currentPage===page;
          return <button key={page} type="button" aria-current={active?"page":undefined} onClick={()=>{setMapFullscreen(false);setSelectedPenya(null);setPenyaDetailFullscreen(false);setEventFormPenya(null);setForm(false);setNewsPopup([]);setShareReminder(false);setNoticiaSeleccionada(null);setCurrentPage(page);window.scrollTo({top:0,behavior:"smooth"});}} className={"relative z-10 flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0 overflow-hidden rounded-full px-0 py-0 text-center leading-none transition-colors duration-200 "+(active?"text-white":"text-primary/75 hover:text-primary")}>
            <span className="grid h-[20px] w-[20px] shrink-0 place-items-center leading-none">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="block h-[17px] w-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {page==="home"?<><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>:page==="eventos"?<><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M8 2.8v4M16 2.8v4M3 9h18M8 13h3M8 16.5h6"/></>:page==="penyes"?<><circle cx="9" cy="8" r="3.2"/><path d="M2.8 20c.4-3.5 2.5-5.4 6.2-5.4s5.8 1.9 6.2 5.4M16 5.2a3 3 0 0 1 0 5.7M17 14.8c2.4.5 3.7 2.2 4.1 5.2"/></>:page==="noticias"?<><path d="M5 4h14a2 2 0 0 1 2 2v14H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M7 8h4v4H7zM14 8h4M14 12h4M7 16h11"/></>:<><path d="M10.2 2.8h3.6l.55 2.05a7.6 7.6 0 0 1 1.55.9l2.02-.62 1.8 3.12-1.48 1.52c.12.58.12 1.18 0 1.76l1.48 1.52-1.8 3.12-2.02-.62a7.6 7.6 0 0 1-1.55.9l-.55 2.05h-3.6l-.55-2.05a7.6 7.6 0 0 1-1.55-.9l-2.02.62-1.8-3.12 1.48-1.52a4.4 4.4 0 0 1 0-1.76L4.28 8.23l1.8-3.12 2.02.62a7.6 7.6 0 0 1 1.55-.9z"/><circle cx="12" cy="10.65" r="2.65"/></>}
              </svg>
            </span>
            <span className={"mt-0.5 block max-w-full shrink-0 whitespace-nowrap text-[8px] leading-[9px] "+(active?"font-bold":"font-medium")}>{labels[page]}</span>
          </button>;
        })}
        <span aria-hidden="true" className={"pointer-events-none absolute inset-y-1 left-1 z-0 w-[calc((100%-8px)/4)] rounded-full border border-white/25 bg-[linear-gradient(145deg,rgba(25,43,55,.78),rgba(25,43,55,.58))] shadow-[0_5px_18px_rgba(18,35,47,.22),0_1px_4px_rgba(255,255,255,.22)_inset] backdrop-blur-2xl transition-transform duration-300 ease-[cubic-bezier(.22,.61,.36,1)] "+(currentPage==="info"?"opacity-0":"")} style={{transform:"translateX(calc("+(["home","penyes","eventos","noticias"].indexOf(currentPage)*100)+"%))"}}/>
      </nav>
      {!selectedPenya&&<button type="button" onClick={()=>{setCurrentPage("info");window.scrollTo({top:0,behavior:"smooth"});}} aria-label="Abrir ajustes" title="Ajustes" className="fixed right-3 top-[calc(env(safe-area-inset-top)+12px)] z-[2147483001] grid h-11 w-11 place-items-center rounded-full border border-white/35 bg-[rgba(23,63,82,.34)] text-white shadow-md backdrop-blur-2xl [backdrop-filter:blur(18px)_saturate(145%)] transition hover:rotate-12 hover:bg-[rgba(23,63,82,.58)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:right-6 sm:top-[calc(env(safe-area-inset-top)+16px)] sm:h-12 sm:w-12">
        <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-[22px] sm:w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.2 2.8h3.6l.55 2.05a7.6 7.6 0 0 1 1.55.9l2.02-.62 1.8 3.12-1.48 1.52c.12.58.12 1.18 0 1.76l1.48 1.52-1.8 3.12-2.02-.62a7.6 7.6 0 0 1-1.55.9l-.55 2.05h-3.6l-.55-2.05a7.6 7.6 0 0 1-1.55-.9l-2.02.62-1.8-3.12 1.48-1.52a4.4 4.4 0 0 1 0-1.76L4.28 8.23l1.8-3.12 2.02.62a7.6 7.6 0 0 1 1.55-.9z"/><circle cx="12" cy="10.65" r="2.65"/></svg>
        {unreadNotifications.length>0&&<span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" aria-label="Hay notificaciones sin leer"/>}
      </button>}
      {currentPage!=="home"&&<div aria-hidden="true" className={currentPage==="penyes"||currentPage==="noticias"?"h-0 shrink-0":"h-[58px] shrink-0 sm:h-[64px]"} />}
      {fotoAmpliada!==null&&noticiaImagenes[fotoAmpliada]&&<div role="dialog" aria-modal="true" aria-label="Fotografía ampliada" className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/95 p-3 backdrop-blur-sm animate-in fade-in duration-200" onClick={()=>setFotoAmpliada(null)}><button type="button" onClick={()=>setFotoAmpliada(null)} aria-label="Cerrar fotografía" className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-3xl text-white transition hover:rotate-90 hover:bg-white/25">×</button><button type="button" aria-label="Fotografía anterior" onClick={e=>{e.stopPropagation();setFotoAmpliada((fotoAmpliada-1+noticiaImagenes.length)%noticiaImagenes.length);}} className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl text-white transition hover:scale-110 hover:bg-white/25 sm:left-5">‹</button><div className="flex max-h-full max-w-full flex-col items-center gap-3" onClick={e=>e.stopPropagation()}><img src={noticiaImagenes[fotoAmpliada]} alt={noticiaSeleccionada?.titulo+" · foto "+(fotoAmpliada+1)} style={{width:"min(96vw, 1800px)",height:"min(86svh, 1200px)"}} width={1800} height={1200} loading="eager" fetchPriority="high" decoding="async" draggable={false} className="max-h-[86svh] max-w-[96vw] rounded-lg object-contain shadow-2xl animate-in zoom-in-95 duration-300"/><div className="flex items-center gap-3 text-sm font-semibold text-white"><span>{fotoAmpliada+1} / {noticiaImagenes.length}</span><a href={noticiaImagenes[fotoAmpliada]} download target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="rounded-full border border-white/30 bg-white/15 px-4 py-2 transition hover:scale-105 hover:bg-white/25">↓ Descargar foto</a></div></div><button type="button" aria-label="Fotografía siguiente" onClick={e=>{e.stopPropagation();setFotoAmpliada((fotoAmpliada+1)%noticiaImagenes.length);}} className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl text-white transition hover:scale-110 hover:bg-white/25 sm:right-5">›</button></div>}
      {currentPage==="home" && <>
      <section className="home-hero relative left-1/2 flex min-h-[100svh] w-screen max-w-none -translate-x-1/2 items-end overflow-hidden">
        {heroImage ? <img src={heroImage} alt="Portada de las fiestas de l'Alfàs del Pi" width={1920} height={1280} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center" /> : <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[#173f52] via-[#236579] to-[#d4af37]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-brown/90 via-brown/20 to-transparent" />
        <div className="relative mx-auto w-full max-w-[min(96vw,1600px)] px-4 pb-9 sm:px-5 sm:pb-16">
          <div className="max-w-full">
            <h1 className="rise inline-block max-w-full font-sans text-6xl font-black lowercase leading-[0.88] tracking-[-0.085em] text-white drop-shadow-[0_4px_22px_rgba(0,0,0,0.28)] sm:text-8xl md:text-9xl">festalfàs</h1>
            <div aria-hidden="true" className="rise mt-3 h-1.5 w-16 rounded-full bg-secondary shadow-sm sm:mt-4 sm:h-2 sm:w-24" />
          </div>
          <p className="rise mt-3 max-w-xl text-sm font-medium text-on-image/90 sm:mt-4 sm:text-lg">{siteContent["hero_subtitulo"] || edicion.subtitulo}</p>
          <div className="mt-6 mb-2">
            <p className="rise text-xs font-extrabold uppercase tracking-[.22em] text-white sm:text-sm">Festes 2027</p>
            <p className="rise mt-1 text-[10px] font-medium tracking-wide text-white/75 sm:text-xs">Cuenta atrás para el comienzo de las fiestas</p>
          </div>
          <CountdownFiestas />
        </div>
      </section>


      <main className="mx-auto w-full max-w-[min(96vw,1600px)] px-3 pb-28 pt-8 sm:px-5">
        {proximasActividades.length > 0 && <section aria-labelledby="proxima-actividad-title" className="mb-7 overflow-hidden rounded-[1.75rem] border border-primary/15 bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 px-4 py-4 sm:px-6">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-primary">Apunta la fecha</p><h2 id="proxima-actividad-title" className="mt-1 text-xl font-extrabold text-primary sm:text-2xl">Lo próximo en las fiestas</h2></div>
            <button type="button" onClick={() => { setCurrentPage("programa"); window.scrollTo({top:0,behavior:"smooth"}); }} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground sm:text-sm">Ver programa completo →</button>
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-3 sm:gap-3 sm:p-4">
            {proximasActividades.map((item:any)=><button type="button" key={item._origen+"-"+item.id} onClick={() => { setCurrentPage(item._origen==="penya"?"eventos":"programa"); if(item._origen==="programa") setDia(item.dia); setFilterDay("all"); window.scrollTo({top:0,behavior:"smooth"}); }} className="flex min-w-0 items-center gap-3 rounded-2xl bg-primary/[.045] p-3 text-left transition hover:bg-primary/10">
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
            {!mapFullscreen && <div className="relative h-[390px] overflow-hidden rounded-[1.25rem] sm:h-[500px] sm:rounded-[1.5rem] md:h-[600px]">
              <button type="button" onClick={() => setMapFullscreen(true)} aria-label="Ampliar mapa a pantalla completa" className="absolute left-3 top-3 z-[1200] rounded-full border border-white/70 bg-white/95 px-4 py-2 text-sm font-bold text-[#173f52] shadow-lg">⛶ Pantalla completa</button>
              <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
                <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}>
                  <FestMap lugares={visibles} focusId={focus} onPenyaClick={(id) => { setPenyaDetailFullscreen(false); setMapPenyaPreview(true); setSelectedPenya(penyes.find((p) => p.id === id) ?? null); }} onItemClick={(id)=>{setCurrentPage("eventos");setFilterDay("all");setFilterCategory(id.startsWith("acto-")?"actuaciones":"penyes");window.scrollTo({top:0,behavior:"smooth"});}} />
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
          <div className="relative left-1/2 mb-6 min-h-[360px] w-screen -translate-x-1/2 overflow-hidden rounded-b-[1.75rem] bg-gradient-to-br from-[#173f52] via-[#236579] to-[#2c7180] px-5 py-10 text-white shadow-[0_12px_32px_rgba(23,63,82,.16)] sm:mb-8 sm:min-h-[420px] sm:px-8 sm:py-12">
            {siteContent["penyes_banner_image_url"] ? <img src={siteContent["penyes_banner_image_url"]} alt="" aria-hidden="true" fetchPriority="low" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center"/> : null}
            {siteContent["penyes_banner_image_url"] ? <div className="absolute inset-0 bg-[#102f40]/45"/> : null}
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-64 w-64 rounded-full border-[28px] border-white/10"/>
            <div className="relative z-10 mx-auto flex min-h-[280px] w-full max-w-[1500px] flex-col justify-center sm:min-h-[330px]">
              <p className="text-[10px] font-extrabold uppercase tracking-[.24em] text-white/70 sm:text-xs">La vida festera de l'Alfàs del Pi</p>
              <h2 className="mt-2 break-words text-[2rem] font-extrabold leading-tight sm:text-5xl">Nuestras peñas</h2><p className="mt-1 text-sm font-semibold text-white/85">43 peñas en total en l’Alfàs del Pi</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">Descubre quién está detrás de cada peña, conoce su música y su ambiente, encuentra sus próximas actividades y guarda tus favoritas.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold">{penyes.length} {penyes.length===1?"peña":"peñas"} registradas</span>
                <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold">{misPenyes.length} favoritas</span>
              </div>
            </div>
          </div>

          <div className="mb-4 flex min-w-0 justify-end gap-2 sm:mb-5">
            <button onClick={()=>{setPenyaMusicFilter("Todas");setPenyaOnlyMine(false);setPenyaSearch("");}} className="rounded-full border border-border px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary/5">Limpiar filtros</button>
            <button onClick={() => setForm(true)} className="rounded-full bg-pink px-5 py-2.5 text-sm font-bold text-brown transition hover:-translate-y-0.5">+ {ui.addPenya}</button>
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

          <aside className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#d8c68c]/70 bg-gradient-to-r from-[#fff9e8] to-[#f7f1df] p-4 text-[#59491e] shadow-sm sm:flex-row sm:items-center"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#ead9a5] text-xl">♛</span><div className="min-w-0 flex-1"><p className="font-extrabold">¿Eres responsable de una peña?</p><p className="mt-1 text-sm leading-relaxed">Próximamente podrás solicitar la administración de su ficha. Te pediremos nombre y apellidos para comprobar tu vinculación con la peña y aprobar el acceso. Después podrás invitar a sus miembros mediante un enlace.</p></div><span className="shrink-0 self-start rounded-full border border-[#d8c68c] bg-white/70 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#806a2d] sm:self-center">Próximamente</span></aside>

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
            <div className="relative mx-auto w-full max-w-[1180px]">
              {visiblePenyes.length>1&&<button type="button" aria-label="Peña anterior" onClick={()=>{const next=Math.max(0,activePenyaCard-1);setActivePenyaCard(next);centerPenyaCard(next,"smooth");}} className="absolute left-1 top-[43%] z-30 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/85 text-xl text-[#173f52] shadow-lg backdrop-blur-xl transition hover:scale-105 lg:grid">‹</button>}
              {visiblePenyes.length>1&&<button type="button" aria-label="Peña siguiente" onClick={()=>{const next=Math.min(loopedPenyes.length-1,activePenyaCard+1);setActivePenyaCard(next);centerPenyaCard(next,"smooth");}} className="absolute right-1 top-[43%] z-30 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/85 text-xl text-[#173f52] shadow-lg backdrop-blur-xl transition hover:scale-105 lg:grid">›</button>}
              <div ref={penyaCarouselRef} onScroll={(event)=>handlePenyaCarouselScroll(event.currentTarget)} className={`penya-coverflow ${penyaCarouselInitialized?"is-ready":"is-initializing"} flex snap-x snap-mandatory items-center overflow-x-auto overscroll-x-contain px-[calc(50%-112px)] py-16 sm:px-[calc(50%-130px)] lg:px-[calc(50%-150px)]`}>
                {loopedPenyes.map((p,index)=>{
                  const fallbackColors=["#5968D8","#E45D70","#13A6C3","#19A887","#D28B35","#8559C7","#287DAD","#C45D91"];
                  const cardConfig=penyaCardSettings[p.id]||{};
                  const colorSeed=String(p.id||p.nombre||"penya").split("").reduce((hash,char)=>(hash*31+char.charCodeAt(0))>>>0,7);
                  const color=/^#[0-9a-fA-F]{6}$/.test(cardConfig.color||"")?cardConfig.color!:fallbackColors[colorSeed%fallbackColors.length];
                  const logo=cardConfig.logo_url||"";
                  const logoScale=Number.isFinite(cardConfig.logo_scale)?Math.max(50,Math.min(180,cardConfig.logo_scale!)):100;
                  const logoX=Number.isFinite(cardConfig.logo_x)?Math.max(0,Math.min(100,cardConfig.logo_x!)):50;
                  const logoY=Number.isFinite(cardConfig.logo_y)?Math.max(0,Math.min(100,cardConfig.logo_y!)):50;
                  const rgb=color.match(/[0-9a-f]{2}/gi)?.map(value=>parseInt(value,16))||[89,104,216];
                  const linear=rgb.map(value=>{const channel=value/255;return channel<=0.04045?channel/12.92:Math.pow((channel+0.055)/1.055,2);});
                  const luminance=0.2126*linear[0]!+0.7152*linear[1]!+0.0722*linear[2]!;
                  const cardTextColor=luminance>0.56?"#17232a":"#ffffff";
                  const cardTextShadow="none";
                  const cardTitle=String(cardConfig.title||p.nombre).trim()||p.nombre;
                  const shortDescription=String(cardConfig.description??p.informacion??"").replace(/\s+/g," ").trim();
                  const cardDescription=shortDescription.length>104?shortDescription.slice(0,101).trimEnd()+"…":shortDescription;
                  const offset=index-activePenyaCard;
                  const centered=offset===0;
                  return <article id={"penya-"+p.id+"-"+index} key={p.id+"-"+index} tabIndex={0} aria-label={`Abrir ficha de ${cardTitle}`} onClick={()=>{setPenyaDetailFullscreen(true);setSelectedPenya(p);}} onKeyDown={(e)=>{if(e.target===e.currentTarget&&(e.key==="Enter"||e.key===" ")){e.preventDefault();setPenyaDetailFullscreen(true);setSelectedPenya(p);}}} style={{backgroundColor:color,zIndex:30-Math.abs(offset),transform:`translateY(${centered?-6:Math.min(12,Math.abs(offset)*4)}px)`,opacity:Math.abs(offset)>3?.18:Math.max(.35,1-Math.abs(offset)*.18)}} className={`penya-coverflow-card group relative ${centered?"is-active":Math.abs(offset)===1?"is-side":""} ${index%Math.max(visiblePenyes.length,1)===0?"is-loop-start":""} h-[320px] w-[224px] shrink-0 snap-center cursor-pointer overflow-visible rounded-[2rem] border border-white/25 shadow-[0_18px_42px_rgba(19,38,53,.18)] outline-none transition-[transform,opacity,filter,box-shadow] duration-500 ease-[cubic-bezier(.2,.75,.25,1)] focus-visible:ring-4 focus-visible:ring-primary/40 sm:h-[360px] sm:w-[260px] lg:h-[400px] lg:w-[290px]`}>
                    <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
                      <div className="absolute inset-x-0 top-0 z-10 p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 style={{color:cardTextColor}} className="penya-card-title break-words text-[24px] font-bold leading-[1.05] tracking-[-.035em] sm:text-[30px]">{cardTitle}</h3>
                            {cardDescription&&<p style={{color:cardTextColor,textShadow:cardTextShadow}} className="mt-2 line-clamp-3 max-w-[30ch] text-[13px] font-semibold leading-[1.45] opacity-100 sm:text-sm">{cardDescription}</p>}
                          </div>
                          {misPenyes.includes(p.id)&&<span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/20 text-sm text-white ring-1 ring-white/40" aria-label="Mi peña">★</span>}
                        </div>
                        {(mayoralesPenyaId?p.id===mayoralesPenyaId:esPenyaCuBaTa(p.nombre))&&<span className="mt-3 inline-flex rounded-full bg-white/20 px-2.5 py-1 text-[9px] font-extrabold tracking-wide text-white ring-1 ring-white/35">♛ MAYORALES {mayoralesAnio}</span>}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-[78%]">
                        {logo?<img src={logo} alt={"Logo de "+p.nombre} loading="lazy" decoding="async" style={{objectPosition:`${logoX}% ${logoY}%`,transform:`translate(${(logoX-50)/2}%,${(logoY-50)/2}%) scale(${logoScale/100})`}} className="absolute inset-x-1 bottom-[-8px] h-full w-[calc(100%-8px)] object-contain drop-shadow-[0_18px_14px_rgba(0,0,0,.22)] transition-transform duration-500 ease-[cubic-bezier(.2,.75,.25,1)] group-hover:-translate-y-2"/>:<div className="absolute inset-x-0 bottom-4 text-center text-8xl font-black text-white/90">{p.nombre.trim().charAt(0).toLocaleUpperCase("es")}</div>}
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
      
{currentPage==="info" && <main className="mx-auto min-h-[75vh] w-full max-w-[min(96vw,1600px)] space-y-10 px-3 pb-32 pt-8 sm:px-5">
        <section aria-labelledby="settings-title" className="space-y-5">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-primary">Tu espacio personal</p><h1 id="settings-title" className="mt-1 text-3xl font-black text-primary sm:text-4xl">Ajustes</h1><p className="mt-2 text-sm text-muted-foreground">Crea tu cuenta o inicia sesión para guardar tus preferencias personales de FestAlfàs.</p></div>
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="glass rounded-3xl border border-primary/15 p-5 shadow-sm sm:p-6">
              {accountUser ? <div className="space-y-4"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-2xl">👤</span><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-primary">Sesión iniciada</p><h2 className="text-lg font-extrabold">{accountUser.user_metadata?.full_name || accountUser.email}</h2><p className="text-xs text-muted-foreground">{accountUser.email}</p></div></div><button type="button" disabled={accountBusy} onClick={async()=>{setAccountBusy(true);await supabase.auth.signOut();setAccountMessage("Has cerrado sesión.");setAccountBusy(false);}} className="rounded-full border border-border px-4 py-2 text-sm font-bold">Cerrar sesión</button></div> : <>
                <div className="mb-4 flex gap-2 rounded-full bg-muted/70 p-1"><button type="button" onClick={()=>{setAccountMode("register");setAccountMessage("");}} className={"flex-1 rounded-full px-3 py-2 text-sm font-bold "+(accountMode==="register"?"bg-primary text-primary-foreground shadow":"text-muted-foreground")}>Crear cuenta</button><button type="button" onClick={()=>{setAccountMode("login");setAccountMessage("");}} className={"flex-1 rounded-full px-3 py-2 text-sm font-bold "+(accountMode==="login"?"bg-primary text-primary-foreground shadow":"text-muted-foreground")}>Iniciar sesión</button></div>
                <form onSubmit={handleAccountSubmit} className="space-y-3"><h2 className="text-xl font-extrabold text-primary">{accountMode==="register"?"Regístrate en FestAlfàs":"Bienvenido de nuevo"}</h2>{accountMode==="register"&&<label className="block space-y-1 text-sm font-semibold">Nombre<input autoComplete="name" required maxLength={80} value={accountName} onChange={e=>setAccountName(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring" placeholder="Tu nombre"/></label>}<label className="block space-y-1 text-sm font-semibold">Correo electrónico<input type="email" autoComplete="email" required value={accountEmail} onChange={e=>setAccountEmail(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring" placeholder="nombre@correo.com"/></label><label className="block space-y-1 text-sm font-semibold">Contraseña<input type="password" autoComplete={accountMode==="register"?"new-password":"current-password"} minLength={8} required value={accountPassword} onChange={e=>setAccountPassword(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring" placeholder="Mínimo 8 caracteres"/></label><button disabled={accountBusy} className="w-full rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-sm">{accountBusy?"Procesando…":accountMode==="register"?"Crear mi cuenta":"Entrar"}</button></form>
              </>}
              {accountMessage&&<p role="status" className="mt-3 rounded-xl bg-primary/5 p-3 text-sm text-primary">{accountMessage}</p>}
            </section>
            <section className="glass space-y-4 rounded-3xl border border-primary/15 p-5 shadow-sm sm:p-6"><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-primary">Personalización</p><h2 className="mt-1 text-xl font-extrabold text-primary">Preferencias de la web</h2><p className="mt-1 text-xs text-muted-foreground">Se guardan en este dispositivo y, al iniciar sesión, también en tu cuenta.</p></div><label className="flex items-start gap-3 rounded-2xl border border-border/70 p-3"><input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={personalPrefs.showImportantNotices} onChange={e=>setPersonalPrefs(p=>({...p,showImportantNotices:e.target.checked}))}/><span><span className="block text-sm font-bold">Mostrar avisos importantes</span><span className="block text-xs text-muted-foreground">Controla si aparecen los comunicados destacados mientras navegas.</span></span></label><label className="flex items-start gap-3 rounded-2xl border border-border/70 p-3"><input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={personalPrefs.reduceMotion} onChange={e=>setPersonalPrefs(p=>({...p,reduceMotion:e.target.checked}))}/><span><span className="block text-sm font-bold">Reducir animaciones</span><span className="block text-xs text-muted-foreground">Reduce transiciones y movimientos de la interfaz.</span></span></label><label className="flex items-start gap-3 rounded-2xl border border-border/70 p-3"><input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={personalPrefs.largeText} onChange={e=>setPersonalPrefs(p=>({...p,largeText:e.target.checked}))}/><span><span className="block text-sm font-bold">Texto más grande</span><span className="block text-xs text-muted-foreground">Aumenta el tamaño de los textos para facilitar la lectura.</span></span></label><label className="flex items-start gap-3 rounded-2xl border border-border/70 p-3"><input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={personalPrefs.highContrast} onChange={e=>setPersonalPrefs(p=>({...p,highContrast:e.target.checked}))}/><span><span className="block text-sm font-bold">Mayor contraste</span><span className="block text-xs text-muted-foreground">Refuerza el contraste de textos secundarios y bordes.</span></span></label><button type="button" disabled={accountBusy} onClick={()=>void savePersonalPreferences()} className="rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground">Guardar mis ajustes</button></section>
          </div>
        </section>
        <section aria-labelledby="notifications-settings-title" className="space-y-4 border-t border-border/70 pt-7">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-primary">Tu actividad</p><h2 id="notifications-settings-title" className="mt-1 text-xl font-extrabold text-primary sm:text-2xl">Notificaciones</h2><p className="mt-1 text-sm text-muted-foreground">{unreadNotifications.length?unreadNotifications.length+" pendientes de leer":"Estás al día con tus avisos."}</p></div><button type="button" onClick={markAllNotificationsRead} disabled={!unreadNotifications.length} className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-primary disabled:opacity-40">Marcar todas como leídas</button></div>
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
          <div className="mb-7 flex justify-end border-b border-border/60 pb-4"><button type="button" onClick={async()=>{const url=window.location.origin+"/noticia/"+encodeURIComponent(String(noticiaSeleccionada.id));const title=noticiaSeleccionada.titulo||"Noticia de festalfàs";const text=noticiaSeleccionada.resumen||"Lee esta noticia en festalfàs";try{if(navigator.share){let files:File[]=[];if(noticiaSeleccionada.imagen_url){try{const response=await fetch(noticiaSeleccionada.imagen_url);if(!response.ok)throw new Error("No se pudo descargar la imagen");const blob=await response.blob();let imageBlob=blob;let mime=blob.type||"image/jpeg";if(mime.includes("svg")){const objectUrl=URL.createObjectURL(blob);try{const image=new Image();await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("No se pudo preparar la imagen"));image.src=objectUrl;});const canvas=document.createElement("canvas");canvas.width=image.naturalWidth||1200;canvas.height=image.naturalHeight||630;const context=canvas.getContext("2d");if(!context)throw new Error("No se pudo preparar la imagen");context.drawImage(image,0,0,canvas.width,canvas.height);imageBlob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error("No se pudo convertir la imagen")),"image/png"));mime="image/png";}finally{URL.revokeObjectURL(objectUrl);}}const extension=mime.includes("png")?"png":mime.includes("webp")?"webp":"jpg";const safeName=title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"noticia";files=[new File([imageBlob],"festalfas-"+safeName+"."+extension,{type:mime})];}catch(error){console.warn("No se pudo adjuntar la imagen de la noticia; se compartirá el enlace.",error);}}if(files.length&&navigator.canShare?.({files})){await navigator.share({files,title,text,url});}else{await navigator.share({title,text,url});}}else{await navigator.clipboard.writeText(url);window.alert("Enlace de la noticia copiado.");}}catch(error){if(!(error instanceof DOMException&&error.name==="AbortError")){try{await navigator.clipboard.writeText(url);window.alert("Enlace de la noticia copiado.");}catch{window.prompt("Copia el enlace de la noticia:",url);}}}}} className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-secondary">↗ Compartir noticia</button></div>
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

      {newsPopup.length > 0 && currentPage === "home" && <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-[#173f52]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Últimas noticias">
        <section className="w-full max-w-lg rounded-3xl border border-white/70 bg-background p-5 shadow-2xl sm:p-7">
          <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-primary">Actualidad festera</p><h2 className="mt-1 text-2xl font-extrabold text-primary">Últimas noticias</h2></div><button type="button" onClick={() => setNewsPopup([])} aria-label="Cerrar aviso de noticias" className="rounded-full border border-border px-3 py-1.5 text-sm font-bold">✕</button></div>
          <div className="space-y-3">{newsPopup.map((item:any) => <button key={item.id} type="button" onClick={() => { setNewsPopup([]); setCurrentPage("noticias"); setNoticiaSeleccionada(item); window.scrollTo({top:0,behavior:"smooth"}); }} className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-white/70 p-3 text-left transition hover:border-primary/40 hover:shadow-md">
            <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-wide text-primary">{esNoticiaMayorales(item)?"Mayorales 2027":item.tipo==="video"?"Vídeo":item.tipo==="oficial"?"Información oficial":item.tipo==="externa"?(item.fuente||"Medio externo"):"Noticias de las peñas"}</span><span className="mt-1 block font-bold leading-snug text-foreground">{item.titulo}</span><span className="mt-1 block text-xs font-semibold text-primary">Leer noticia →</span></span>
          </button>)}</div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Este aviso se cerrará automáticamente en unos segundos.</p>
        </section>
      </div>}
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
        <p>festalfàs · {new Date().getFullYear()}</p>
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

      {selectedPenya && penyaGalleryOpen && <div className="fixed inset-0 z-[2147483102] flex items-center justify-center bg-[#092431]/80 p-3 pt-[max(.75rem,env(safe-area-inset-top))] backdrop-blur-md" role="dialog" aria-modal="true" aria-label={"Galería de "+selectedPenya.nombre} onClick={()=>{setPenyaGalleryOpen(false);setPenyaFotoAmpliada(null);setPenyaFotoZoom(1);}}>
        <section className="max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] border border-white/70 bg-[#f5f8f7] p-4 shadow-2xl sm:p-7" onClick={e=>e.stopPropagation()}>
          <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#9a7a32]">Recuerdos compartidos</p><h2 className="mt-1 text-xl font-black text-[#173f52] sm:text-2xl">Galería de {selectedPenya.nombre}</h2><p className="mt-1 text-xs text-[#6c8285]">{selectedPenyaGallery.length} fotografías</p></div><button type="button" onClick={()=>{setPenyaGalleryOpen(false);setPenyaFotoAmpliada(null);setPenyaFotoZoom(1);}} aria-label="Cerrar galería" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#d6e2df] bg-white text-lg font-bold text-[#173f52]">✕</button></div>
          {selectedPenyaGallery.length>0?<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{selectedPenyaGallery.map((url,index)=><figure key={url} className="overflow-hidden rounded-xl border border-[#dce7e4] bg-white p-1.5 shadow-sm"><button type="button" onClick={()=>{setPenyaFotoZoom(1);setPenyaFotoAmpliada(selectedPenyaGallery.indexOf(url));}} aria-label={"Ampliar fotografía "+(index+1)} className="block h-[124px] w-full overflow-hidden rounded-lg"><img src={url} alt={"Foto "+(index+1)+" de "+selectedPenya.nombre} loading="lazy" style={selectedPenyaPhotoStyle(url)} className="h-full w-full rounded-lg bg-[#edf3f1] object-cover transition-transform duration-500 ease-out hover:scale-[1.02]"/></button><figcaption className="px-1 pb-1 pt-2 text-[10px] font-semibold text-[#52666b]">{selectedPenyaFeaturedGallery.includes(url)?"Foto destacada":"Recuerdo de la peña"}</figcaption></figure>)}</div>:<p className="rounded-xl border border-dashed border-[#cbdcdd] p-8 text-center text-sm text-[#6c8285]">Todavía no hay fotografías en esta galería.</p>}
        </section>
      </div>}
      {selectedPenya && penyaFotoAmpliada!==null && selectedPenyaGallery[penyaFotoAmpliada] && <div role="dialog" aria-modal="true" aria-label="Fotografía ampliada" className="fixed inset-0 z-[2147483103] flex items-center justify-center bg-[#06151d]/95 p-3 backdrop-blur-md animate-in fade-in duration-300" onClick={()=>{setPenyaFotoAmpliada(null);setPenyaFotoZoom(1);}}><button type="button" aria-label="Cerrar fotografía" onClick={()=>{setPenyaFotoAmpliada(null);setPenyaFotoZoom(1);}} className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 text-3xl text-white transition duration-300 hover:rotate-90 hover:bg-white/20">×</button><button type="button" aria-label="Fotografía anterior" onClick={e=>{e.stopPropagation();setPenyaFotoZoom(1);setPenyaFotoAmpliada(i=>(i===null?0:(i-1+selectedPenyaGallery.length)%selectedPenyaGallery.length));}} className="absolute left-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/40 text-2xl text-white sm:left-5">‹</button><button type="button" aria-label="Fotografía siguiente" onClick={e=>{e.stopPropagation();setPenyaFotoZoom(1);setPenyaFotoAmpliada(i=>(i===null?0:(i+1)%selectedPenyaGallery.length));}} className="absolute right-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/40 text-2xl text-white sm:right-5">›</button><div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/20 bg-black/45 px-4 py-2 text-xs font-bold text-white"><button type="button" onClick={e=>{e.stopPropagation();setPenyaFotoZoom(v=>Math.max(1,v-.25));}}>−</button><span>{penyaFotoAmpliada+1} / {selectedPenyaGallery.length} · {Math.round(penyaFotoZoom*100)}%</span><button type="button" onClick={e=>{e.stopPropagation();setPenyaFotoZoom(v=>Math.min(3,v+.25));}}>＋</button></div><img src={selectedPenyaGallery[penyaFotoAmpliada]} alt={"Fotografía ampliada de "+selectedPenya.nombre} onClick={e=>{e.stopPropagation();setPenyaFotoZoom(v=>v>=2.5?1:v+0.5);}} onTouchStart={e=>{(e.currentTarget as HTMLImageElement).dataset.touchX=String(e.touches[0]?.clientX??0);}} onTouchEnd={e=>{const start=Number((e.currentTarget as HTMLImageElement).dataset.touchX||0);const delta=(e.changedTouches[0]?.clientX??start)-start;if(Math.abs(delta)>55)setPenyaFotoAmpliada(current=>current===null?null:(current+(delta<0?1:-1)+selectedPenyaGallery.length)%selectedPenyaGallery.length);}} style={{...selectedPenyaPhotoStyle(selectedPenyaGallery[penyaFotoAmpliada]),transform:`scale(${penyaFotoZoom*((selectedPenyaPhotoBlocks.find((block:any)=>block.url===selectedPenyaGallery[penyaFotoAmpliada])?.zoom??100)/100)})`}} className="max-h-[82dvh] max-w-[94vw] cursor-zoom-in rounded-xl object-contain shadow-2xl transition-transform duration-200 animate-in zoom-in-90 ease-out"/></div>}
      {selectedPenya && (mapPenyaPreview ? <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-[#092431]/65 p-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm" onClick={()=>{setSelectedPenya(null);setMapPenyaPreview(false);}}>
        <section role="dialog" aria-modal="true" aria-label={"Resumen de "+selectedPenya.nombre} onClick={e=>e.stopPropagation()} className="relative w-full max-w-[370px] overflow-hidden rounded-[1.45rem] border border-white/80 bg-white shadow-[0_24px_80px_rgba(4,24,33,.38)]">
          <div className="relative z-0 h-[104px] overflow-hidden bg-gradient-to-br from-[#173f52] via-[#286477] to-[#c6a24b]">
            {selectedPenyaBanner&&<img src={selectedPenyaBanner} alt="" className="h-full w-full object-cover"/>}
            <div className="absolute inset-0 bg-gradient-to-t from-[#092431]/55 via-transparent to-black/10"/>
            
            <button type="button" aria-label="Cerrar" onClick={()=>{setSelectedPenya(null);setMapPenyaPreview(false);}} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-white/35 bg-[#092431]/55 text-sm font-bold text-white shadow-md backdrop-blur-md transition hover:bg-[#092431]/85">✕</button>
          </div>
          <div className="px-4 pb-4">
            <div className="relative z-10 -mt-7 flex min-w-0 items-end gap-3">
              <div className="relative z-10 grid h-[68px] w-[68px] shrink-0 place-items-center overflow-hidden rounded-2xl border-[3px] border-white bg-[#edf3f3] text-xl font-black text-[#173f52] shadow-lg">{selectedPenya.foto?<img src={selectedPenya.foto} alt="" className="h-full w-full object-cover"/>:selectedPenya.nombre.slice(0,1).toUpperCase()}</div>
              <div className="min-w-0 flex-1 pb-1"><h2 className="line-clamp-2 text-[18px] font-black leading-tight tracking-tight text-[#173f52]">{selectedPenya.nombre}</h2></div>
            </div>
            {selectedPenya.informacion?.trim()&&<p className="mt-3 line-clamp-3 text-[13px] leading-[1.55] text-[#52666b]">{selectedPenya.informacion}</p>}
            {selectedPenya.direccion&&<div className="mt-3 flex items-start gap-2 rounded-xl border border-[#e5eceb] bg-[#f5f8f7] px-3 py-2.5 text-[11px] font-semibold leading-snug text-[#52666b]"><span className="text-[#b18d3d]">📍</span><span className="min-w-0">{selectedPenya.direccion}</span></div>}
            <div className="mt-3 flex flex-wrap gap-1.5">{selectedPenya.tipo_musica&&<span className="rounded-full bg-[#eaf1f2] px-2.5 py-1 text-[10px] font-bold text-[#24576a]">♫ {selectedPenya.tipo_musica}</span>}{(selectedPenyaEvents.length+selectedPenyaActs.length)>0&&<span className="rounded-full bg-[#f7f0df] px-2.5 py-1 text-[10px] font-bold text-[#806a2d]">▣ {selectedPenyaEvents.length+selectedPenyaActs.length} actividades</span>}</div>
            <div className="mt-3 rounded-2xl border border-[#e2eae8] bg-[#f5f8f7] px-2.5 pb-2.5 pt-2"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-[#52666b]">Momentos destacados</span><button type="button" onClick={()=>setPenyaGalleryOpen(true)} className="text-[9px] font-extrabold text-[#24576a] underline underline-offset-2">Ver todas ({selectedPenyaGallery.length})</button></div><div className="relative mx-auto flex h-[150px] w-full max-w-[440px] items-center justify-center overflow-hidden rounded-xl bg-[#e8efed] p-2">
              {[0,1,2].map((slot)=>{const url=selectedPenyaFeaturedGallery[slot];const positions=["left-1/2 top-1 z-30 -translate-x-1/2 rotate-0","left-[12%] top-5 z-10 rotate-[-9deg]","right-[12%] top-5 z-20 rotate-[9deg]"];const widths=["w-[38%]","w-[32%]","w-[32%]"];return url?<button key={slot} type="button" onClick={()=>setPenyaFotoAmpliada(selectedPenyaGallery.indexOf(url))} aria-label={"Ampliar foto destacada "+(slot+1)} className={"absolute h-[124px] overflow-hidden rounded-xl border-[4px] border-white bg-white shadow-lg "+positions[slot]+" "+widths[slot]}><img src={url} alt={"Foto destacada "+(slot+1)+" de "+selectedPenya.nombre} loading="lazy" decoding="async" className="h-full w-full object-cover"/></button>:<div key={slot} aria-hidden="true" className={"absolute flex h-[112px] items-center justify-center rounded-xl border-[4px] border-white bg-gradient-to-br from-[#f2f6f4] to-[#d6e4e1] text-[#8ba29c] shadow-md "+positions[slot]+" "+widths[slot]}><span className="text-2xl">▧</span></div>;})}
            </div>
            <div className="mt-2 flex justify-center">
              {accountUser?.email?.toLowerCase()==="gomezandersonalex@gmail.com"?<button type="button" onClick={()=>setEditingFeaturedPenya(selectedPenya)} className="rounded-full bg-[#173f52] px-4 py-2 text-[10px] font-extrabold text-white shadow-md">＋ Añadir fotos destacadas</button>:selectedPenyaFeaturedGallery.length===0?<span className="rounded-full bg-white/90 px-4 py-2 text-[10px] font-semibold text-[#52666b]">Esta peña aún no tiene fotos destacadas</span>:null}
            </div>
          </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={()=>{setMapPenyaPreview(false);setCurrentPage("penyes");setPenyaDetailFullscreen(true);window.scrollTo({top:0,behavior:"smooth"});}} className="flex-1 rounded-xl bg-[#173f52] px-3 py-3 text-[12px] font-extrabold text-white shadow-sm transition hover:bg-[#24566a]">Ver ficha completa <span aria-hidden="true">↗</span></button>
              <button type="button" aria-label="Cerrar ventana" onClick={()=>{setSelectedPenya(null);setMapPenyaPreview(false);}} className="rounded-xl border border-[#dce6e5] bg-white px-4 py-3 text-[12px] font-bold text-[#52666b] transition hover:bg-[#f5f8f7]">Cerrar</button>
            </div>
          </div>
        </section>
      </div> : (
        <div className={`fixed inset-0 z-[2147483002] flex justify-center ${penyaDetailFullscreen ? "bg-[#102f3d] items-stretch p-0" : "bg-[#071c25]/75 items-end p-0 pt-[max(1rem,env(safe-area-inset-top))] sm:items-center sm:p-5 backdrop-blur-md"}`} onClick={() => { setSelectedPenya(null); setPenyaDetailFullscreen(false); }}>
          <section role="dialog" aria-modal="true" aria-label={selectedPenya.nombre} onClick={(e) => e.stopPropagation()} className={`penya-profile-sheet w-full overflow-auto overscroll-contain border border-border bg-background pb-[calc(105px+env(safe-area-inset-bottom))] shadow-[0_30px_100px_rgba(4,25,34,.42)] ${penyaDetailFullscreen ? "h-[100dvh] max-h-[100dvh] max-w-none rounded-none" : "max-h-[94dvh] max-w-[min(96vw,1500px)] rounded-t-[1.75rem] sm:rounded-[2rem]"}`}>
            <div className="relative h-[250px] overflow-hidden bg-[#c9e9f1] sm:h-[330px] lg:h-[370px]" style={{height:`clamp(250px,25vw,${selectedPenyaBannerBlock?.height??370}px)`}}>
              {selectedPenyaBanner&&<img src={selectedPenyaBanner} alt={"Portada de "+selectedPenya.nombre} style={{objectPosition:`${selectedPenyaBannerBlock?.positionX??50}% ${selectedPenyaBannerBlock?.positionY??50}%`,transform:`scale(${(selectedPenyaBannerBlock?.zoom??100)/100})`}} className="absolute inset-0 h-full w-full object-cover object-center"/>}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background"/>
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f0f5f2] via-background/75 to-transparent sm:h-40"/>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                {getPenyaStickerSet(selectedPenya.id).map((sticker,index)=><img key={selectedPenya.id+"-sticker-"+index} src={sticker.src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className={"penya-banner-sticker "+sticker.className}/ >)}
              </div>
              <button onClick={() => { setSelectedPenya(null); setPenyaDetailFullscreen(false); }} aria-label="Cerrar ficha" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-30 grid h-10 w-10 place-items-center rounded-full border border-white/65 bg-white/65 text-lg font-bold text-[#173f52] shadow-lg backdrop-blur-xl transition hover:scale-105">✕</button>
            </div>
            <div className="relative z-10 mx-auto -mt-[112px] w-full max-w-[1500px] px-4 pb-5 sm:-mt-[142px] sm:px-7 lg:px-12 xl:px-16 2xl:px-20">
              <div className="relative flex flex-col items-center text-center">
                <div className="relative z-20 grid h-44 w-44 shrink-0 place-items-center overflow-hidden rounded-full border-[7px] border-background bg-white text-5xl font-black text-[#173f52] shadow-[0_10px_34px_rgba(4,25,34,.22)] sm:h-56 sm:w-56 sm:border-[8px] lg:h-72 lg:w-72 xl:h-80 xl:w-80" style={{transform:`scale(${(penyaProfileLogoSettings[selectedPenya.id]?.frameScale??100)/100})`}}>{selectedPenya.foto?<img src={selectedPenya.foto} alt={"Logo de "+selectedPenya.nombre} style={{objectPosition:`${penyaProfileLogoSettings[selectedPenya.id]?.x??50}% ${penyaProfileLogoSettings[selectedPenya.id]?.y??50}%`,transform:`scale(${(penyaProfileLogoSettings[selectedPenya.id]?.zoom??100)/100})`}} className="h-full w-full object-cover"/>:selectedPenya.nombre.slice(0,1).toUpperCase()}</div>
                {(mayoralesPenyaId?selectedPenya.id===mayoralesPenyaId:esPenyaCuBaTa(selectedPenya.nombre))&&<div className="mt-2"><span className="inline-flex items-center gap-1 rounded-full border border-[#e6ce91] bg-[#fff7df] px-3 py-1 text-[10px] font-extrabold tracking-wide text-[#765c25] sm:text-xs">♛ MAYORALES {mayoralesAnio}</span></div>}
                <h2 className="mt-2 max-w-4xl break-words text-[26px] font-black leading-tight tracking-tight text-[#173f52] sm:mt-3 sm:text-4xl lg:text-[2.65rem]">{selectedPenya.nombre}</h2>
                {selectedPenya.informacion?.trim()&&<p className="mx-auto mt-2 max-w-2xl line-clamp-2 text-sm leading-relaxed text-[#61777b] sm:text-base">{selectedPenya.informacion}</p>}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2"><button type="button" onClick={()=>{setSelectedPenya(null);setPenyaDetailFullscreen(false);setCurrentPage("home");setCat("penya");setFocus(selectedPenya.id);window.scrollTo({top:0,behavior:"smooth"});}} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#d8e5e2] bg-white/90 px-4 py-2 text-xs font-extrabold text-[#24576a] shadow-sm transition hover:-translate-y-0.5">📍 Ver en el mapa</button>{selectedPenyaAcceptsVisits&&<span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-800"><span aria-hidden="true">✓</span> Esta peña acepta visitas</span>}</div>
              </div>
              {(() => {
                const profileTags = selectedPenyaCustomBlocks.filter((block:any)=>block.type==="tag" && String(block.title||"").trim() && !/^(acepta visitas|esta peña acepta visitas|puertas abiertas)$/i.test(String(block.title).trim())).map((block:any)=>String(block.title).trim());
                const memberCount = [selectedPenya.miembros_actuales, selectedPenya.numero_miembros, selectedPenya.miembros].find((value)=>typeof value==="number" && Number.isFinite(value) && value>0);
                const tags = [...(selectedPenya.tipo_musica ? ["♫ "+selectedPenya.tipo_musica] : []), ...(memberCount ? ["👥 "+memberCount+" miembros"] : []), ...profileTags, ...(misPenyes.includes(selectedPenya.id) ? ["★ Mi peña"] : [])].slice(0,4);
                const profilePhotos = selectedPenyaFeaturedGallery.slice(0,3);
                return <>
                  <div id="ficha-presentacion" className="mb-1 flex min-h-8 flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {tags.map((tag,index)=><span key={index} className={["rounded-full border px-3 py-1.5 text-[10px] font-bold shadow-sm sm:text-xs", "border-[#f3c5d7] bg-[#fff0f5] text-[#9d4567]", "border-[#c6d9f4] bg-[#edf5ff] text-[#315f9a]", "border-[#d7c8ed] bg-[#f5efff] text-[#70509b]", "border-[#c9e5d8] bg-[#eefaf3] text-[#367457]"][index%5]}>{tag}</span>)}
                  </div>
                  <section id="ficha-galeria" className="relative mt-5 overflow-hidden bg-transparent px-0 pb-3 pt-2 sm:mt-7">
                    <div className="mb-3 flex items-end justify-between gap-3 px-1"><div><h3 className="text-xl font-extrabold tracking-tight text-[#173f52] sm:text-2xl">Momentos destacados</h3><p className="mt-1 text-xs text-[#7b9293] sm:text-sm">Sus recuerdos más destacados</p></div><button type="button" onClick={()=>setPenyaGalleryOpen(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#d4e0de] bg-white px-3 py-2 text-[10px] font-extrabold text-[#24576a] shadow-sm transition hover:border-[#d4af37] sm:px-4 sm:text-xs">Ver galería ↗ <span className="rounded-full bg-[#edf3f1] px-1.5 py-0.5">{selectedPenyaGallery.length}</span></button></div>
                    <div className="relative mx-auto h-[250px] w-full max-w-[760px] sm:h-[340px] lg:h-[390px]">
                      {[0,1,2].map((slot)=>{const url=profilePhotos[slot];const positions=["left-1/2 top-0 z-30 -translate-x-1/2 rotate-0","left-[7%] top-8 z-10 -rotate-[9deg]","right-[7%] top-8 z-20 rotate-[9deg]"];const widths=["w-[48%] sm:w-[40%]","w-[43%] sm:w-[38%]","w-[43%] sm:w-[38%]"];return url?<button key={slot} type="button" onClick={()=>setPenyaFotoAmpliada(selectedPenyaGallery.indexOf(url))} aria-label={"Ampliar fotografía destacada "+(slot+1)} className={"group absolute h-[220px] overflow-hidden rounded-[1.25rem] border-[4px] border-white bg-[#e6eeeb] shadow-[0_12px_32px_rgba(23,63,82,.18)] transition-[transform,box-shadow] duration-700 ease-[cubic-bezier(.2,.75,.25,1)] will-change-transform hover:z-40 hover:scale-[1.055] hover:shadow-[0_20px_44px_rgba(23,63,82,.28)] sm:h-[310px] lg:h-[350px] sm:rounded-[1.5rem] "+positions[slot]+" "+widths[slot]}><img src={url} alt={selectedPenya.nombre+" · recuerdo "+(slot+1)} loading="lazy" decoding="async" style={selectedPenyaPhotoStyle(url)} className="h-full w-full object-cover"/></button>:<div key={slot} aria-hidden="true" className={"absolute flex h-[220px] items-center justify-center overflow-hidden rounded-[1.25rem] border-[4px] border-white bg-gradient-to-br from-[#edf3f1] to-[#dce8e4] text-[#8ba29c] shadow-[0_12px_32px_rgba(23,63,82,.12)] sm:h-[310px] lg:h-[350px] sm:rounded-[1.5rem] "+positions[slot]+" "+widths[slot]}><span className={slot===0?"text-5xl sm:text-6xl":"text-3xl sm:text-4xl"}>▧</span></div>;})}
                    </div>
                    <div className="mt-3 flex min-h-9 items-center justify-center">
                      {accountUser?.email?.toLowerCase()==="gomezandersonalex@gmail.com"?<button type="button" onClick={()=>setEditingFeaturedPenya(selectedPenya)} className="rounded-full bg-[#173f52] px-5 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-[#24566a]">＋ Añadir fotos destacadas</button>:profilePhotos.length===0?<span className="text-xs font-semibold text-[#7b9293]">Esta peña aún no tiene fotos destacadas</span>:null}
                    </div>
                  </section>
                </>;
              })()}
              <div className="mt-4 grid grid-cols-1 items-start gap-3 sm:gap-4 lg:grid-cols-2">
              {selectedPenya.informacion?.trim() && <section className="min-w-0 rounded-[1.5rem] border border-[#dce7e4] bg-white p-5 shadow-[0_8px_28px_rgba(23,63,82,.055)] sm:p-7"><div className="mb-3 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e7f0ed] text-lg text-[#173f52]">✦</span><h3 className="text-lg font-extrabold tracking-tight text-[#173f52] sm:text-xl">Quiénes somos</h3></div><p className="whitespace-pre-line text-[15px] leading-7 text-[#40575e] sm:text-base sm:leading-8">{selectedPenya.informacion}</p></section>}
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
                <button onClick={() => setEventFormPenya(selectedPenya)} className="flex min-w-0 flex-1 items-center justify-center rounded-xl bg-primary px-1.5 py-3 text-center text-[10px] font-bold leading-tight text-primary-foreground sm:px-3 sm:text-sm">＋ <span>Proponer un plan</span></button>
                <button onClick={() => toggleMiPenya(selectedPenya.id)} aria-pressed={misPenyes.includes(selectedPenya.id)} className="flex min-w-0 flex-1 items-center justify-center rounded-xl border border-primary/20 bg-white px-1.5 py-3 text-center text-[10px] font-bold leading-tight text-primary sm:px-3 sm:text-sm">{misPenyes.includes(selectedPenya.id) ? "★ " : "☆ "}<span>Mi peña</span></button>
                {instagramUrl(selectedPenya.instagram) && <a className="flex min-w-0 flex-1 items-center justify-center rounded-xl bg-[#173f52] px-1.5 py-3 text-center text-[10px] font-bold leading-tight text-white sm:px-3 sm:text-sm" href={instagramUrl(selectedPenya.instagram)!} target="_blank" rel="noreferrer"><span>Instagram ↗</span></a>}
                <button onClick={() => setEventFormPenya(selectedPenya)} className="flex min-w-0 flex-1 items-center justify-center rounded-xl border border-primary/20 bg-white px-1.5 py-3 text-center text-[10px] font-bold leading-tight text-primary sm:px-3 sm:text-sm"><span>{selectedPenya.tiene_evento ? "Añadir evento" : "+ Añadir evento"}</span></button>
              </div>
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
