import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import CopyrightFooter from "@/components/CopyrightFooter";
import { supabase } from "@/integrations/supabase/client";
import { noticiaCuBaTa2027 } from "@/content/noticia-cubata-2027";
import { noticiaCestaNavidad2027 } from "@/content/noticia-cesta-navidad-2027";
import { noticiaDamasCuBaTa2027 } from "@/content/noticia-damas-cubata-2027";
import { noticiaDesfileHumor2026 } from "@/content/noticia-desfile-humor-2026";

type Noticia = {
  id: string;
  titulo: string;
  resumen?: string;
  contenido?: string;
  fecha?: string;
  autor?: string;
  publicado?: boolean;
  imagen_url?: string;
  galeria?: Array<string | { url?: string; imagen_url?: string; src?: string; alt?: string }>;
  imagenes_url?: string[];
  fuente?: string;
  fuente_url?: string;
};

const noticiasRespaldo: Noticia[] = [
  noticiaDamasCuBaTa2027,
  noticiaCestaNavidad2027,
  noticiaCuBaTa2027,
  noticiaDesfileHumor2026,
] as Noticia[];

function obtenerImagenes(noticia: Noticia): string[] {
  const galeria = Array.isArray(noticia.galeria)
    ? noticia.galeria.map((item) => typeof item === "string" ? item : item?.url || item?.imagen_url || item?.src || "").filter(Boolean)
    : [];
  const adicionales = Array.isArray(noticia.imagenes_url) ? noticia.imagenes_url : [];
  return [...new Set([...galeria, ...adicionales].filter((url): url is string => typeof url === "string" && url.trim().length > 0))];
}

export const Route = createFileRoute("/noticias")({
  head: () => ({
    meta: [
      { title: "Noticias de las peñas y fiestas de l’Alfàs del Pi | PENYERA" },
      { name: "description", content: "Lee noticias de las peñas de l’Alfàs del Pi, Mayorales, fiestas, actividades, anuncios y actualidad festera de Alfaz del Pi, Alicante." },
      { name: "keywords", content: "noticias Alfaz del Pi, actualidad fiestas l'Alfàs, noticias peñas Alfaz, CuBaTa Mayorales 2027, PENYERA" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Noticias de peñas y fiestas de l’Alfàs del Pi" },
      { property: "og:description", content: "Actualidad festera, noticias de las peñas y novedades de Mayorales 2027." },
      { property: "og:url", content: "https://penyera.lovable.app/noticias" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "PENYERA" },
      { property: "og:locale", content: "es_ES" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Noticias de las peñas y fiestas de l’Alfàs del Pi | PENYERA" },
      { name: "twitter:description", content: "Últimas noticias de las peñas y las fiestas de l’Alfàs del Pi: Mayorales, actos, actividades, anuncios y actualidad festera." },
    ],
    links: [{ rel: "canonical", href: "https://penyera.lovable.app/noticias" }],
  }),
  component: NoticiasPage,
});

function NoticiasPage() {
  const [noticias, setNoticias] = useState<Noticia[]>(noticiasRespaldo);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activa = true;
    const cargarNoticias = async () => {
      try {
        const { data, error } = await supabase
          .from("site_content")
          .select("valor")
          .eq("clave", "noticias_json")
          .maybeSingle();
        if (error) throw error;
        if (!activa) return;
        let guardadas: Noticia[] = [];
        if (data?.valor) {
          const parsed = typeof data.valor === "string" ? JSON.parse(data.valor) : data.valor;
          if (Array.isArray(parsed)) guardadas = parsed;
        }
        // La versión guardada en administración tiene prioridad sobre el respaldo local.
        const combinadas = [...guardadas, ...noticiasRespaldo];
        const unicas = combinadas.filter((noticia, index, todas) =>
          noticia?.id && noticia.publicado !== false &&
          todas.findIndex((otra) => String(otra?.id) === String(noticia.id)) === index
        );
        setNoticias(unicas);
      } catch (error) {
        console.error("No se pudieron cargar las noticias administradas; se muestra el contenido de respaldo.", error);
      } finally {
        if (activa) setCargando(false);
      }
    };
    void cargarNoticias();
    return () => { activa = false; };
  }, []);

  const newsStructuredData = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Noticias de las peñas y fiestas de l’Alfàs del Pi",
    url: "https://penyera.lovable.app/noticias",
    inLanguage: "es-ES",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: noticias.map((noticia, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "NewsArticle",
          headline: noticia.titulo,
          description: noticia.resumen,
          datePublished: noticia.fecha,
          author: { "@type": "Organization", name: noticia.autor || "PENYERA" },
          publisher: { "@type": "Organization", name: "PENYERA", url: "https://penyera.lovable.app/" },
          ...(noticia.imagen_url ? { image: noticia.imagen_url } : {}),
        },
      })),
    },
  }), [noticias]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsStructuredData) }} />
      <header className="border-b border-border/70 bg-card/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="text-lg font-extrabold tracking-tight text-primary">PENYERA</Link>
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
            const paragraphs = String(noticia.contenido || "").split("\n\n").filter(Boolean);
            const imagenes = obtenerImagenes(noticia);
            return (
              <article key={noticia.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                {noticia.imagen_url && <img src={noticia.imagen_url} alt={noticia.titulo} className="max-h-[480px] w-full object-cover" loading="lazy" decoding="async" />}
                <div className="p-5 sm:p-8">
                  <p className="text-sm font-semibold text-muted-foreground">{noticia.fecha ? new Date(noticia.fecha + "T12:00:00").toLocaleDateString("es-ES", {day:"numeric",month:"long",year:"numeric"}) : ""}{noticia.autor ? " · " + noticia.autor : ""}</p>
                  <h2 className="mt-3 text-2xl font-extrabold leading-tight text-primary sm:text-3xl">{noticia.titulo}</h2>
                  {noticia.resumen && <p className="mt-4 text-lg leading-relaxed">{noticia.resumen}</p>}
                  <div className="mt-6 space-y-4 text-base leading-relaxed">
                    {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                  </div>
                  {imagenes.length > 0 && <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">{imagenes.map((url, index) => <img key={url + index} src={url} alt={noticia.titulo + " · imagen " + (index + 1)} loading="lazy" decoding="async" className="aspect-[4/5] w-full rounded-2xl object-cover" />)}</div>}
                  {noticia.fuente_url && <a href={noticia.fuente_url} target="_blank" rel="noreferrer" className="mt-7 inline-flex rounded-full border border-primary/20 px-5 py-3 text-sm font-bold text-primary">Ver fuente original ↗</a>}
                </div>
              </article>
            );
          })}
          {!cargando && noticias.length === 0 && <p className="rounded-2xl border border-border p-6 text-center text-muted-foreground">Todavía no hay noticias publicadas.</p>}
        </div>
        <nav aria-label="Otras secciones" className="mt-9 flex flex-wrap gap-3">
          <Link to="/penyes" className="rounded-full border border-primary/20 px-4 py-2 text-sm font-bold text-primary">Peñas</Link>
          <Link to="/programa-fiestas" className="rounded-full border border-primary/20 px-4 py-2 text-sm font-bold text-primary">Programa de fiestas</Link>
          <Link to="/eventos" className="rounded-full border border-primary/20 px-4 py-2 text-sm font-bold text-primary">Eventos</Link>
        </nav>
      </main>
      <div className="border-t border-border/70 bg-card px-4 py-8 text-center">
        <p className="mb-4 text-sm font-semibold text-muted-foreground">PENYERA · {new Date().getFullYear()}</p>
        <Link to="/" className="text-sm font-bold text-primary underline underline-offset-4">Volver a la portada</Link>
      </div>
      <CopyrightFooter />
    </div>
  );
}
