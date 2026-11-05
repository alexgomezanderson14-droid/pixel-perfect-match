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
  anyo: 2026,
  titulo: "Fiestas del Jubileo y del Santísimo Cristo del Buen Acierto",
  subtitulo: "L' ALFÀS DEL PI",
  fechas: "Del 07 al 10 de Noviembre de 2026",
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
  programaPendiente: "El programa oficial se publicará aquí en breve.",
  sinPenyes: "Aún no hay peñas. ¡Sé la primera en añadir la tuya!",
  addPenya: "Añadir peña",
};
