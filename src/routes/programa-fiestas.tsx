import { createFileRoute } from "@tanstack/react-router";
import SeoLandingPage from "@/components/SeoLandingPage";

export const Route = createFileRoute("/programa-fiestas")({
  head: () => ({
    meta: [
      { title: "Programa de fiestas de l’Alfàs del Pi 2027: actos y horarios | PENYERA" },
      { name: "description", content: "Consulta el programa de fiestas de l’Alfàs del Pi 2027: calendario de actos, horarios, actuaciones, actividades de las peñas y avisos. Publicaremos los datos cuando estén confirmados." },
      { name: "keywords", content: "programa fiestas Alfaz del Pi 2027, programa festes l'Alfàs, horarios fiestas Alfaz, actos fiestas Alfaz, PENYERA" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Programa de fiestas de l’Alfàs del Pi 2027" },
      { property: "og:description", content: "Actos, horarios, actuaciones y ubicaciones de las fiestas de l’Alfàs del Pi." },
      { property: "og:url", content: "https://pixel-perfect-match-ten-tau.vercel.app/programa-fiestas" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "PENYERA" },
      { property: "og:locale", content: "es_ES" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Programa de fiestas de Alfaz del Pi 2027 | PENYERA" },
      { name: "twitter:description", content: "Consulta el programa de fiestas de l’Alfàs del Pi (Alfaz del Pi) 2027: actos, horarios, actuaciones, actividades de peñas y ubicaciones cuando se confirmen." },
    ],
    links: [{ rel: "canonical", href: "https://pixel-perfect-match-ten-tau.vercel.app/programa-fiestas" }],
  }),
  component: ProgramaPage,
});

function ProgramaPage() {
  return <SeoLandingPage path="/programa-fiestas"
    eyebrow="Fiestas 2027 · l’Alfàs del Pi"
    title="Programa de fiestas de l’Alfàs del Pi"
    description="Esta página reunirá la programación de las próximas fiestas de l’Alfàs del Pi: actos, horarios, actuaciones, actividades de las peñas y lugares de celebración, con la información organizada para consultarla fácilmente desde el móvil."
    intro="Toda la programación festiva en un mismo sitio"
    sections={[
      { title: "Fechas y edición 2027", text: "PENYERA prepara este espacio para la edición de 2027. Las fechas concretas y el calendario de actos se incorporarán cuando estén confirmados por las fuentes oficiales; no publicamos horarios provisionales como si fueran definitivos." },
      { title: "Actos, horarios y ubicaciones", text: "Cuando se publique el programa, cada actividad podrá consultarse con su día, hora, descripción y lugar de celebración. Así será más sencillo localizar los actos y organizar cada jornada." },
      { title: "Actuaciones y actividades de las peñas", text: "La programación también dará visibilidad a las actuaciones musicales y a las actividades organizadas por las peñas, diferenciando la información confirmada de los anuncios pendientes." },
      { title: "Avisos y cambios", text: "Si se producen cambios de horario, ubicación o celebración, esta sección servirá para consultar la información actualizada. Antes de acudir a un acto, revisa siempre el aviso más reciente." },
    ]}
    links={[{label:"Peñas de l’Alfàs",to:"/penyes"},{label:"Agenda de eventos",to:"/eventos"},{label:"Noticias",to:"/noticias"}]}
  />;
}
