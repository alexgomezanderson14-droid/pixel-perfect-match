# Actualización web Fiestas de l'Alfàs del Pi 2026

Importante: el PDF «L'ALFÀS - PROGRAMA FESTES 2026.pdf» no ha llegado adjunto. Hay que volver a adjuntarlo junto con la aprobación; sin él, el programa quedará vacío con un mensaje "Programa pendiente de publicar" (no se inventará nada).

## 1. Portada
- Generar una nueva imagen de alta calidad: calle del casco antiguo mediterráneo de l'Alfàs del Pi de noche, con guirnaldas, peñas con blusones, banda de música y fuegos artificiales sobre la iglesia de San José. Sustituye a la actual sin tocar textos, efectos ni diseño.

## 2. Solo castellano
- Quitar el selector ES/VA del menú.
- Pasar todos los textos a castellano simple (sin traducciones), fechas en es-ES y `lang="es"` fijo.
- Eliminar el sistema de idiomas.

## 3. Formulario "Añadir peña"
- Activar Lovable Cloud (base de datos + almacenamiento de fotos). No requiere servicios externos.
- Botón visible "Añadir peña" en la sección Peñas que abre un formulario con:
  - Nombre (obligatorio)
  - Ubicación: dirección escrita (se busca en el mapa) o tocar directamente en un mini-mapa (obligatoria)
  - Foto (obligatoria, JPG/PNG/WEBP, máx. 5 MB)
- Al enviar, la peña se guarda y aparece al momento en el directorio (con foto) y en el mapa (con foto en la ventana emergente).
- Publicación inmediata (sin moderación). Se puede añadir aprobación del admin más adelante.

## 4. Programa oficial
- Extraer del PDF (versión castellano) todos los actos con día, hora, nombre y lugar tal cual.
- Programa por días con pestañas desplazables en móvil, tarjetas diferenciadas por tipo y día.
- La sección "Agenda" se fusiona con el programa (era duplicada) y el menú mantiene "Programa".

## 5. Sin contenido de ejemplo
- Borrar peñas, ubicaciones, actos y textos de ejemplo.
- El mapa muestra solo peñas reales añadidas y lugares que cite el PDF con ubicación clara.
- Mensajes vacíos: "Aún no hay peñas. ¡Sé la primera en añadir la tuya!".
- Información: solo 112 y emergencias; el contacto se quita si no hay dato real.

## Detalles técnicos
- Archivos: `src/content/fiestas.ts`, `src/routes/index.tsx`, `src/components/FestMap.tsx`, nuevo `src/components/AddPenyaForm.tsx`; borrar `src/lib/i18n.tsx`.
- Tabla `penyes` (id, nombre, direccion, lat, lng, foto_url, created_at) con lectura pública e inserción anónima validada (longitudes, rango de coordenadas); bucket público `penyes` con subida anónima limitada a imágenes.
- Geocodificación de dirección con Nominatim (OpenStreetMap), sin clave.
- Validación con zod; verificación final en móvil y escritorio.
