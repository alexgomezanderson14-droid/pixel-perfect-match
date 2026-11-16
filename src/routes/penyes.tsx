import { createFileRoute } from "@tanstack/react-router";
import SeoLandingPage from "@/components/SeoLandingPage";

export const Route = createFileRoute("/penyes")({
  head: () => ({
    meta: [
      { title: "Peñas de l’Alfàs del Pi | festalfàs" },
      { name: "description", content: "Descubre las peñas de las fiestas de l’Alfàs del Pi: sus fichas, ambiente, fotografías, actividades y cómo encontrarlas en festalfàs." },
      { name: "keywords", content: "peñas Alfaz del Pi, peñas l'Alfàs del Pi, penyes Alfàs, fiestas Alfaz, festalfàs" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Peñas de l’Alfàs del Pi | festalfàs" },
      { property: "og:description", content: "Conoce las peñas, sus actividades y el ambiente de las fiestas de l’Alfàs del Pi." },
      { property: "og:url", content: "https://festalfas.vercel.app/penyes" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://festalfas.vercel.app/penyes" }],
  }),
  component: PenyesPage,
});

function PenyesPage() {
  return <SeoLandingPage eyebrow="Comunidad festera" title="Peñas de l’Alfàs del Pi" description="Las peñas son el corazón de las fiestas: grupos de amigos, convivencia, música, creatividad y muchas ganas de compartir cada celebración." intro="Encuentra y conoce las peñas participantes" sections={[
    { title: "Fichas de las peñas", text: "Consulta la información que cada peña comparte: presentación, fotografías, redes sociales, ubicación y próximos planes cuando estén publicados." },
    { title: "Mayorales 2027 · CuBaTa", text: "La Penya Cobre Bario Tántalo (CuBaTa) toma el relevo como Mayorales de 2027. Las novedades de la mayoralía se irán incorporando a la actualidad festera." },
    { title: "Ubicación y contacto", text: "La web reúne un mapa para localizar los espacios de las peñas y facilitar que vecinos y visitantes se acerquen a conocerlas." },
    { title: "Participa", text: "Cada peña puede compartir su identidad, sus actividades y sus noticias para que la comunidad festera esté al día." },
  ]} links={[{label:"Programa de fiestas",to:"/programa-fiestas"},{label:"Eventos",to:"/eventos"},{label:"Noticias",to:"/noticias"}]} />;
}
