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
  { id: "catalogo-2024-guirigall", nombre: "Guirigall", color: "#C66AA6", asociada: true, informacion: "Celebró en 2024 su décimo año formando parte de las fiestas. Se identifica con el humor, el ambiente desenfadado y su particular gallinero festero." },
  { id: "catalogo-2024-la-clau", nombre: "La Clau", color: "#83C8E3", asociada: true, informacion: "Destaca por su vínculo entre generaciones y por mantener presente a quienes no pueden acudir a las fiestas. En 2024 puso el acento en la amistad, el respeto y la convivencia." },
  { id: "catalogo-2024-anxova", nombre: "L’Anxova", color: "#26343A", asociada: true, informacion: "Comparte su felicitación festera con un marcado sentimiento de pertenencia a l’Alfàs y al Santíssim Crist del Bon Encert. Su emblema del pez identifica a la peña." },
  { id: "catalogo-2024-llonganissa", nombre: "La Llonganissa", color: "#E78FB5", asociada: true, informacion: "En su mensaje de 2024 felicitó a los Mayorales y reconoció el trabajo de la Associació de Penyes durante todo el año. Su imagen festiva gira en torno a su mascota, Lo Llonganisso." },
  { id: "catalogo-2024-barraka-foska", nombre: "Barraka Foska", color: "#3D985C", asociada: true, informacion: "Forma parte del ambiente festero con sus reuniones y celebraciones colectivas. En 2024 compartió fotografías de grupo y felicitó al pueblo con su propio emblema de colores." },
  { id: "catalogo-2024-induccio", nombre: "Inducció", color: "#D6B52E", asociada: true, informacion: "Vinculada a la Mayoralía de 2024, agradeció la participación de peñistas y vecinos y el apoyo recibido para sacar adelante las celebraciones." },
  { id: "catalogo-2024-os", nombre: "L’Os", color: "#B7865C", asociada: true, informacion: "Se define como una peña veterana y participante habitual en los actos organizados por Mayorales y Associació de Penyes. En 2024 también destacó la representación de sus integrantes en las Damas." },
  { id: "catalogo-2024-impacte", nombre: "L’Impacte", color: "#D987B6", asociada: true, informacion: "Invita a disfrutar de las fiestas patronales y a compartirlas en la calle. La peña asumió la Mayoralía del Jubileo en 2026." },
  { id: "catalogo-2024-enredats", nombre: "Enredats", color: "#628B68", asociada: true, informacion: "Su mensaje de 2024 fue una invitación directa a disfrutar al máximo de las fiestas patronales y a mantener vivo el ambiente festero de l’Alfàs." },
  { id: "catalogo-2024-valquirias", nombre: "Las Valquirias", color: "#716B8D", asociada: true, informacion: "Peña con trayectoria desde 1993. En el libro de 2024 agradeció poder participar un año más en las fiestas y felicitó al conjunto de peñistas." },
  { id: "catalogo-2024-sotrak", nombre: "Sotrak", color: "#C95E91", asociada: true, informacion: "Celebra las fiestas con brindis y buenos deseos para todos los penyistas. En 2024 dedicó su mensaje a felicitar a los Mayorales." },
  { id: "catalogo-2024-mussol-matiner", nombre: "El Mussol Matiner", color: "#D88B32", asociada: true, informacion: "Su emblema es un búho y su mensaje invita a celebrar las tradiciones con amigos, alegría y buen humor, sin que falten las risas ni los bailes." },
  { id: "catalogo-2024-aixo-ho-pague-jo", nombre: "Això ho pague Jo", color: "#3F8EC0", asociada: true, informacion: "Su mensaje en valenciano agradece el esfuerzo de la Associació de Penyes, la Mayoralía y la Concejalía, y anima a todas las peñas a encontrarse en la calle." },
  { id: "catalogo-2024-destronats", nombre: "Els Destronats", color: "#D78DB4", asociada: true, informacion: "Resalta las fiestas como días de alegría, germanor y emoción, y reconoce el esfuerzo de la comisión de Mayorales y de la Associació de Penyes." },
  { id: "catalogo-2024-anvisc", nombre: "L’Anvisc", color: "#8A648E", asociada: true, informacion: "Agradece a la Associació de Penyes y a los Mayorales el trabajo realizado durante el año y anima a los vecinos a participar en las celebraciones." },
  { id: "catalogo-2024-la-fusio", nombre: "La Fusió", color: "#6E4E67", asociada: true, informacion: "Comparte la ilusión por la semana grande de l’Alfàs y reconoce el esfuerzo de Mayorales, Associació y Concejalía para preparar las fiestas." },
  { id: "catalogo-2024-empelt", nombre: "L’Empelt", color: "#8D8064", asociada: true, informacion: "Envía sus buenos deseos al pueblo de l’Alfàs y a sus miembros, celebrando la llegada de las fiestas y los recuerdos compartidos." },
  { id: "catalogo-2024-sense-limits", nombre: "Sense Limits", color: "#30343C", asociada: true, informacion: "Comparte sus felicitaciones para las fiestas patronales y reivindica el ambiente de l’Alfàs y la celebración colectiva del Santíssim Crist." },
  { id: "catalogo-2024-supressio", nombre: "Supressió", color: "#4D8A70", asociada: true, informacion: "Reconoce el trabajo que hay detrás de cada fiesta, tanto de la Associació como de los Mayorales, y anima a seguir compartiendo celebraciones." },
  { id: "catalogo-2024-amnesia", nombre: "Amnesia", color: "#69B7D4", asociada: true, informacion: "Envía sus buenos deseos para las fiestas patronales y se suma al ambiente de música, encuentros y celebraciones de l’Alfàs." },
  { id: "catalogo-2024-fins-al-mati", nombre: "Fins al Matí", color: "#D96FA0", asociada: true, informacion: "En 2024 celebraba cinco años compartiendo las fiestas. Agradeció especialmente a la Associació de Penyes y a los Mayorales su dedicación." },
  { id: "catalogo-2024-la-traka", nombre: "La Traka", color: "#D44D6C", asociada: true, informacion: "Forma parte del conjunto de peñas que dan vida a las fiestas de l’Alfàs y aparece en el libro de 2024 con su propio emblema y fotografías de grupo." },
  { id: "catalogo-2024-sombrero", nombre: "El Sombrero", color: "#D9AC52", asociada: true, informacion: "Comparte sus felicitaciones para las fiestas patronales y aparece en el libro de 2024 junto a otras peñas participantes." },
  { id: "catalogo-2024-despenyats", nombre: "Els Despenyats", color: "#8B786A", asociada: true, informacion: "Envía un saludo festero al pueblo de l’Alfàs y desea unas felices fiestas, compartiendo también una imagen de sus integrantes." },
  { id: "catalogo-2024-88-valles", nombre: "88 Vallès", color: "#B95F91", asociada: false, informacion: "Figura expresamente en el apartado «Penyes no associades» del libro de fiestas de 2024. Su mensaje destaca la ilusión por la fiesta y sus años de participación." },
  { id: "catalogo-2024-la-tisca", nombre: "La Tisca", color: "#D77EA3", asociada: false, informacion: "Figura expresamente en el apartado «Penyes no associades» del libro de fiestas de 2024. En su felicitación se presenta con el lema «més rosetes que mai»." },
];
