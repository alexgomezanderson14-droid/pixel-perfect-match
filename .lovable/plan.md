# Cambios: portada nueva y web solo en castellano

## 1. Imagen de portada
- Nota: la imagen de las fiestas no ha llegado (solo hay un documento de texto adjunto). Adjúntala en el chat al aprobar y la usaré.
- Sustituir la foto actual por la nueva, a pantalla completa, con el mismo degradado oscuro y los mismos textos encima.
- Ajustar el encuadre para que el motivo principal se vea bien en móvil y ordenador.
- No se toca nada más de la portada.

## 2. Solo castellano
- Quitar el selector ES/VA del menú.
- El idioma queda fijo en español en toda la web: menú, mapa, marcadores, ventanas del mapa, programa, agenda, peñas y fechas.
- Las fechas siempre en formato español.
- No se guarda ni se lee ningún idioma en el navegador.
- No se cambia ningún dato del programa ni se añade contenido.

## Detalles técnicos
- `src/lib/i18n.tsx`: `LangProvider` sin estado ni localStorage; `t` devuelve siempre `x.es`; `lang` fijo "es"; `document.documentElement.lang = "es"`.
- `src/routes/index.tsx`: eliminar el bloque de botones ES/VA; `fmtDia` usa siempre `es-ES`; cambiar import del hero a la nueva imagen con `object-position` ajustado (p. ej. `object-[50%_35%]`).
- Nueva imagen en `src/assets/` (subida como asset si viene del usuario).
- Los textos `va` de los datos se dejan sin usar para no reescribir datos (no se muestran).
- Comprobar que compila y revisar la portada en móvil y escritorio.
