import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, Newspaper, Trophy, Sparkles, CalendarDays, ArrowUpRight } from "lucide-react";

type Props = { userKey?: string | null };

const VERSION = "2026-11-v1";
const cards = [
  { slug: "noticias", number: "01", tag: "NUEVO", title: "Las noticias, más cerca", description: "Toda la actualidad festera reunida en un mismo lugar.", image: "/mayorales-2027.svg", imageAlt: "Emblema de Mayorales 2027", icon: Newspaper, className: "news" },
  { slug: "premios", number: "02", tag: "NUEVO", title: "Los premios ya se muestran", description: "Descubre los reconocimientos de cada peña y su historia.", image: "/premios-insignias.avif", imageAlt: "Insignias de premios y reconocimientos", icon: Trophy, className: "awards" },
  { slug: "penyes-movil", number: "03", tag: "MEJORA", title: "Peñas más ágiles en móvil", description: "Una navegación más ligera para descubrir todas las peñas.", image: "", imageAlt: "", icon: Sparkles, className: "mobile" },
];

function storageKey(userKey?: string | null) {
  const user = (userKey || "invitado").trim().toLowerCase();
  return `penyera-novedades-dismissed:${user}:${VERSION}`;
}

export default function WhatsNewAnnouncement({ userKey }: Props) {
  const [open, setOpen] = useState(false);

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
  }, [userKey]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, userKey]);

  function close() {
    try { window.localStorage.setItem(storageKey(userKey), "1"); } catch { /* El aviso sigue pudiendo cerrarse sin almacenamiento. */ }
    if (window.location.search.includes("novedades=1")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("novedades");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="whats-new-overlay" role="dialog" aria-modal="true" aria-labelledby="whats-new-title">
      <button type="button" className="whats-new-scrim" aria-label="Cerrar novedades" onClick={close} />
      <section className="whats-new-panel">
        <button type="button" onClick={close} className="whats-new-close" aria-label="Cerrar aviso de novedades"><X size={20} /></button>
        <div className="whats-new-heading">
          <span className="whats-new-eyebrow">PENYERA · ACTUALIZACIONES</span>
          <h2 id="whats-new-title">¡Mira todo<br className="sm:hidden" /> lo nuevo!</h2>
          <p>Descubre las últimas novedades y aprende a disfrutar de todas las posibilidades de nuestra web.</p>
        </div>
        <div className="whats-new-collage">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.slug} to="/novedades/$slug" params={{ slug: card.slug }} className={`whats-new-card whats-new-card-${card.className}`}>
                <div className="whats-new-card-top"><span>{card.tag}</span><span className="whats-new-number">{card.number}</span></div>
                <div className="whats-new-card-copy"><h3>{card.title}</h3><p>{card.description}</p></div>
                {card.image ? <div className="whats-new-card-image"><img src={card.image} alt={card.imageAlt} loading="lazy" /></div> : <div className="whats-new-mobile-art" aria-hidden="true"><div className="whats-new-mini-card"><span>PEÑAS</span><strong>Una experiencia más fluida</strong><div className="whats-new-mini-lines" /></div><div className="whats-new-mini-orbit"><Icon size={28} /></div></div>}
                <span className="whats-new-card-link">Descubrir <ArrowUpRight size={15} /></span>
              </Link>
            );
          })}
          <div className="whats-new-card whats-new-card-calendar" aria-label="Calendario festero, próximamente">
            <div className="whats-new-card-top"><span>PRÓXIMAMENTE</span><span className="whats-new-number">04</span></div>
            <div className="whats-new-calendar-art"><CalendarDays size={36} strokeWidth={1.5} /><span>2027</span></div>
            <div className="whats-new-card-copy"><h3>Calendario festero</h3><p>Fechas, actos y momentos importantes de nuestras fiestas.</p></div>
            <span className="whats-new-coming">Muy pronto</span>
          </div>
        </div>
        <p className="whats-new-footnote">Tres novedades para descubrir. Y esto solo acaba de empezar.</p>
      </section>
    </div>
  );
}
