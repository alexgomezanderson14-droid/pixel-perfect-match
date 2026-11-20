// Catálogo histórico inicial basado en el apartado «Penyes de l'Alfàs»
// del Libro de Fiestas 2024 (págs. impresas 119–143), y referencias públicas
// posteriores para CuBaTa. Las fichas que ya existen en la base de datos
// prevalecen siempre sobre estas entradas complementarias.
export type PenyaCatalogEntry = {
  id: string;
  nombre: string;
  color: string;
  asociada: boolean;
  informacion: string;
};

export const catalogoPenyesHistorico: PenyaCatalogEntry[] = [
  { id: "catalogo-2024-guirigall", nombre: "Guirigall", color: "#C66AA6", asociada: true, informacion: "" },
  { id: "catalogo-2024-la-clau", nombre: "La Clau", color: "#83C8E3", asociada: true, informacion: "" },
  { id: "catalogo-2024-anxova", nombre: "L’Anxova", color: "#26343A", asociada: true, informacion: "" },
  { id: "catalogo-2024-llonganissa", nombre: "La Llonganissa", color: "#E78FB5", asociada: true, informacion: "" },
  { id: "catalogo-2024-barraka-foska", nombre: "Barraka Foska", color: "#3D985C", asociada: true, informacion: "" },
  { id: "catalogo-2024-induccio", nombre: "Inducció", color: "#D6B52E", asociada: true, informacion: "" },
  { id: "catalogo-2024-os", nombre: "L’Os", color: "#B7865C", asociada: true, informacion: "" },
  { id: "catalogo-2024-impacte", nombre: "L’Impacte", color: "#D987B6", asociada: true, informacion: "" },
  { id: "catalogo-2024-enredats", nombre: "Enredats", color: "#628B68", asociada: true, informacion: "" },
  { id: "catalogo-2024-valquirias", nombre: "Las Valquirias", color: "#716B8D", asociada: true, informacion: "" },
  { id: "catalogo-2024-sotrak", nombre: "Sotrak", color: "#C95E91", asociada: true, informacion: "" },
  { id: "catalogo-2024-mussol-matiner", nombre: "El Mussol Matiner", color: "#D88B32", asociada: true, informacion: "" },
  { id: "catalogo-2024-aixo-ho-pague-jo", nombre: "Això ho pague Jo", color: "#3F8EC0", asociada: true, informacion: "" },
  { id: "catalogo-2024-destronats", nombre: "Els Destronats", color: "#D78DB4", asociada: true, informacion: "" },
  { id: "catalogo-2024-anvisc", nombre: "L’Anvisc", color: "#8A648E", asociada: true, informacion: "" },
  { id: "catalogo-2024-la-fusio", nombre: "La Fusió", color: "#6E4E67", asociada: true, informacion: "" },
  { id: "catalogo-2024-empelt", nombre: "L’Empelt", color: "#8D8064", asociada: true, informacion: "" },
  { id: "catalogo-2024-sense-limits", nombre: "Sense Limits", color: "#30343C", asociada: true, informacion: "" },
  { id: "catalogo-2024-supressio", nombre: "Supressió", color: "#4D8A70", asociada: true, informacion: "" },
  { id: "catalogo-2024-amnesia", nombre: "Amnesia", color: "#69B7D4", asociada: true, informacion: "" },
  { id: "catalogo-2024-fins-al-mati", nombre: "Fins al Matí", color: "#D96FA0", asociada: true, informacion: "" },
  { id: "catalogo-2024-la-traka", nombre: "La Traka", color: "#D44D6C", asociada: true, informacion: "" },
  { id: "catalogo-2024-sombrero", nombre: "El Sombrero", color: "#D9AC52", asociada: true, informacion: "" },
  { id: "catalogo-2024-despenyats", nombre: "Els Despenyats", color: "#8B786A", asociada: true, informacion: "" },
  { id: "catalogo-2024-88-valles", nombre: "88 Vallès", color: "#B95F91", asociada: false, informacion: "" },
  { id: "catalogo-2024-la-tisca", nombre: "La Tisca", color: "#D77EA3", asociada: false, informacion: "" },
];
