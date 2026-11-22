import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";

type Props = { userKey?: string | null; config?: Record<string, string> };
type Card = { slug: string; tag: string; title: string; description: string; image: string; size: "small" | "medium" | "large"; position: string };

const defaults: Card[] = [
  { slug: "noticias", tag: "NUEVO", title: "Las noticias, más cerca", description: "Toda la actualidad festera reunida en un mismo lugar.", image: "/mayorales-2027.svg", size: "medium", position: "left-top" },
  { slug: "premios", tag: "NUEVO", title: "Los premios ya se muestran", description: "Descubre los reconocimientos de cada peña y su historia.", image: "/premios-insignias.avif", size: "large", position: "right-middle" },
  { slug: "penyes-movil", tag: "MEJORA", title: "Peñas más ágiles en móvil", description: "Una navegación más ligera para descubrir todas las peñas.", image: "", size: "medium", position: "lower-left" },
];
const VERSION = "2026-11-v2";
function storageKey(userKey?: string | null) {
  return `penyera-novedades-dismissed:${(userKey || "invitado").trim().toLowerCase()}:${VERSION}`;
}
function readConfig(config: Record<string, string> = {}) {
  return {
    title: config["novedades_titulo"] || "¡Mira todo lo nuevo!",
    subtitle: config["novedades_subtitulo"] || "Descubre las últimas novedades y aprende a disfrutar de todas las posibilidades de nuestra web.",
    background: [config["novedades_fondo_1"] || "#f5dfe7", config["novedades_fondo_2"] || "#e9dff0", config["novedades_fondo_3"] || "#d9e9ed"],
    cards: defaults.map((card, index) => ({
      ...card,
      tag: config[`novedades_tarjeta_${index + 1}_etiqueta`] || card.tag,
      title: config[`novedades_tarjeta_${index + 1}_titulo`] || card.title,
      description: config[`novedades_tarjeta_${index + 1}_texto`] || card.description,
      image: config[`novedades_tarjeta_${index + 1}_imagen`] || card.image,
      size: (config[`novedades_tarjeta_${index + 1}_tamano`] as Card["size"]) || card.size,
      position: config[`novedades_tarjeta_${index + 1}_posicion`] || card.position,
    })),
  };
}
export default function WhatsNewAnnouncement({ userKey, config = {} }: Props) {
  const [open, setOpen] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const settings = useMemo(() => readConfig(config), [config]);
  useEffect(() => {
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
  }, [userKey]);
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
    if (start !== null && end !== undefined && start - end > 85) {
      event.preventDefault();
      close();
    }
  }, [close]);
  const close = useCallback(() => {
    try { window.localStorage.setItem(storageKey(userKey), "1"); } catch { /* Cierre disponible sin almacenamiento. */ }
    if (window.location.search.includes("novedades=1")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("novedades");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
    setOpen(false);
  }, [userKey]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKeyDown); };
  }, [open, close]);
  if (!open) return null;
  return (
    <div className="whats-new-overlay" role="dialog" aria-modal="true" aria-labelledby="whats-new-title" style={{ background: `linear-gradient(135deg,${settings.background[0]},${settings.background[1]} 52%,${settings.background[2]})` }}>
      <button type="button" className="whats-new-close" onClick={close} aria-label="Cerrar aviso de novedades"><X size={20} /></button>
      <div className="whats-new-scene">
        <header className="whats-new-heading">
          <span className="whats-new-eyebrow">PENYERA · ACTUALIZACIONES</span>
          <h2 id="whats-new-title">{settings.title}</h2>
          <p>{settings.subtitle}</p>
        </header>
        <div className="whats-new-floating-cards">
          {settings.cards.map((card) => (
            <Link key={card.slug} to="/novedades/$slug" params={{ slug: card.slug }} className={`whats-new-float-card whats-new-pos-${card.position} whats-new-size-${card.size}`}>
              <span className="whats-new-float-tag">{card.tag}</span>
              {card.image && <img src={card.image} alt="" loading="lazy" />}
              <div className="whats-new-float-copy"><h3>{card.title}</h3><p>{card.description}</p></div>
              <span className="whats-new-float-open">Descubrir ↗</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
