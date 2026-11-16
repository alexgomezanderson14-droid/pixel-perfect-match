import { createFileRoute } from "@tanstack/react-router";
import SeoLandingPage from "@/components/SeoLandingPage";

export const Route = createFileRoute("/programa-fiestas")({
  head: () => ({
    meta: [
      { title: "Programa de fiestas de l’Alfàs del Pi 2027 | festalfàs" },
      { name: "description", content: "Consulta el programa de las fiestas de l’Alfàs del Pi: actos, horarios, actuaciones, ubicaciones y avisos. La edición 2027 se actualizará cuando se confirme." },
      { name: "keywords", content: "programa fiestas Alfaz del Pi 2027, programa festes l'Alfàs, horarios fiestas Alfaz, festalfàs" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Programa de fiestas de l’Alfàs del Pi 2027 | festalfàs" },
      { property: "og:description", content: "Actos, horarios y actuaciones de las fiestas de l’Alfàs del Pi." },
      { property: "og:url", content: "https://festalfas.vercel.app/programa-fiestas" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://festalfas.vercel.app/programa-fiestas" }],
  }),
  component: ProgramaPage,
});

function ProgramaPage() {
  return <SeoLandingPage eyebrow="Fiestas 2027 · l’Alfàs del Pi" title="Programa de fiestas de l’Alfàs del Pi" description="Aquí podrás consultar la programación festiva, con los actos, horarios, actuaciones y lugares de celebración organizados para las próximas fiestas." intro="Toda la programación en un mismo sitio" sections={[
    { title: "Actos y horarios", text: "La agenda recogerá cada actividad con su día, hora, descripción y lugar para que puedas organizarte y no perderte ningún acto." },
    { title: "Actuaciones y música", text: "Consulta las actuaciones y propuestas musicales en cuanto se publique y confirme la programación correspondiente." },
    { title: "Fechas de 2027", text: "Las próximas fiestas están previstas para noviembre de 2027. El calendario detallado y los horarios se publicarán cuando estén confirmados oficialmente." },
    { title: "Información actualizada", text: "Los cambios y avisos importantes se comunicarán en la web. Comprueba siempre la información más reciente antes de desplazarte." },
  ]} links={[{label:"Peñas",to:"/penyes"},{label:"Eventos",to:"/eventos"},{label:"Noticias",to:"/noticias"}]} />;
}
