import { createFileRoute } from "@tanstack/react-router";
import SeoLandingPage from "@/components/SeoLandingPage";

export const Route = createFileRoute("/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos y actividades de las fiestas de l’Alfàs del Pi | PENYERA" },
      { name: "description", content: "Agenda de eventos y actividades de las fiestas de l’Alfàs del Pi: propuestas de las peñas, encuentros, actuaciones, fechas, horarios y ubicaciones." },
      { name: "keywords", content: "eventos Alfaz del Pi, actividades fiestas Alfàs, agenda festera l'Alfàs, eventos peñas Alfaz, PENYERA" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Eventos y actividades en l’Alfàs del Pi | PENYERA" },
      { property: "og:description", content: "Descubre la agenda festera, las actividades de las peñas y los eventos de l’Alfàs del Pi." },
      { property: "og:url", content: "https://festalfas.vercel.app/eventos" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://festalfas.vercel.app/eventos" }],
  }),
  component: EventosPage,
});

function EventosPage() {
  return <SeoLandingPage
    eyebrow="Agenda festera · l’Alfàs del Pi"
    title="Eventos y actividades de las fiestas"
    description="Consulta en PENYERA la agenda de actividades relacionadas con las fiestas de l’Alfàs del Pi. Este espacio está pensado para reunir propuestas de las peñas, encuentros, actuaciones y otros planes festivos."
    intro="Cómo consultar la agenda"
    sections={[
      { title: "Actividades de las peñas", text: "Las peñas pueden compartir encuentros, comidas, celebraciones y otras actividades para dar a conocer sus planes. Cada publicación debe incluir la información disponible para que el público pueda organizarse." },
      { title: "Fecha, hora y lugar", text: "Las fichas de eventos están pensadas para mostrar cuándo se celebra cada actividad, dónde tiene lugar y quién la organiza. Si algún dato todavía no está confirmado, debe consultarse la publicación original de la organización." },
      { title: "Actuaciones y actos festivos", text: "La agenda permite descubrir actuaciones y actividades vinculadas a las fiestas, además de consultar el programa general cuando esté disponible." },
      { title: "Mapa y avisos", text: "Cuando un evento tenga una ubicación asociada, el mapa ayuda a situar el lugar. Los cambios y cancelaciones se deben comprobar en la información más reciente publicada por la organización." },
    ]}
    links={[{label:"Programa de fiestas",to:"/programa-fiestas"},{label:"Peñas",to:"/penyes"},{label:"Noticias",to:"/noticias"}]}
  />;
}
