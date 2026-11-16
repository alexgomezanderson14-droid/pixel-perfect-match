import { createFileRoute } from "@tanstack/react-router";
import SeoLandingPage from "@/components/SeoLandingPage";

export const Route = createFileRoute("/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos y actividades en l’Alfàs del Pi | festalfàs" },
      { name: "description", content: "Descubre eventos, actividades y planes de las peñas durante las fiestas de l’Alfàs del Pi. Consulta fechas, horarios y ubicaciones en festalfàs." },
      { name: "keywords", content: "eventos Alfaz del Pi, actividades fiestas Alfàs, planes peñas Alfaz, agenda festera l'Alfàs, festalfàs" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Eventos y actividades en l’Alfàs del Pi | festalfàs" },
      { property: "og:description", content: "Planes, actividades y eventos de las peñas en las fiestas de l’Alfàs del Pi." },
      { property: "og:url", content: "https://festalfas.vercel.app/eventos" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://festalfas.vercel.app/eventos" }],
  }),
  component: EventosPage,
});

function EventosPage() {
  return <SeoLandingPage eyebrow="Agenda festera" title="Eventos y actividades en l’Alfàs del Pi" description="Una agenda para descubrir qué ocurre durante las fiestas: actividades, encuentros, propuestas de las peñas y otros planes para vecinos y visitantes." intro="Organiza tus próximos planes" sections={[
    { title: "Agenda de eventos", text: "Consulta los eventos publicados con su fecha, hora, descripción y ubicación, y revisa los detalles antes de asistir." },
    { title: "Actividades de las peñas", text: "Las peñas pueden dar a conocer sus encuentros y actividades para compartir el ambiente festero con todo el municipio." },
    { title: "Mapa y ubicaciones", text: "Utiliza el mapa de festalfàs para situar los espacios y planificar cómo llegar a los puntos de celebración." },
    { title: "Cambios y avisos", text: "La agenda puede actualizarse. Los avisos relevantes se mostrarán junto a la información de cada actividad cuando estén disponibles." },
  ]} links={[{label:"Programa de fiestas",to:"/programa-fiestas"},{label:"Peñas",to:"/penyes"},{label:"Noticias",to:"/noticias"}]} />;
}
