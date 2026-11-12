// Contenido de la web. El programa oficial se añadirá desde el PDF oficial.
// Las peñas se cargan desde la base de datos (formulario "Añadir peña").

export type Categoria = "penya" | "actuacion" | "evento" | "recinto" | "servicio";

export type Lugar = {
  id: string;
  categoria: Categoria;
  nombre: string;
  descripcion: string;
  lat: number;
  lng: number;
  foto?: string;
  dia?: string;
  hora?: string;
  detalleId?: string;
};

export type Acto = {
  id: string;
  dia: string; // YYYY-MM-DD
  hora: string;
  titulo: string;
  descripcion: string;
  tipo: "evento" | "actuacion";
  lugarId?: string;
};

export const edicion = {
  anyo: 2027,
  titulo: "Fiestas de l'Alfàs del Pi",
  subtitulo: "PEÑAS · TRADICIÓN · CULTURA · CONVIVENCIA",
  fechas: "Próximas fiestas · Fechas por confirmar",
};

// Lugares fijos citados en el programa oficial (pendiente del PDF).
export const lugares: Lugar[] = [];

// Programa oficial 2026 (pendiente de incorporar desde el PDF oficial).
export const actos: Acto[] = [];

export const ui = {
  nav: { mapa: "Mapa", programa: "Programa", eventos: "Eventos", penyes: "Peñas", info: "Información" },
  verMapa: "Ver en el mapa",
  buscar: "Buscar lugar…",
  todos: "Todos",
  sinResultados: "Sin resultados",
  categorias: {
    penya: "Peñas",
    actuacion: "Actuaciones",
    evento: "Eventos",
    recinto: "Recintos",
    servicio: "Servicios",
  } as Record<Categoria, string>,
  emergencias: "Emergencias",
  programaPendiente: "El programa de las próximas fiestas se publicará aquí cuando esté confirmado. Mientras tanto, puedes consultar el archivo de 2026 en Información.",
  sinPenyes: "Aún no hay peñas. ¡Sé la primera en añadir la tuya!",
  addPenya: "Añadir peña",
};
