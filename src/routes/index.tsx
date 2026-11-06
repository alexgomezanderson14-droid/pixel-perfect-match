import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import hero from "@/assets/hero-fiestas.jpg";
import { edicion, lugares as lugaresFijos, ui, type Categoria, type Lugar } from "@/content/fiestas";
import { programaOficial2026 } from "@/content/programa-oficial-2026";
import { supabase } from "@/integrations/supabase/client";

const FestMap = lazy(() => import("@/components/FestMap"));
const AddPenyaForm = lazy(() => import("@/components/AddPenyaForm"));
const AddPenyaEventForm = lazy(() => import("@/components/AddPenyaEventForm"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fiestas de l'Alfàs del Pi 2026 · Programa, mapa y peñas" },
      { name: "description", content: "Programa oficial, mapa interactivo y peñas de las Fiestas del Jubileo y del Santísimo Cristo del Buen Acierto de l'Alfàs del Pi." },
      { property: "og:title", content: "Fiestas de l'Alfàs del Pi 2026" },
      { property: "og:description", content: "Programa oficial, mapa interactivo y peñas de las fiestas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

function eventoSigueActivo(item: { dia?: string; hora?: string }, now = Date.now()) {
  if (!item.dia) return true;
  const hora = String(item.hora || "").match(/(?:^|\D)([01]\d|2[0-3]):([0-5]\d)/);
  const fechaLimite = new Date(`${String(item.dia).slice(0, 10)}T${hora ? hora[1] + ":" + hora[2] : "23:59"}:00`).getTime();
  return Number.isNaN(fechaLimite) || fechaLimite >= now;
}

function instagramUrl(value?: string | null) {
  if (!value?.trim()) return null;
  const raw = value.trim().replace(/^@/, "");
  return raw.startsWith("http") ? raw : "https://www.instagram.com/" + raw;
}

async function shareWebsite() {
  const url = window.location.href;
  const title = "Fiestas de l'Alfàs del Pi 2026";
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
  c.fillStyle = "#49352f";
  c.fillRect(0, 0, 1080, 430);

  c.fillStyle = "#e6b6c7";
  c.font = "bold 30px Arial";
  c.fillText("FIESTAS L'ALFÀS DEL PI · 2026", 76, 88);

  // La foto/logo de la peña se coloca como emblema circular.
  if (p.foto) {
    try {
      const response = await fetch(p.foto, { mode: "cors" });
      if (!response.ok) throw new Error("Logo no disponible");
      const objectUrl = URL.createObjectURL(await response.blob());
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
    } catch {
      c.fillStyle = "#e6b6c7";
      c.beginPath(); c.arc(160, 245, 92, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#49352f"; c.font = "bold 90px Arial";
      c.textAlign = "center"; c.fillText(p.nombre.trim().charAt(0).toUpperCase(), 160, 276); c.textAlign = "left";
    }
  } else {
    c.fillStyle = "#e6b6c7";
    c.beginPath(); c.arc(160, 245, 92, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#49352f"; c.font = "bold 90px Arial";
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

  c.fillStyle = "#49352f";
  c.font = "bold 34px Arial";
  c.fillText("ENCUÉNTRANOS EN EL MAPA", 76, 510);

  let mapDrawn = false;
  if (p.lat != null && p.lng != null) {
    try {
      const mapUrl = "https://staticmap.openstreetmap.de/staticmap.php?center=" + p.lat + "," + p.lng + "&zoom=16&size=960x760&markers=" + p.lat + "," + p.lng + ",red-pushpin";
      const response = await fetch(mapUrl, { mode: "cors" });
      if (!response.ok) throw new Error("Mapa no disponible");
      const objectUrl = URL.createObjectURL(await response.blob());
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
      mapDrawn = true;
    } catch { mapDrawn = false; }
  }

  if (!mapDrawn) {
    c.fillStyle = "#d9e3d8"; c.fillRect(60, 550, 960, 760);
    c.strokeStyle = "#ffffff"; c.lineWidth = 32; c.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      c.beginPath(); c.moveTo(80, 620 + i * 100);
      c.bezierCurveTo(360, 500 + i * 100, 640, 900 + i * 40, 1000, 600 + i * 100); c.stroke();
    }
    c.fillStyle = "#b45c79"; c.beginPath(); c.arc(540, 900, 35, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#49352f"; c.font = "bold 30px Arial";
    c.textAlign = "center"; c.fillText("UBICACIÓN DE LA PEÑA", 540, 1200); c.textAlign = "left";
  }

  c.fillStyle = "#49352f";
  c.font = "bold 34px Arial";
  c.fillText("DÓNDE ESTAMOS", 76, 1390);
  c.font = "30px Arial";
  c.fillStyle = "#655650";
  const address = (p.direccion || "L'Alfàs del Pi").trim();
  const addressLines = address.match(/.{1,48}(?:\\s|$)/g) || [address];
  addressLines.slice(0, 2).forEach((part, index) => c.fillText(part.trim(), 76, 1445 + index * 42));

  c.fillStyle = "#49352f";
  c.fillRect(60, 1570, 960, 3);
  c.fillStyle = "#49352f";
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
type PenyaDb = { id: string; nombre: string; direccion: string | null; lat: number | null; lng: number | null; foto: string; tipo_musica: string; tiene_evento?: boolean; instagram?: string | null };

function Home() {
  const [q, setQ] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDay, setFilterDay] = useState<"upcoming"|"today"|"tomorrow"|"all">("upcoming");
  const [filterCategory, setFilterCategory] = useState<"all"|"programa"|"actuaciones"|"penyes">("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<"home"|"agenda"|"buscar"|"programa"|"eventos"|"mapa"|"penyes"|"info">("home");
  const [publicDataLoaded, setPublicDataLoaded] = useState(false);
  const [avisos, setAvisos] = useState<any[]>([]);
  const [mapPoints, setMapPoints] = useState<Lugar[]>([]);
  const [cat, setCat] = useState<Categoria | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [penyes, setPenyes] = useState<PenyaDb[]>([]);
  const [actos, setActos] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [siteContent, setSiteContent] = useState<Record<string,string>>({});
  const [heroImage, setHeroImage] = useState("");
  const [form, setForm] = useState(false);
  const [shareReminder, setShareReminder] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [selectedPenya, setSelectedPenya] = useState<PenyaDb | null>(null);
  const [eventFormPenya, setEventFormPenya] = useState<PenyaDb | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const dias = useMemo(() => [...new Set(actos.map((a) => a.dia))].sort(), [actos]);
  const [dia, setDia] = useState<string | undefined>();
  const eventosActivos = useMemo(() => eventos.filter((e) => eventoSigueActivo(e, now)), [eventos, now]);
  const todayDate = new Date(now);
  const todayKey = todayDate.getFullYear()+"-"+String(todayDate.getMonth()+1).padStart(2,"0")+"-"+String(todayDate.getDate()).padStart(2,"0");
  const tomorrowDate = new Date(now); tomorrowDate.setDate(tomorrowDate.getDate()+1);
  const tomorrowKey = tomorrowDate.getFullYear()+"-"+String(tomorrowDate.getMonth()+1).padStart(2,"0")+"-"+String(tomorrowDate.getDate()).padStart(2,"0");
  const matchesDay = (item:any) => filterDay==="all" || (filterDay==="upcoming" ? eventoSigueActivo(item,now) : String(item.dia||"").slice(0,10)===(filterDay==="today"?todayKey:tomorrowKey) && eventoSigueActivo(item,now));
  const isOfficial = (item:any) => programaOficial2026.some((official)=>official.dia===item.dia && official.hora===item.hora && official.titulo===item.titulo);
  const filteredActs = useMemo(()=>actos.filter((a)=>matchesDay(a) && (filterCategory==="all" || (filterCategory==="programa" && isOfficial(a)) || (filterCategory==="actuaciones" && (a.tipo==="actuacion" || /tardeo|mañaneo|mananeo|nocheo|festes? al carrer|fiestas? en la calle/i.test(a.titulo||""))))), [actos,filterDay,filterCategory,now]);
  const filteredPenyaEvents = useMemo(()=>eventos.filter((e)=>matchesDay(e) && (filterCategory==="all" || filterCategory==="penyes")), [eventos,filterDay,filterCategory,now]);
  const avisosVisibles = avisos.filter((aviso:any)=>aviso.activo && (!aviso.publicar_en || new Date(aviso.publicar_en).getTime()<=now));
  const favoriteItems = useMemo(()=>[...actos.map((a)=>({...a,favoriteKey:"acto:"+a.id,kind:"Programa / actuación"})),...eventos.map((e)=>({...e,favoriteKey:"evento:"+e.id,kind:"Evento de peña"}))].filter((item)=>favorites.includes(item.favoriteKey)).sort((a,b)=>String(a.dia||"").localeCompare(String(b.dia||"")) || String(a.hora||"").localeCompare(String(b.hora||""))),[actos,eventos,favorites]);
  const searchResults = useMemo(() => {
    const normalize = (value: any) => String(value || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
    const term = normalize(searchTerm.trim());
    if (term.length < 2) return [];
    const matches = (...values: any[]) => values.some((value) => normalize(value).includes(term));
    const results: any[] = [];
    penyes.filter((p) => matches(p.nombre, p.direccion)).forEach((p) => results.push({ key: "penya:" + p.id, label: p.nombre, kind: "Peña", sub: p.direccion || "Ficha de la peña", onSelect: () => { setCurrentPage("penyes"); setSelectedPenya(p); window.scrollTo({top:0,behavior:"smooth"}); } }));
    eventos.filter((e) => matches(e.titulo, e.descripcion, e.lugar)).forEach((e) => results.push({ key: "evento:" + e.id, label: e.titulo, kind: "Evento de peña", sub: [e.dia, e.hora, e.lugar].filter(Boolean).join(" · "), onSelect: () => { setCurrentPage("eventos"); setFilterDay("all"); setFilterCategory("penyes"); window.scrollTo({top:0,behavior:"smooth"}); } }));
    actos.filter((a) => matches(a.titulo, a.descripcion, a.lugar)).forEach((a) => results.push({ key: "acto:" + a.id, label: a.titulo, kind: a.tipo === "actuacion" ? "Actuación" : "Programa oficial", sub: [a.dia, a.hora, a.lugar].filter(Boolean).join(" · "), onSelect: () => { const isAct = a.tipo === "actuacion" || /tardeo|mañaneo|mananeo|nocheo|festes? al carrer|fiestas? en la calle/i.test(a.titulo || ""); setCurrentPage(isAct ? "eventos" : "programa"); if (!isAct) setDia(a.dia); setFilterDay("all"); setFilterCategory(isAct ? "actuaciones" : "all"); window.scrollTo({top:0,behavior:"smooth"}); } }));
    mapPoints.filter((p) => matches(p.nombre, p.descripcion)).forEach((p) => results.push({ key: "lugar:" + p.id, label: p.nombre, kind: "Ubicación", sub: p.descripcion || "Punto de interés", onSelect: () => { setCurrentPage("home"); setCat(null); setQ(""); setFocus(null); requestAnimationFrame(() => setFocus(p.id)); window.scrollTo({top:0,behavior:"smooth"}); } }));
    return results.slice(0, 12);
  }, [searchTerm, penyes, eventos, actos, mapPoints]);
  const toggleFavorite=(key:string)=>setFavorites((current)=>{const next=current.includes(key)?current.filter((x)=>x!==key):[...current,key];try{localStorage.setItem("fiestas-favorites",JSON.stringify(next));}catch{}return next;});
  useEffect(() => { if (dias.length && !dia) setDia(dias[0]); }, [dias, dia]);
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem("fiestas-favorites")||"[]");if(Array.isArray(saved))setFavorites(saved.filter((x)=>typeof x==="string"));}catch{setFavorites([]);}},[]);
  useEffect(()=>{if(!publicDataLoaded)return;const valid=new Set([...actos.map(a=>"acto:"+a.id),...eventos.map(e=>"evento:"+e.id)]);setFavorites((current)=>{const next=current.filter((key)=>valid.has(key));if(next.length!==current.length){try{localStorage.setItem("fiestas-favorites",JSON.stringify(next));}catch{}}return next;});},[publicDataLoaded,actos,eventos]);
  useEffect(() => {
    if (!mapFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMapFullscreen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [mapFullscreen]);
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(tick);
  }, []);
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
      supabase.from("penyes").select("id,nombre,direccion,lat,lng,foto_url,tipo_musica,tiene_evento,instagram").eq("estado","aprobada").order("nombre"),
      supabase.from("actos").select("*").eq("publicado",true).order("dia").order("hora"),
      supabase.from("eventos").select("*").eq("publicado",true).order("dia").order("hora"),
      supabase.from("site_content").select("clave,valor"),
    ]);
    let data: any[] | null = penyaResult.data as any[] | null;
    if (penyaResult.error) {
      const legacyPenyes = await supabase.from("penyes").select("id,nombre,direccion,lat,lng,foto_url,tipo_musica,tiene_evento").eq("estado","aprobada").order("nombre");
      data = legacyPenyes.data?.map((p) => ({ ...p, instagram: "" })) ?? null;
    }
    setPublicDataLoaded(Array.isArray(actosData) && Array.isArray(eventosData));
    const filas = actosData ?? [];
    // El programa oficial del PDF es la fuente principal. La base de datos aporta
    // identificadores y actos añadidos, pero no debe sobrescribir el contenido oficial.
    const oficiales = programaOficial2026.map((oficial) => {
      const fila = filas.find((item) => item.dia === oficial.dia && item.hora === oficial.hora && item.titulo === oficial.titulo);
      return fila ? { ...fila, ...oficial, id: fila.id } : oficial;
    });
    const extras = filas.filter((fila) => !/autobús lanzadera/i.test(fila.titulo || "") && !programaOficial2026.some((oficial) => fila.dia === oficial.dia && fila.hora === oficial.hora && fila.titulo === oficial.titulo));
    setActos([...oficiales, ...extras]);
    setEventos(eventosData ?? []);
    const content = Object.fromEntries((contentData ?? []).map((x:any)=>[x.clave,x.valor]));
    setSiteContent(content);
    try { const parsed=JSON.parse(content["avisos_json"]||"[]"); setAvisos(Array.isArray(parsed)?parsed:[]); } catch { setAvisos([]); }
    try { const points=JSON.parse(content["mapa_puntos_json"]||"[]"); setMapPoints(Array.isArray(points)?points.filter((p:any)=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))&&Number(p.lat)>=-90&&Number(p.lat)<=90&&Number(p.lng)>=-180&&Number(p.lng)<=180):[]); } catch { setMapPoints([]); }
    if (content["hero_image_path"]) {
      const { data: imageData } = supabase.storage.from("penyes").getPublicUrl(content["hero_image_path"]);
      setHeroImage(imageData.publicUrl);
    } else {
      setHeroImage("");
    }
    if (!data) return;
    const urls = data.map((p) => p.foto_url ? supabase.storage.from("penyes").getPublicUrl(p.foto_url).data.publicUrl : "");
    setPenyes(data.map((p, i) => ({ ...p, foto: urls[i] ?? "" })));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const todos: Lugar[] = useMemo(() => [
    ...lugaresFijos,
    ...mapPoints,
    ...penyes.filter((p) => p.lat != null && p.lng != null).map((p) => ({ id: p.id, categoria: "penya" as const, nombre: p.nombre, descripcion: p.direccion ?? "", lat: Number(p.lat), lng: Number(p.lng), foto: p.foto })),
    ...actos.filter((a) => a.lat != null && a.lng != null && eventoSigueActivo(a,now)).map((a) => ({ id: "acto-" + a.id, categoria: a.tipo as Categoria, nombre: a.titulo, descripcion: a.descripcion || a.lugar || "", lat: Number(a.lat), lng: Number(a.lng), dia:a.dia, hora:a.hora, detalleId:"acto-"+a.id })),
    ...eventosActivos.filter((e) => e.lat != null && e.lng != null).map((e) => ({ id: "evento-" + e.id, categoria: "evento" as const, nombre: e.titulo, descripcion: e.descripcion || e.lugar || "", lat: Number(e.lat), lng: Number(e.lng), dia:e.dia, hora:e.hora, detalleId:"evento-"+e.id })),
  ], [penyes, actos, eventosActivos, mapPoints, now]);

  const visibles = todos.filter((l) => (!cat || l.categoria === cat) && l.nombre.toLowerCase().includes(q.toLowerCase()));

  const goMap = (id?: string) => {
    if (!id) return;
    setCurrentPage("mapa");
    setCat(null);
    setQ("");
    setFocus(null);
    requestAnimationFrame(() => setFocus(id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="page-bg min-h-screen" style={{ "--pink": siteContent["theme_accent"] || "oklch(0.76 0.08 355)", "--secondary": siteContent["theme_accent"] || "oklch(0.76 0.08 355)", "--accent": siteContent["theme_accent"] || "oklch(0.76 0.08 355)", "--ring": siteContent["theme_accent"] || "oklch(0.76 0.08 355)", "--cat-penya": siteContent["theme_accent"] || "oklch(0.76 0.08 355)", "--background": siteContent["theme_background"] || "oklch(0.95 0.015 75)", "--gradient-page": `linear-gradient(180deg, ${siteContent["theme_background"] || "oklch(0.96 0.015 70)"}, ${siteContent["theme_background"] || "oklch(0.93 0.02 60)"})` } as React.CSSProperties}>
      <nav aria-label="Navegación principal" className="fixed inset-x-2 bottom-2 z-[5000] mx-auto grid max-w-4xl grid-cols-6 items-stretch gap-1 rounded-[1.6rem] border border-white/80 bg-white/95 p-1.5 shadow-[0_8px_32px_rgba(45,32,30,0.2)] backdrop-blur-xl sm:bottom-4 sm:gap-2 sm:rounded-full sm:p-2" style={{paddingBottom:"max(0.375rem, env(safe-area-inset-bottom))"}}>
        {[
          ["home","⌂","Inicio"],
          ["eventos","🎤","Eventos"],
          ["penyes","☷","Peñas"],
          ["programa","▦","Programa"],
          ["agenda","★","Agenda"],
          ["info","ⓘ","Info"],
        ].map(([page,icon,label])=><button key={page} type="button" aria-current={currentPage===page?"page":undefined} onClick={()=>{setMapFullscreen(false);setCurrentPage(page as any);window.scrollTo({top:0,behavior:"smooth"});}} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-2 text-center transition sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:py-3 ${currentPage===page?"bg-pink/20 text-primary":"text-muted-foreground hover:bg-glass"}`}><span className="text-xl leading-none sm:text-lg">{icon}</span><span className="whitespace-nowrap text-[9px] font-bold leading-tight sm:text-sm">{label}</span></button>)}
      </nav>

      {currentPage==="home" && <>
      <section className="relative flex min-h-[76vh] items-end overflow-hidden sm:min-h-[92vh]">
        <img src={heroImage || hero} alt="Fiestas en las calles de l'Alfàs del Pi" width={1920} height={1280} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-brown/90 via-brown/20 to-transparent" />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-9 sm:px-5 sm:pb-16">
          <span className="glass-dark mb-4 inline-block rounded-full px-3 py-1 text-xs">{siteContent["hero_fechas"] || edicion.fechas}</span>
          <h1 className="rise text-4xl font-bold leading-[0.98] text-on-image sm:text-7xl md:text-8xl">{siteContent["hero_titulo"] || edicion.titulo} <span className="text-pink">{edicion.anyo}</span></h1>
          <p className="rise mt-3 max-w-xl text-sm text-on-image/85 sm:mt-4 sm:text-lg">{siteContent["hero_subtitulo"] || edicion.subtitulo}</p>
        </div>
      </section>


      <main className="mx-auto max-w-6xl px-3 pb-28 pt-8 sm:px-5">
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
              <button type="button" onClick={() => setMapFullscreen(true)} aria-label="Ampliar mapa a pantalla completa" className="absolute right-3 top-3 z-[1200] rounded-full border border-white/70 bg-white/95 px-4 py-2 text-sm font-bold text-[#49352f] shadow-lg">⛶ Pantalla completa</button>
              <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
                <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}>
                  <FestMap lugares={visibles} focusId={focus} onPenyaClick={(id) => setSelectedPenya(penyes.find((p) => p.id === id) ?? null)} onItemClick={(id)=>{setCurrentPage("eventos");setFilterDay("all");setFilterCategory(id.startsWith("acto-")?"actuaciones":"penyes");window.scrollTo({top:0,behavior:"smooth"});}} />
                </Suspense>
              </ClientOnly>
            </div>}
          </div>
        </section>
      </main>
      </>}
      {currentPage==="programa" && <main className="mx-auto min-h-[75vh] max-w-6xl px-3 pb-32 pt-8 sm:px-5">
        <section id="programa" className="scroll-mt-24">
          <SectionTitle>{ui.nav.programa}</SectionTitle>
          {!dias.length ? (
            <div className="glass rounded-3xl p-6 text-muted-foreground">{ui.programaPendiente}</div>
          ) : (
            <>
              <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                {dias.map((d) => (
                  <Chip key={d} active={dia === d} onClick={() => setDia(d)}><span className="inline-block first-letter:uppercase">{fmtDia(d)}</span></Chip>
                ))}
              </div>
              <div className="space-y-3">
                {[...actos.filter((a) => a.dia === dia)].sort((a, b) => {
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
                    <div className="flex items-center gap-2">{a.lat != null && a.lng != null ? <button onClick={() => goMap("acto-" + a.id)} className="glass-btn px-4 py-2 text-sm font-bold">Ver en el mapa</button> : null}<button type="button" onClick={()=>toggleFavorite("acto:"+a.id)} aria-label="Guardar actuación en Mi agenda" className="rounded-full border border-primary/30 px-3 py-2 text-sm font-bold text-primary">{favorites.includes("acto:"+a.id)?"★":"☆"}</button></div>
                  </article>;
                })}
                {!actos.some((a) => a.dia === dia) && <p className="glass rounded-2xl p-5 text-muted-foreground">No hay actos publicados para este día.</p>}
              </div>
            </>
          )}
        </section>
      </main>}
      {currentPage==="eventos" && <main className="mx-auto min-h-[75vh] max-w-6xl px-3 pb-32 pt-8 sm:px-5">
        <section id="eventos" className="scroll-mt-24">
          <SectionTitle>Eventos</SectionTitle>
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
          <div className="mb-6 space-y-2">
            <h3 className="text-2xl font-bold text-primary">Actuaciones y festes al carrer</h3>
            <p className="text-sm text-muted-foreground">Pulsa en cada evento para consultar su descripción, fecha y lugar.</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {filteredActs.filter((a) => {
              if (filterDay !== "all" && !eventoSigueActivo(a, now)) return false;
              const t = String(a.titulo || "").toLocaleLowerCase("es");
              const excluido = /despertà|desperta|despertada|nit de albaes|nit d'albaes|nit de les albaes|albaes/.test(t);
              return !excluido && (a.tipo === "actuacion" || /tardeo|mañaneo|mananeo|nocheo|festes? al carrer|fiestas? en la calle/.test(t));
            }).sort((a,b) => a.dia.localeCompare(b.dia) || (a.hora || "").localeCompare(b.hora || "")).map((a) => {
              const t = String(a.titulo || "").toLocaleLowerCase("es");
              const festaCarrer = /tardeo|mañaneo|mananeo|nocheo|festes? al carrer|fiestas? en la calle/.test(t);
              const portada = a.imagen_url || a.imagen || a.foto_url || a.foto || "";
              return <details id={"acto-"+a.id} key={a.id} className="glass group min-w-0 overflow-hidden rounded-xl border border-border/60 shadow-sm sm:rounded-3xl">
                <summary className="cursor-pointer list-none">
                  <div className="relative aspect-[5/4] overflow-hidden bg-gradient-to-br from-[#f4e8e9] via-[#ead9df] to-[#e9e3d7]">
                    {portada ? <img src={portada} alt={a.titulo} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"/> : <div className="absolute inset-0 flex items-center justify-center p-5 text-center"><span className="font-display text-base font-bold leading-tight text-[#765563] sm:text-3xl">{a.titulo}</span></div>}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#49352f]/80 to-transparent p-2 pt-8 sm:p-4 sm:pt-14">
                      <span className="mb-2 inline-block rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#765563]">{festaCarrer ? "Festa al carrer" : "Actuación"}</span>
                      <h3 className="line-clamp-2 text-xs font-bold leading-tight text-white sm:text-xl">{a.titulo}</h3>
                      <p className="mt-2 text-xs font-semibold text-white/90">Ver detalles <span className="inline-block transition group-open:rotate-180">⌄</span></p>
                    </div>
                  </div>
                </summary>
                <div className="space-y-2 border-t border-border/50 p-2 sm:space-y-3 sm:p-4"><button type="button" onClick={()=>toggleFavorite("acto:"+a.id)} className="rounded-full border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary">{favorites.includes("acto:"+a.id)?"★ Guardado en Mi agenda":"☆ Añadir a Mi agenda"}</button>
                  {a.descripcion && <p className="text-sm leading-relaxed text-muted-foreground">{a.descripcion}</p>}
                  <p className="text-sm"><strong>Fecha:</strong> {fmtDia(a.dia)}{a.hora ? " · " + a.hora : ""}</p>
                  {a.lugar && <p className="text-sm"><strong>Lugar:</strong> {a.lugar}</p>}
                  {a.lat != null && a.lng != null && <button onClick={() => goMap("acto-" + a.id)} className="glass-btn px-4 py-2 text-sm font-bold">Ver en el mapa de la web</button>}
                </div>
              </details>;
            })}
          </div>
          <div className="mt-10 space-y-3">
            <h3 className="text-2xl font-bold text-primary">Otros eventos de las peñas</h3>
            {!eventosActivos.length ? <div className="glass rounded-3xl p-6 text-muted-foreground">Todavía no hay eventos de peñas publicados.</div> : <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">{filteredPenyaEvents.map((e) => {
              const imagen = e.imagen_url || e.imagen || e.foto_url || e.foto;
              const penyaAsociada = penyes.find(p => p.id === e.penya_id) || penyes.find(p => [e.titulo, e.descripcion, e.lugar].some((v) => String(v || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(p.nombre.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, ""))));
              const penyaNombre = penyaAsociada?.nombre;
              return <article id={"evento-"+e.id} key={e.id} className="glass min-w-0 overflow-hidden rounded-xl border border-border/60 shadow-sm sm:rounded-3xl">
                <div className="relative aspect-[5/4] overflow-hidden bg-gradient-to-br from-[#f4e8e9] via-[#ead9df] to-[#e9e3d7]">
                  {imagen ? <img src={imagen} alt={e.titulo} loading="lazy" className="absolute inset-0 h-full w-full object-cover"/> : <div className="absolute inset-0 flex items-center justify-center p-5 text-center"><span className="font-display text-xl font-bold text-[#49352f] sm:text-3xl">{e.titulo}</span></div>}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#f4eee5] via-[#f4eee5]/95 to-[#f4eee5]/0 px-2 pb-2 pt-10 text-[#49352f] sm:px-4 sm:pb-4 sm:pt-16">
                    <div className="flex items-end justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-xs font-extrabold leading-tight text-[#49352f] sm:text-xl">{e.titulo}</h3>
                        <p className="mt-1 text-[10px] font-bold text-[#59443c] sm:mt-2 sm:text-sm">{fmtDia(e.dia)}{e.hora ? " · " + e.hora : ""}</p>
                        {e.lugar && <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-[#59443c] sm:text-sm">📍 {e.lugar}</p>}
                        {e.descripcion && <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[#59443c] sm:text-sm">{e.descripcion}</p>}
                      </div>
                      {penyaNombre && <div className="max-w-[34%] shrink-0 flex flex-col items-end gap-1 text-right"><img src={penyaAsociada?.foto || ""} alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm sm:h-11 sm:w-11"/><span className="text-[9px] font-extrabold leading-tight text-[#49352f] sm:text-xs">{penyaNombre}</span></div>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-1.5"><button type="button" onClick={()=>toggleFavorite("evento:"+e.id)} className="text-xs font-bold text-primary">{favorites.includes("evento:"+e.id)?"★ En Mi agenda":"☆ Añadir a Mi agenda"}</button>{e.lat != null && e.lng != null && <button onClick={() => goMap("evento-" + e.id)} className="text-[10px] font-bold text-[#49352f] sm:text-sm">📍 Ver ubicación</button>}</div>
              </article>;
            })}</div>}
          </div>
        </section>
      </main>}
      {currentPage==="penyes" && <main className="mx-auto min-h-[75vh] max-w-6xl px-3 pb-32 pt-8 sm:px-5">
        <section id="penyes" className="scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-8 sm:gap-4">
            <h2 className="text-2xl font-bold text-primary sm:text-5xl">{ui.nav.penyes}</h2>
            <button onClick={() => setForm(true)} className="rounded-full bg-pink px-6 py-3 font-bold text-brown transition hover:-translate-y-0.5">+ {ui.addPenya}</button>
          </div>
          {!penyes.length ? (
            <div className="glass rounded-3xl p-6 text-muted-foreground">{ui.sinPenyes}</div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {penyes.map((p) => (
                <article id={"penya-" + p.id} key={p.id} className="glass min-w-0 overflow-hidden rounded-xl sm:rounded-3xl">
                  {p.foto && <img src={p.foto} alt={p.nombre} loading="lazy" className="h-16 w-full object-cover sm:h-44" />}
                  <div className="p-2 sm:p-6">
                    <h3 className="line-clamp-2 text-xs font-bold leading-tight sm:text-2xl">{p.nombre}</h3>
                    {p.direccion && <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground sm:text-sm">{p.direccion}</p>}
                    <p className="mt-1 text-[10px] sm:mt-3 sm:text-sm"><strong>Música:</strong> {p.tipo_musica || "Variada"}</p>
                    
                    {eventos.filter((e) => e.penya_id === p.id || [e.titulo, e.descripcion, e.lugar].some((v) => String(v || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(p.nombre.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "")))).map((e) => <p key={"evento-" + e.id} className="mt-2 rounded-lg bg-pink/20 px-2 py-1 text-[10px] leading-snug text-[#49352f] sm:text-sm"><strong>Plan:</strong> {e.titulo} · {fmtDia(e.dia)}{e.hora ? " · " + e.hora : ""}</p>)}{actos.filter((a) => [a.titulo, a.descripcion, a.lugar].some((v) => String(v || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(p.nombre.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "")))).map((a) => <p key={"acto-" + a.id} className="mt-2 rounded-lg bg-pink/20 px-2 py-1 text-[10px] leading-snug text-[#49352f] sm:text-sm"><strong>Plan:</strong> {a.titulo} · {fmtDia(a.dia)}{a.hora ? " · " + a.hora : ""}</p>)}
                    <div className="mt-2 flex flex-wrap gap-1 sm:mt-3 sm:gap-2"><button onClick={() => setSelectedPenya(p)} className="rounded-full bg-pink px-2 py-1 text-[10px] font-bold text-brown sm:px-4 sm:py-2 sm:text-sm">Ver peña</button><button onClick={() => goMap(p.id)} className="glass-btn px-2 py-1 text-[10px] font-bold sm:px-4 sm:py-2 sm:text-sm">📍 {ui.verMapa}</button><button onClick={() => void sharePenyaCard(p)} className="glass-btn px-2 py-1 text-[10px] font-bold sm:px-4 sm:py-2 sm:text-sm">↗ Crear historia</button><button onClick={() => setEventFormPenya(p)} className="glass-btn px-2 py-1 text-[10px] font-bold sm:px-4 sm:py-2 sm:text-sm">{p.tiene_evento ? "Añadir evento" : "+ Añadir evento"}</button></div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs sm:mt-3 sm:gap-3 sm:text-sm">{instagramUrl(p.instagram) && <a className="font-semibold text-primary underline" href={instagramUrl(p.instagram)!} target="_blank" rel="noreferrer">{`↗ @${p.instagram?.replace(/^@/, "") || "Instagram"}`}</a>}</div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>}
      {currentPage==="info" && <main className="mx-auto min-h-[75vh] max-w-5xl px-4 pb-32 pt-8 sm:px-5">
        <section id="info" className="scroll-mt-24">
          <SectionTitle>{ui.nav.info}</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass rounded-3xl p-6"><h3 className="text-xl font-bold">{siteContent["info_titulo"] || ui.emergencias}</h3><p className="mt-2 font-display text-4xl font-bold text-primary">{siteContent["info_telefono"] || "112"}</p></div>
            <article className="glass rounded-3xl p-6 md:col-span-2">
              <div className="mb-3 flex items-center gap-3"><span className="text-3xl">🚌</span><div><h3 className="text-2xl font-bold text-primary">Autobús lanzadera</h3><p className="text-sm text-muted-foreground">Información práctica de transporte durante las fiestas</p></div></div>
              <p className="font-semibold">Del 6 al 9 de noviembre · de 01:00 a 04:00 h</p>
              <p className="mt-2 text-sm">Salidas cada hora desde el parking de La Bolleta (frente a Gaudí).</p>
              <p className="mt-2 text-sm"><strong>Paradas:</strong> Parque Escandinavia, San Rafael, Tossalet, avenida Sant Pere (Albir Garden) y Consum Albir.</p>
              <p className="mt-2 text-sm">El recorrido de regreso finaliza en el parking de La Bolleta.</p>
            </article>
          </div>
        </section>
      </main>}
      {currentPage!=="home" && avisosVisibles.length>0 && <section aria-label="Avisos importantes" className="mx-auto mb-8 max-w-5xl space-y-2 px-4 sm:px-5">{avisosVisibles.map((aviso:any)=><article key={aviso.id} className={`rounded-2xl border p-3 sm:p-4 ${aviso.importante?"border-amber-400 bg-amber-50 text-amber-950 shadow-md":"border-border bg-background/80 text-foreground"}`}><div className="flex items-start gap-3"><span className="text-xl">{aviso.importante?"⚠️":"📢"}</span><div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-wide">{aviso.importante?"Aviso importante":"Comunicado"}</p><h2 className="font-bold">{aviso.titulo}</h2><p className="mt-1 text-sm">{aviso.descripcion}</p></div></div></article>)}</section>}
      {currentPage==="agenda" && <main className="mx-auto min-h-[85vh] max-w-5xl px-4 pb-32 pt-8 sm:px-5"><div className="mb-6 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tus favoritos</p><h1 className="mt-1 text-3xl font-bold text-primary sm:text-5xl">Mi agenda</h1><p className="mt-2 text-sm text-muted-foreground">Tus eventos y actuaciones guardados, ordenados por fecha y hora.</p></div><span className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">{favoriteItems.length} guardados</span></div>{favoriteItems.length ? <div className="grid gap-3 sm:grid-cols-2">{favoriteItems.map((item:any)=><article key={item.favoriteKey} className="glass flex items-center justify-between gap-3 rounded-2xl p-4"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-primary">{item.kind}</p><h2 className="mt-1 text-base font-bold">{item.titulo}</h2><p className="mt-1 text-xs text-muted-foreground">{item.dia} · {item.hora||"Hora por confirmar"}{item.lugar?" · "+item.lugar:""}</p></div><button type="button" onClick={()=>toggleFavorite(item.favoriteKey)} aria-label="Quitar de mi agenda" title="Quitar de mi agenda" className="shrink-0 rounded-full border border-primary/20 bg-background/70 px-3 py-2 text-xl text-primary">★</button></article>)}</div> : <div className="glass rounded-3xl px-5 py-12 text-center"><p className="text-4xl">☆</p><h2 className="mt-3 text-xl font-bold text-primary">Todavía no tienes favoritos</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Vuelve al inicio y pulsa la estrella de cualquier evento o actuación para guardarlo aquí.</p><button type="button" onClick={()=>{setCurrentPage("home");window.scrollTo({top:0,behavior:"smooth"});}} className="mt-5 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Explorar fiestas</button></div>}</main>}

      {mapFullscreen && typeof document !== "undefined" && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Mapa a pantalla completa" className="fixed inset-0 z-[99999] h-[100dvh] w-screen overflow-hidden bg-[#f3eee6]">
          <div className="absolute inset-0">
            <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
              <Suspense fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
                <FestMap lugares={visibles} focusId={focus} onPenyaClick={(id) => setSelectedPenya(penyes.find((p) => p.id === id) ?? null)} onItemClick={(id)=>{setMapFullscreen(false);setCurrentPage("eventos");setFilterDay("all");setFilterCategory(id.startsWith("acto-")?"actuaciones":"penyes");window.scrollTo({top:0,behavior:"smooth"});}} />
              </Suspense>
            </ClientOnly>
          </div>
          <button type="button" onClick={() => setMapFullscreen(false)} className="absolute right-4 top-4 z-[100000] rounded-full border border-white bg-white px-5 py-3 text-sm font-bold text-[#49352f] shadow-xl">✕ Cerrar mapa</button>
        </div>, document.body
      )}
      {<footer className="space-y-4 px-5 pb-32 text-center text-sm text-muted-foreground">
        <p>{edicion.titulo} · {edicion.anyo}</p>
        <button onClick={() => void shareWebsite()} className="glass-btn rounded-full px-6 py-3 font-bold text-primary">↗ Compartir la web</button>
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => shareOn("whatsapp", window.location.href, "Fiestas de l'Alfàs del Pi 2026", "Consulta el programa, el mapa y las peñas.")} className="glass-btn rounded-full px-4 py-2 text-xs font-bold">WhatsApp</button>
          <button onClick={() => shareOn("facebook", window.location.href, "Fiestas de l'Alfàs del Pi 2026", "Consulta el programa, el mapa y las peñas.")} className="glass-btn rounded-full px-4 py-2 text-xs font-bold">Facebook</button>
          <button onClick={() => shareOn("telegram", window.location.href, "Fiestas de l'Alfàs del Pi 2026", "Consulta el programa, el mapa y las peñas.")} className="glass-btn rounded-full px-4 py-2 text-xs font-bold">Telegram</button>
          <button onClick={() => shareOn("x", window.location.href, "Fiestas de l'Alfàs del Pi 2026", "Consulta el programa, el mapa y las peñas.")} className="glass-btn rounded-full px-4 py-2 text-xs font-bold">X</button>
          <button onClick={() => shareOn("email", window.location.href, "Fiestas de l'Alfàs del Pi 2026", "Consulta el programa, el mapa y las peñas.")} className="glass-btn rounded-full px-4 py-2 text-xs font-bold">Correo</button>
          <button onClick={() => void copyShareLink(window.location.href)} className="glass-btn rounded-full px-4 py-2 text-xs font-bold">Copiar enlace</button>
        </div>
      </footer>}
      {currentPage==="home" && shareReminder && <aside role="status" className="fixed inset-x-4 bottom-4 z-[1800] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-border bg-background p-4 shadow-2xl">
        <div className="min-w-0 flex-1"><p className="font-bold text-primary">¿Compartimos las fiestas?</p><p className="text-sm text-muted-foreground">Pasa la web a tus amigos para que nadie se pierda el programa ni los eventos.</p></div>
        <button onClick={() => { setShareReminder(false); localStorage.setItem("fiestas-share-reminder-last", String(Date.now())); }} className="shrink-0 rounded-full px-3 py-2 text-sm">Ahora no</button>
        <button onClick={() => { setShareReminder(false); void shareWebsite(); }} className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Compartir</button>
      </aside>}

      {selectedPenya && (
        <div className="fixed inset-0 z-[1900] flex items-end justify-center bg-brown/70 p-3 sm:items-center" onClick={() => setSelectedPenya(null)}>
          <section role="dialog" aria-modal="true" aria-label={selectedPenya.nombre} onClick={(e) => e.stopPropagation()} className="glass max-h-[94vh] w-full max-w-2xl overflow-auto rounded-[2rem] bg-background">
            {selectedPenya.foto && <img src={selectedPenya.foto} alt={selectedPenya.nombre} className="h-48 w-full object-cover sm:h-60" />}
            <div className="p-5 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Peña participante</p><h2 className="mt-1 text-3xl font-bold text-primary sm:text-4xl">{selectedPenya.nombre}</h2></div>
                <button onClick={() => setSelectedPenya(null)} aria-label="Cerrar" className="glass-btn h-10 w-10 shrink-0 rounded-full">✕</button>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-xl">✓</span>
                <div><p className="font-bold">Esta peña acepta visitas</p><p className="text-sm text-emerald-700">Pásate a conocer el ambiente y disfrutar de las fiestas.</p></div>
              </div>

              <div className="mt-7">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold text-primary">Planes de la peña</h3>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agenda</span>
                </div>
                {(eventos.filter((e) => e.penya_id === selectedPenya.id || [e.titulo, e.descripcion, e.lugar].some((v) => String(v || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(selectedPenya.nombre.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "")))).length + actos.filter((a) => [a.titulo, a.descripcion, a.lugar].some((v) => String(v || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(selectedPenya.nombre.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "")))).length) ? (
                  <div className="space-y-3">
                    {[...eventos.filter((e) => e.penya_id === selectedPenya.id || [e.titulo, e.descripcion, e.lugar].some((v) => String(v || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(selectedPenya.nombre.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "")))), ...actos.filter((a) => [a.titulo, a.descripcion, a.lugar].some((v) => String(v || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(selectedPenya.nombre.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, ""))))].map((e) => {
                      const fecha = new Date(String(e.dia).slice(0, 10) + "T12:00:00");
                      const diaNumero = fecha.toLocaleDateString("es-ES", { day: "2-digit" });
                      const mes = fecha.toLocaleDateString("es-ES", { month: "short" }).replace(".", "").toUpperCase();
                      return <article key={e.id} className="overflow-hidden rounded-2xl border border-border/70 bg-white/70 shadow-sm">
                        <div className="grid grid-cols-[104px_1fr] sm:grid-cols-[124px_1fr]">
                          <div className="flex min-h-[142px] flex-col items-center justify-center bg-[#e8b9c9] px-2 py-4 text-center text-[#49352f]">
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
                  <div className="rounded-2xl border border-dashed border-border bg-glass p-5 text-sm text-muted-foreground">Esta peña todavía no ha publicado ningún plan. ¡Vuelve a consultar la agenda pronto!</div>
                )}
              </div>

              {selectedPenya.direccion && <div className="mt-5 flex items-start gap-2 text-sm text-muted-foreground"><span>📍</span><span>{selectedPenya.direccion}</span></div>}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <a
                  href={selectedPenya.lat != null && selectedPenya.lng != null
                    ? "https://www.google.com/maps/dir/?api=1&destination=" + selectedPenya.lat + "," + selectedPenya.lng
                    : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent((selectedPenya.direccion || selectedPenya.nombre) + ", l'Alfàs del Pi")}
                  target="_blank" rel="noreferrer"
                  className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#49352f] px-5 py-3 text-center font-bold text-white transition hover:-translate-y-0.5"
                >📍 Cómo llegar</a>
                <button onClick={() => void sharePenyaCard(selectedPenya)} className="flex min-h-14 items-center justify-center gap-2 rounded-full border border-primary/20 bg-white/70 px-5 py-3 font-bold text-primary transition hover:-translate-y-0.5">↗ Compartir</button>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {instagramUrl(selectedPenya.instagram) && <a className="font-semibold text-primary underline" href={instagramUrl(selectedPenya.instagram)!} target="_blank" rel="noreferrer">{'Instagram · @' + selectedPenya.instagram?.replace(/^@/, "")}</a>}
                <button onClick={() => setEventFormPenya(selectedPenya)} className="font-semibold text-primary underline">{selectedPenya.tiene_evento ? "Añadir otro evento" : "+ Añadir evento"}</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {eventFormPenya && (
        <ClientOnly><Suspense fallback={null}><AddPenyaEventForm penyaId={eventFormPenya.id} penyaName={eventFormPenya.nombre} onClose={() => setEventFormPenya(null)} onSaved={(organizaEvento) => { setEventFormPenya(null); void cargar(); window.alert(organizaEvento ? "¡Evento enviado! Aparecerá en la web cuando sea aprobado." : "Se ha guardado que esta peña no organiza ningún evento."); }} /></Suspense></ClientOnly>
      )}

      {form && (
        <ClientOnly>
          <Suspense fallback={null}>
            <AddPenyaForm onClose={() => setForm(false)} onSaved={() => { setForm(false); cargar(); }} />
          </Suspense>
        </ClientOnly>
      )}
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
