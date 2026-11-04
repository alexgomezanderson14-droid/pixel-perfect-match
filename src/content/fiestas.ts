// Contenido de la web. TODO lo marcado como `ejemplo: true` es contenido de
// muestra (no oficial). En la siguiente fase este contenido vendrá del panel
// de administración y la base de datos.

export type Lang = "es" | "va";
export type T = { es: string; va: string };
export type Categoria = "penya" | "actuacion" | "evento" | "recinto" | "servicio";

export type Lugar = {
  id: string;
  categoria: Categoria;
  nombre: T;
  descripcion: T;
  lat: number;
  lng: number;
};

export type Acto = {
  id: string;
  dia: string; // YYYY-MM-DD
  hora: string;
  titulo: T;
  descripcion: T;
  tipo: "evento" | "actuacion";
  lugarId?: string;
};

export type Penya = {
  id: string;
  nombre: string;
  fundada?: string;
  descripcion: T;
  lugarId?: string;
};

export const edicion = {
  anyo: 2026,
  titulo: { es: "Fiestas de l'Alfàs del Pi", va: "Festes de l'Alfàs del Pi" },
  subtitulo: {
    es: "Contenido de ejemplo · fechas pendientes de confirmar",
    va: "Contingut d'exemple · dates pendents de confirmar",
  },
  fechaInicio: "2026-11-05",
  fechaFin: "2026-11-08",
  ejemplo: true,
};

export const lugares: Lugar[] = [
  { id: "plaza", categoria: "recinto", nombre: { es: "Plaza Mayor (ejemplo)", va: "Plaça Major (exemple)" }, descripcion: { es: "Recinto oficial de ejemplo.", va: "Recinte oficial d'exemple." }, lat: 38.5808, lng: -0.1036 },
  { id: "escenario", categoria: "actuacion", nombre: { es: "Escenario principal (ejemplo)", va: "Escenari principal (exemple)" }, descripcion: { es: "Conciertos y actuaciones nocturnas.", va: "Concerts i actuacions nocturnes." }, lat: 38.5822, lng: -0.1012 },
  { id: "iglesia", categoria: "evento", nombre: { es: "Iglesia (ejemplo)", va: "Església (exemple)" }, descripcion: { es: "Punto de salida de actos tradicionales.", va: "Punt d'eixida d'actes tradicionals." }, lat: 38.5799, lng: -0.1046 },
  { id: "penya-1", categoria: "penya", nombre: { es: "Peña Ejemplo Uno", va: "Penya Exemple U" }, descripcion: { es: "Sede de ejemplo.", va: "Seu d'exemple." }, lat: 38.5815, lng: -0.1058 },
  { id: "penya-2", categoria: "penya", nombre: { es: "Peña Ejemplo Dos", va: "Penya Exemple Dos" }, descripcion: { es: "Sede de ejemplo.", va: "Seu d'exemple." }, lat: 38.5791, lng: -0.1020 },
  { id: "penya-3", categoria: "penya", nombre: { es: "Peña Ejemplo Tres", va: "Penya Exemple Tres" }, descripcion: { es: "Sede de ejemplo.", va: "Seu d'exemple." }, lat: 38.5830, lng: -0.1040 },
  { id: "aseos", categoria: "servicio", nombre: { es: "Aseos públicos (ejemplo)", va: "Lavabos públics (exemple)" }, descripcion: { es: "Servicio de ejemplo.", va: "Servei d'exemple." }, lat: 38.5812, lng: -0.1024 },
  { id: "sanitario", categoria: "servicio", nombre: { es: "Punto sanitario (ejemplo)", va: "Punt sanitari (exemple)" }, descripcion: { es: "Servicio de ejemplo.", va: "Servei d'exemple." }, lat: 38.5802, lng: -0.1005 },
];

export const actos: Acto[] = [
  { id: "a1", dia: "2026-11-05", hora: "19:00", tipo: "evento", lugarId: "plaza", titulo: { es: "Pregón (ejemplo)", va: "Pregó (exemple)" }, descripcion: { es: "Acto inaugural de ejemplo.", va: "Acte inaugural d'exemple." } },
  { id: "a2", dia: "2026-11-05", hora: "23:30", tipo: "actuacion", lugarId: "escenario", titulo: { es: "Concierto de apertura (ejemplo)", va: "Concert d'obertura (exemple)" }, descripcion: { es: "Actuación de ejemplo.", va: "Actuació d'exemple." } },
  { id: "a3", dia: "2026-11-06", hora: "12:00", tipo: "evento", lugarId: "iglesia", titulo: { es: "Pasacalle (ejemplo)", va: "Cercavila (exemple)" }, descripcion: { es: "Recorrido por el centro.", va: "Recorregut pel centre." } },
  { id: "a4", dia: "2026-11-06", hora: "22:00", tipo: "actuacion", lugarId: "escenario", titulo: { es: "Orquesta (ejemplo)", va: "Orquestra (exemple)" }, descripcion: { es: "Actuación de ejemplo.", va: "Actuació d'exemple." } },
  { id: "a5", dia: "2026-11-07", hora: "18:00", tipo: "evento", lugarId: "plaza", titulo: { es: "Desfile de peñas (ejemplo)", va: "Desfilada de penyes (exemple)" }, descripcion: { es: "Desfile de ejemplo.", va: "Desfilada d'exemple." } },
  { id: "a6", dia: "2026-11-08", hora: "00:00", tipo: "evento", lugarId: "plaza", titulo: { es: "Castillo de fuegos (ejemplo)", va: "Castell de focs (exemple)" }, descripcion: { es: "Cierre de fiestas de ejemplo.", va: "Cloenda de festes d'exemple." } },
];

export const penyes: Penya[] = [
  { id: "p1", nombre: "Peña Ejemplo Uno", fundada: "—", lugarId: "penya-1", descripcion: { es: "Ficha de ejemplo. Cada peña podrá editar la suya.", va: "Fitxa d'exemple. Cada penya podrà editar la seua." } },
  { id: "p2", nombre: "Peña Ejemplo Dos", fundada: "—", lugarId: "penya-2", descripcion: { es: "Ficha de ejemplo.", va: "Fitxa d'exemple." } },
  { id: "p3", nombre: "Peña Ejemplo Tres", fundada: "—", lugarId: "penya-3", descripcion: { es: "Ficha de ejemplo.", va: "Fitxa d'exemple." } },
];

export const ui = {
  nav: { mapa: { es: "Mapa", va: "Mapa" }, programa: { es: "Programa", va: "Programa" }, agenda: { es: "Agenda", va: "Agenda" }, penyes: { es: "Peñas", va: "Penyes" }, info: { es: "Información", va: "Informació" } },
  verMapa: { es: "Ver en el mapa", va: "Veure al mapa" },
  buscar: { es: "Buscar lugar…", va: "Cercar lloc…" },
  todos: { es: "Todos", va: "Tots" },
  sinResultados: { es: "Sin resultados", va: "Sense resultats" },
  categorias: {
    penya: { es: "Peñas", va: "Penyes" },
    actuacion: { es: "Actuaciones", va: "Actuacions" },
    evento: { es: "Eventos", va: "Esdeveniments" },
    recinto: { es: "Recintos", va: "Recintes" },
    servicio: { es: "Servicios", va: "Serveis" },
  } as Record<Categoria, T>,
  infoTexto: {
    es: "Teléfonos de emergencia, transporte y contacto de la comisión se añadirán desde el panel de administración.",
    va: "Telèfons d'emergència, transport i contacte de la comissió s'afegiran des del panell d'administració.",
  },
  emergencias: { es: "Emergencias", va: "Emergències" },
  contacto: { es: "Contacto de la organización", va: "Contacte de l'organització" },
  pendiente: { es: "Pendiente de añadir", va: "Pendent d'afegir" },
  ejemplo: { es: "Contenido de ejemplo", va: "Contingut d'exemple" },
};
