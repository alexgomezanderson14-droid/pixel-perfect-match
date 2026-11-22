import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Newspaper, X } from "lucide-react";

type PenyaPreview = { id: string; nombre: string; foto?: string; color?: string; title?: string };
type Props = { userKey?: string | null; config?: Record<string, string>; penyes?: PenyaPreview[]; preview?: boolean };
type Card = { slug: string; tag: string; title: string; description: string; image: string; size: "small" | "medium" | "large"; position: string };
const defaults: Card[] = [
  { slug: "penyes", tag: "NUEVO", title: "SECCIÓN PEÑAS RENOVADA", description: "Descubre todas las peñas y sus fichas.", image: "", size: "large", position: "left-top" },
  { slug: "premios", tag: "NUEVO", title: "¡PREMIOS!", description: "Los reconocimientos de cada peña.", image: "/premios-insignias.avif", size: "large", position: "right-middle" },
  { slug: "noticias", tag: "MEJORA", title: "NUEVA SECCIÓN Noticias", description: "Toda la actualidad festera en un solo lugar.", image: "", size: "medium", position: "lower-left" },
];
const VERSION = "2026-11-v3";
function storageKey(userKey?: string | null) {
  return `penyera-novedades-dismissed:${(userKey || "invitado").trim().toLowerCase()}:${VERSION}`;
}
function readConfig(config: Record<string, string> = {}) {
  return {
    title: config["novedades_titulo"] || "¡Mira todo lo nuevo!",
    background: [config["novedades_fondo_1"] && config["novedades_fondo_1"] !== "#e8f1f4" ? config["novedades_fondo_1"] : "#c8dfe7", config["novedades_fondo_2"] && config["novedades_fondo_2"] !== "#dcebf0" ? config["novedades_fondo_2"] : "#91b8c7", config["novedades_fondo_3"] && config["novedades_fondo_3"] !== "#eef3f2" ? config["novedades_fondo_3"] : "#d9d0df"],
    cards: defaults.map((card, index) => ({
      ...card,
      tag: config[`novedades_tarjeta_${index + 1}_etiqueta`] || card.tag,
      title: config[`novedades_tarjeta_${index + 1}_titulo`] || card.title,
      description: config[`novedades_tarjeta_${index + 1}_texto`] || card.description,
      image: Object.prototype.hasOwnProperty.call(config, `novedades_tarjeta_${index + 1}_imagen`) ? config[`novedades_tarjeta_${index + 1}_imagen`] : card.image,
      size: (config[`novedades_tarjeta_${index + 1}_tamano`] as Card["size"]) || card.size,
      position: config[`novedades_tarjeta_${index + 1}_posicion`] || card.position,
    })),
  };
}
function PenyaCollage({ penyes }: { penyes: PenyaPreview[] }) {
  const selected = useMemo(() => {
    if (!penyes.length) return [];
    const center = penyes.find((penya) => /enredats/i.test(penya.nombre)) || penyes[0]!;
    const others = penyes.filter((penya) => penya.id !== center.id);
    const seed = (center.nombre + new Date().getFullYear()).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const shuffled = [...others].sort((a, b) => {
      const hash = (value: string) => value.split("").reduce((sum, char) => (sum * 31 + char.charCodeAt(0) + seed) >>> 0, 7);
      return hash(a.id) - hash(b.id);
    });
    return [shuffled[0], center, shuffled[1]].filter(Boolean) as PenyaPreview[];
  }, [penyes]);
  return <div className="whats-new-penya-collage" aria-label="Carrusel de peñas con Enredats en el centro">
    {selected.map((penya, index) => <div key={penya.id} className={`whats-new-penya-logo whats-new-penya-logo-${index}`} style={{ backgroundColor: penya.color || ["#5968D8", "#2587a8", "#19a887"][index] }}>\n      <small>{penya.title || penya.nombre}</small>\n      {penya.foto ? <img src={penya.foto} alt={penya.nombre} loading="lazy" decoding="async"/> : <span>{penya.nombre.slice(0,1).toLocaleUpperCase("es")}</span>}\n    </div>)}
  </div>;
}
export default function WhatsNewAnnouncement({ userKey, config = {}, penyes = [], preview = false }: Props) {
  const [open, setOpen] = useState(preview);
  const touchStartY = useRef<number | null>(null);
  const settings = useMemo(() => readConfig(config), [config]);
  useEffect(() => {
    if (preview) return;
    let forced = false;
    try {
      forced = new URLSearchParams(window.location.search).get("novedades") === "1";
      if (forced || window.localStorage.getItem(storageKey(userKey)) !== "1") {
        const timer = window.setTimeout(() => setOpen(true), forced ? 120 : 650);
        return () => window.clearTimeout(timer);
      }
    } catch {
      const timer = window.setTimeout(() => setOpen(true), 650);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [userKey, preview]);
  const close = useCallback(() => {
    if (preview) return;
    try { window.localStorage.setItem(storageKey(userKey), "1"); } catch { /* Cierre disponible sin almacenamiento. */ }
    if (window.location.search.includes("novedades=1")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("novedades");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
    setOpen(false);
  }, [userKey, preview]);
  const reopen = useCallback(() => {
    try { window.localStorage.removeItem(storageKey(userKey)); } catch { /* La reapertura funciona también sin almacenamiento. */ }
    setOpen(true);
  }, [userKey]);
  useEffect(() => {
    window.addEventListener("penyera:open-whats-new", reopen);
    return () => window.removeEventListener("penyera:open-whats-new", reopen);
  }, [reopen]);
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    touchStartY.current = event.touches[0]?.clientY ?? null;
  }, []);
  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartY.current;
    const end = event.changedTouches[0]?.clientY;
    touchStartY.current = null;
    if (!preview && start !== null && end !== undefined && start - end > 85) {
      event.preventDefault();
      window.dispatchEvent(new Event("penyera:go-home"));
      close();
    }
  }, [close]);
  useEffect(() => {
    if (!open || preview) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKeyDown); };
  }, [open, close, preview]);
  if (!open) return null;
  const presentation = (
    <div className={`whats-new-overlay${preview ? " is-preview" : ""}`} role="dialog" aria-modal="true" aria-labelledby="whats-new-title" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ background: `linear-gradient(135deg,${settings.background[0]},${settings.background[1]} 52%,${settings.background[2]})` }}>
      <button type="button" className="whats-new-close" onClick={close} aria-label="Cerrar aviso de novedades"><X size={20} /></button>
      <div className="whats-new-scene">
        <header className="whats-new-heading">
          <img className="whats-new-brand-mark" src="/penyera-isotipo.svg" alt="PENYERA" />
          <span className="whats-new-eyebrow">PENYERA · ACTUALIZACIONES</span>
          <h2 id="whats-new-title">{settings.title}</h2>
        </header>
        <div className="whats-new-floating-cards">
          {settings.cards.map((card) => (
            <Link key={card.slug} to="/novedades/$slug" params={{ slug: card.slug }} className={`whats-new-float-card whats-new-pos-${card.position} whats-new-size-${card.size} whats-new-card-${card.slug}`} onClick={(event) => { if (preview) event.preventDefault(); }}>
              <span className="whats-new-float-tag">{card.tag}</span>
              {card.slug === "noticias" ? <div className="whats-new-news-mark"><Newspaper aria-hidden="true"/><span>PEÑAS · FIESTAS · ACTUALIDAD</span></div> : <div className={`whats-new-card-media${card.slug === "penyes" ? " is-penyes" : " is-premios"}`}>{card.image ? <img className="whats-new-custom-image" src={card.image} alt="" loading="lazy" decoding="async"/> : card.slug === "penyes" ? <PenyaCollage penyes={penyes}/> : null}</div>}
              <div className="whats-new-float-copy"><h3>{card.title}</h3>{card.description && <p>{card.description}</p>}</div>
              <span className="whats-new-float-open">Descubrir <span aria-hidden="true"><ArrowUpRight size={15}/></span></span>
            </Link>
          ))}
        </div>
      </div>
      {!preview && <div className="whats-new-swipe-hint" aria-hidden="true"><span />Desliza hacia arriba para entrar</div>}
    </div>
  );
  return preview ? presentation : createPortal(presentation, document.body);
}
