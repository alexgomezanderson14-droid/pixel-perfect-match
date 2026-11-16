import { createFileRoute, Link } from "@tanstack/react-router";
import CopyrightFooter from "@/components/CopyrightFooter";
import { noticiaCuBaTa2027 } from "@/content/noticia-cubata-2027";
import { noticiaCestaNavidad2027 } from "@/content/noticia-cesta-navidad-2027";

export const Route = createFileRoute("/noticias")({
  head: () => ({
    meta: [
      { title: "Noticias de las fiestas de l’Alfàs del Pi | festalfàs" },
      { name: "description", content: "Noticias y actualidad festera de l’Alfàs del Pi. Novedades de las peñas, Mayorales 2027 y actividades del pueblo." },
      { name: "keywords", content: "noticias Alfaz del Pi, actualidad fiestas l'Alfàs, noticias peñas Alfaz, CuBaTa Mayorales 2027, festalfàs" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Noticias de las fiestas de l’Alfàs del Pi | festalfàs" },
      { property: "og:description", content: "Actualidad festera, noticias de las peñas y novedades de Mayorales 2027." },
      { property: "og:url", content: "https://festalfas.vercel.app/noticias" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://festalfas.vercel.app/noticias" }],
  }),
  component: NoticiasPage,
});

const noticias = [noticiaCestaNavidad2027, noticiaCuBaTa2027];

function NoticiasPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-card/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="text-lg font-extrabold tracking-tight text-primary">festalfàs</Link>
          <Link to="/" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Ir a la web</Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <nav aria-label="Migas de pan" className="mb-7 text-sm text-muted-foreground">
          <Link to="/" className="underline underline-offset-4">Inicio</Link><span aria-hidden="true"> / </span><span>Noticias</span>
        </nav>
        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-primary">Actualidad festera · Peñas</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-primary sm:text-5xl">Noticias de las fiestas de l’Alfàs del Pi</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">Novedades de las peñas, anuncios de la mayoralía e información relacionada con las fiestas de l’Alfàs del Pi.</p>
        <div className="mt-9 space-y-7">
          {noticias.map((noticia) => {
            const paragraphs = noticia.contenido.split("\n\n").filter(Boolean);
            return (
              <article key={noticia.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8">
                <img src={noticia.imagen_url} alt={noticia.id === noticiaCestaNavidad2027.id ? "CuBaTa, Mayorales 2027" : "Emblema de Mayorales 2027 de CuBaTa"} className="mb-6 max-h-64 w-full rounded-2xl object-contain" />
                <p className="text-sm font-semibold text-muted-foreground">{new Date(noticia.fecha + "T12:00:00").toLocaleDateString("es-ES", {day:"numeric",month:"long",year:"numeric"})} · {noticia.autor}</p>
                <h2 className="mt-3 text-2xl font-extrabold leading-tight text-primary sm:text-3xl">{noticia.titulo}</h2>
                <p className="mt-4 text-lg leading-relaxed">{noticia.resumen}</p>
                <div className="mt-6 space-y-4 text-base leading-relaxed">
                  {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                </div>
                {noticia.id === noticiaCestaNavidad2027.id ? (
                  <a href="mailto:cubatamajorals2027@gmail.com" className="mt-7 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Contactar con los Mayorales</a>
                ) : (
                  <a href="https://www.instagram.com/penyacobrebariotantalo/" target="_blank" rel="noreferrer" className="mt-7 inline-flex rounded-full border border-primary/20 px-5 py-3 text-sm font-bold text-primary">Instagram de CuBaTa ↗</a>
                )}
              </article>
            );
          })}
        </div>
        <nav aria-label="Otras secciones" className="mt-9 flex flex-wrap gap-3">
          <Link to="/penyes" className="rounded-full border border-primary/20 px-4 py-2 text-sm font-bold text-primary">Peñas</Link>
          <Link to="/programa-fiestas" className="rounded-full border border-primary/20 px-4 py-2 text-sm font-bold text-primary">Programa de fiestas</Link>
          <Link to="/eventos" className="rounded-full border border-primary/20 px-4 py-2 text-sm font-bold text-primary">Eventos</Link>
        </nav>
      </main>
      <footer className="border-t border-border/70 bg-card px-4 py-8 text-center"><p className="mb-4 text-sm font-semibold text-muted-foreground">Fiestas de l’Alfàs del Pi · festalfàs</p><Link to="/" className="text-sm font-bold text-primary underline underline-offset-4">Volver a la portada</Link><CopyrightFooter /></footer>
    </div>
  );
}
