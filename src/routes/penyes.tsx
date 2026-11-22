import { createFileRoute, Link } from "@tanstack/react-router";
import SeoLandingPage from "@/components/SeoLandingPage";

export const Route = createFileRoute("/penyes")({
  head: () => ({
    meta: [
      { title: "Peñas y penyes de l’Alfàs del Pi (Alfaz del Pi) | PENYERA" },
      { name: "description", content: "Conoce las peñas y penyes de l’Alfàs del Pi: Mayorales, perfiles, fotografías, actividades, historia, premios y noticias de la comunidad festera de Alicante." },
      { name: "keywords", content: "peñas Alfaz del Pi, peñas l'Alfàs del Pi, penyes Alfàs, mayorales 2027, CuBaTa, fiestas Alfaz, PENYERA" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Peñas de Alfaz del Pi y l’Alfàs del Pi" },
      { property: "og:description", content: "La comunidad festera de l’Alfàs del Pi: peñas, mayorales, actividades y actualidad." },
      { property: "og:url", content: "https://pixel-perfect-match-ten-tau.vercel.app/penyes" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "PENYERA" },
      { property: "og:locale", content: "es_ES" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Peñas de Alfaz del Pi y l’Alfàs del Pi | PENYERA" },
      { name: "twitter:description", content: "Descubre las peñas de Alfaz del Pi (l’Alfàs del Pi): perfiles, Mayorales, historia, fotos, actividades y noticias de la comunidad festera." },
    ],
    links: [{ rel: "canonical", href: "https://pixel-perfect-match-ten-tau.vercel.app/penyes" }],
  }),
  component: PenyesPage,
});

function PenyesPage() {
  return <SeoLandingPage path="/penyes"
    eyebrow="Comunidad festera · l’Alfàs del Pi"
    title="Peñas de l’Alfàs del Pi"
    description="Las peñas forman una parte esencial de las fiestas de l’Alfàs del Pi. Son grupos que mantienen vivo el ambiente festero durante todo el año y participan en la preparación y celebración de los actos."
    intro="Un espacio para descubrir a las peñas"
    sections={[
      { title: "Conoce cada peña", text: "Cada peña tiene su propio nombre, identidad, amistades, recuerdos y manera de vivir las fiestas. En PENYERA reunimos sus perfiles para que vecinos y visitantes puedan conocerlas y seguir sus novedades." },
      { title: "Mayorales 2027: CuBaTa", text: "La Penya Cobre Bario Tántalo, conocida como CuBaTa, toma el relevo como Mayorales de 2027. La peña ha presentado su mayoralía con humor bajo el nombre de «Mejoralía», prometiendo unas fiestas que darán que hablar." },
      { title: "Fotos, actividades y noticias", text: "Los perfiles de las peñas permiten reunir su presentación, fotografías, redes sociales, actividades y noticias. La información se irá ampliando conforme cada peña comparta y publique sus contenidos." },
      { title: "Ubicación en el mapa", text: "La web dispone de un mapa festero para consultar los puntos asociados a las peñas y otros lugares de interés. Comprueba los detalles de cada ficha antes de desplazarte." },
    ]}
    links={[{label:"Noticias de CuBaTa 2027",to:"/noticias"},{label:"Programa de fiestas",to:"/programa-fiestas"},{label:"Eventos",to:"/eventos"}]}
  />;
}
