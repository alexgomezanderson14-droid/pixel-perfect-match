import { createFileRoute } from "@tanstack/react-router";
import SeoLandingPage from "@/components/SeoLandingPage";

export const Route = createFileRoute("/noticias")({
  head: () => ({
    meta: [
      { title: "Noticias de las fiestas de l’Alfàs del Pi | festalfàs" },
      { name: "description", content: "Últimas noticias y actualidad de las fiestas de l’Alfàs del Pi: comunicados, novedades de las peñas, información municipal y publicaciones de otras fuentes." },
      { name: "keywords", content: "noticias Alfaz del Pi, actualidad fiestas l'Alfàs, noticias peñas Alfaz, festalfàs" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Noticias de las fiestas de l’Alfàs del Pi | festalfàs" },
      { property: "og:description", content: "Actualidad festera, comunicados y noticias de las peñas de l’Alfàs del Pi." },
      { property: "og:url", content: "https://festalfas.vercel.app/noticias" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://festalfas.vercel.app/noticias" }],
  }),
  component: NoticiasPage,
});

function NoticiasPage() {
  return <SeoLandingPage eyebrow="Actualidad festera" title="Noticias de las fiestas de l’Alfàs del Pi" description="Sigue la actualidad de las fiestas: novedades de las peñas, comunicados oficiales, información municipal y noticias publicadas por otros medios y fuentes." intro="La actualidad de las fiestas, reunida" sections={[
    { title: "Noticias de las peñas", text: "Conoce los anuncios, actividades y novedades que comparten las peñas participantes, incluida la información de la mayoralía." },
    { title: "Información oficial y municipal", text: "Consulta comunicados y avisos relevantes. Cuando una noticia proceda de otra entidad o medio, se identificará su fuente y se enlazará la publicación original." },
    { title: "CuBaTa · Mayorales 2027", text: "La Penya Cobre Bario Tántalo será la mayoralía de 2027. Su anuncio marca el inicio de los preparativos para las próximas fiestas." },
    { title: "Fotos y vídeos", text: "Las publicaciones podrán incluir galerías de fotografías y vídeos para compartir los momentos más destacados de las fiestas." },
  ]} links={[{label:"Peñas",to:"/penyes"},{label:"Programa de fiestas",to:"/programa-fiestas"},{label:"Eventos",to:"/eventos"}]} />;
}
