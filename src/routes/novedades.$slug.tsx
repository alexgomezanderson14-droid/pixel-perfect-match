import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Newspaper, Trophy, Smartphone, Search, CalendarDays, Medal, Gauge, Images } from "lucide-react";
import CopyrightFooter from "@/components/CopyrightFooter";

export const Route = createFileRoute("/novedades/$slug")({
  head: ({ params }) => {
    const titles: Record<string,string> = { noticias: "Nueva sección de noticias", premios: "Premios y reconocimientos", "penyes-movil": "Peñas más ágiles en móvil" };
    return { meta: [{ title: (titles[params.slug] || "Novedades") + " | PENYERA" }, { name: "description", content: "Aprende a utilizar las últimas novedades de PENYERA." }] };
  },
  component: NovedadPage,
});

const content = {
  noticias: {
    eyebrow: "NUEVO · ACTUALIDAD FESTERA",
    title: "Descubre las nuevas noticias",
    intro: "Toda la actualidad de las peñas y de las fiestas de l’Alfàs del Pi, reunida para que no te pierdas nada.",
    what: ["La sección de Noticias reúne publicaciones oficiales, novedades de las peñas, anuncios y actualidad festera.", "Puedes consultar las publicaciones completas y acceder a sus fuentes cuando están disponibles."],
    steps: ["Entra en Noticias desde la navegación de la web.", "Explora las publicaciones y abre la que quieras leer.", "Utiliza el buscador para localizar noticias por palabras o temas."],
    link: "/noticias",
    cta: "Ir a Noticias",
    icon: Newspaper,
    visual: "news",
  },
  premios: {
    eyebrow: "NUEVO · PALMARÉS",
    title: "Los premios ya forman parte de la historia de cada peña",
    intro: "Los reconocimientos se muestran en las fichas de las peñas para que puedas consultar sus logros y trayectoria.",
    what: ["Entra en la ficha de una peña y consulta su apartado de Palmarés.", "Los premios de los concursos aparecen como reconocimientos destacados. Otras distinciones también se conservan en la vitrina completa.", "Cuando una peña todavía no tiene premios, su ficha muestra un espacio preparado para sus futuros reconocimientos."],
    steps: ["Abre la sección Peñas.", "Selecciona la peña que quieras conocer.", "Desplázate hasta Palmarés para ver sus premios y reconocimientos.", "Consulta la vitrina completa para descubrir otras distinciones."],
    link: "/penyes",
    cta: "Descubrir las peñas",
    icon: Trophy,
    visual: "awards",
  },
  "penyes-movil": {
    eyebrow: "MEJORA · EXPERIENCIA MÓVIL",
    title: "Descubrir las peñas ahora es más ligero",
    intro: "Hemos optimizado la navegación del carrusel de peñas para reducir el trabajo que realiza el móvil al mostrar las tarjetas.",
    what: ["El carrusel conserva su navegación continua y sus tarjetas visuales.", "Se ha reducido el número de copias que utiliza el desplazamiento infinito y se limita el renderizado de tarjetas que quedan fuera de pantalla.", "El objetivo es reducir el consumo de recursos sin eliminar diseños ni contenido."],
    steps: ["Entra en Peñas desde la navegación.", "Desliza horizontalmente para recorrer las tarjetas.", "Pulsa una tarjeta para abrir su ficha y vuelve al carrusel para continuar."],
    link: "/penyes",
    cta: "Explorar las peñas",
    icon: Smartphone,
    visual: "mobile",
  },
} as const;

function NovedadPage() {
  const { slug } = Route.useParams();
  const item = content[slug as keyof typeof content];
  if (!item) return <main className="mx-auto max-w-3xl px-5 py-20 text-center"><h1 className="text-3xl font-extrabold text-primary">Novedad no encontrada</h1><Link to="/" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground">Volver al inicio</Link></main>;
  const Icon = item.icon;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/75">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/" className="text-lg font-black tracking-tight text-primary">PENYERA</Link>
          <a href="/?novedades=1" className="inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowLeft size={16} /> Volver al aviso</a>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:pt-14">
        <nav className="mb-8 text-sm text-muted-foreground"><Link to="/" className="underline underline-offset-4">Inicio</Link><span className="px-2">/</span><span>Novedades</span></nav>
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#f3dce4] via-[#e8e6f4] to-[#d8edf0] p-6 text-[#173f52] shadow-sm sm:p-12">
          <span className="text-xs font-extrabold uppercase tracking-[.2em]">{item.eyebrow}</span>
          <div className="mt-5 grid gap-8 md:grid-cols-[1.1fr_.9fr] md:items-center">
            <div><h1 className="max-w-2xl text-4xl font-black leading-[1.04] tracking-tight sm:text-6xl">{item.title}</h1><p className="mt-5 max-w-xl text-base leading-relaxed text-[#40575e] sm:text-lg">{item.intro}</p><Link to={item.link} className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#173f52] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5">{item.cta}<ArrowRight size={16}/></Link></div>
            <div className={`novedad-visual novedad-visual-${item.visual}`} aria-hidden="true">
              {item.visual === "news" ? <><div className="novedad-visual-label">ACTUALIDAD FESTERA</div><div className="novedad-paper"><Newspaper size={34}/><strong>Noticias</strong><span>Peñas · Fiestas · Actualidad</span><div className="novedad-paper-lines"/></div><div className="novedad-float"><Images size={24}/><span>Publicaciones</span></div></> : item.visual === "awards" ? <><div className="novedad-award-orbit"><Medal size={48}/></div><div className="novedad-award-card"><img src="/premios-insignias.avif" alt="" /><strong>Palmarés</strong><span>Premios y reconocimientos</span></div><div className="novedad-award-small"><Trophy size={25}/></div></> : <><div className="novedad-phone"><div className="novedad-phone-top"/><div className="novedad-phone-card"><span>PEÑAS</span><strong>Desliza y descubre</strong><div className="novedad-paper-lines"/></div><div className="novedad-phone-card short"><span>FICHA DE PEÑA</span><strong>Fotos · Palmarés · Eventos</strong></div></div><div className="novedad-speed"><Gauge size={26}/><span>Más ligero</span></div></>}
            </div>
          </div>
        </section>
        <div className="mt-12 grid gap-10 md:grid-cols-2">
          <section><p className="text-xs font-extrabold uppercase tracking-[.18em] text-primary">01 · La novedad</p><h2 className="mt-2 text-2xl font-extrabold text-primary">¿Qué ha cambiado?</h2><div className="mt-5 space-y-4">{item.what.map((paragraph) => <p key={paragraph} className="leading-relaxed text-muted-foreground">{paragraph}</p>)}</div></section>
          <section><p className="text-xs font-extrabold uppercase tracking-[.18em] text-primary">02 · Paso a paso</p><h2 className="mt-2 text-2xl font-extrabold text-primary">Aprende a utilizarlo</h2><ol className="mt-5 space-y-4">{item.steps.map((step,index)=><li key={step} className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">{index+1}</span><p className="pt-1 leading-relaxed text-muted-foreground">{step}</p></li>)}</ol></section>
        </div>
        <section className="mt-12 rounded-3xl border border-border bg-card p-6 sm:p-8"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon size={24}/></span><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pruébalo ahora</p><h2 className="text-xl font-extrabold text-primary">Accede a esta función</h2></div></div><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Puedes entrar directamente en la sección y descubrirla mientras navegas por PENYERA.</p><Link to={item.link} className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-extrabold text-primary-foreground">{item.cta}<ArrowRight size={16}/></Link></section>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4"><Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowLeft size={16}/> Volver a PENYERA</Link><a href="/?novedades=1" className="text-sm font-bold text-primary underline underline-offset-4">Volver a las cuatro novedades</a></div>
      </main>
      <CopyrightFooter />
    </div>
  );
}
