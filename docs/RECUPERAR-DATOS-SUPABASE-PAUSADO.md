# Recuperación segura de datos del Supabase pausado

## Estado confirmado

- Proyecto de origen: `fdmhchfcvnbmoczoperg`.
- Estado consultado el 18-11-2026: `INACTIVE`.
- No se ha intentado reactivarlo, restaurarlo ni cambiar de plan.
- La base D1 `festalfas-db` ya tiene el esquema vacío; no contiene los registros antiguos.
- La aplicación sigue usando Supabase. No cambiar las variables de producción ni eliminar el proyecto.

## Qué copia necesitamos

Hay que recuperar dos cosas por separado:

1. **Base de datos PostgreSQL:** peñas, actos, eventos, `site_content` (incluye `noticias_json`, avisos y mapa), y cualquier otra tabla utilizada.
2. **Objetos de Storage:** archivos reales del bucket `penyes` (fotos, vídeos y documentos). La copia de la base de datos no incluye los bytes de Storage.

## Ruta sin reactivar el proyecto

Supabase documenta que, una vez transcurrida la ventana de 90 días de un proyecto pausado, el Dashboard permite descargar la copia física de la base de datos y los objetos de Storage. La copia de base puede restaurarse en un entorno local para extraer los datos.

- Dashboard del proyecto: https://supabase.com/dashboard/project/fdmhchfcvnbmoczoperg
- Guía oficial sobre proyectos pausados y la ventana de 90 días: https://supabase.com/docs/guides/platform/upgrading#time-limits
- Guía oficial para restaurar una copia descargada localmente: https://supabase.com/docs/guides/local-development/restoring-downloaded-backup

**No pulses «Resume project», «Restore project» ni actives un plan de pago** como parte de este procedimiento.

Si el Dashboard ya muestra una opción de descarga de backup sin reactivar el proyecto, descarga la copia y los objetos de Storage. Si no aparece, no hay una vía de lectura directa disponible desde la conexión actual mientras el proyecto siga inactivo; habrá que esperar a que el Dashboard habilite la descarga o usar una exportación previa que ya tengas.

## Importación a D1 (cuando exista la copia)

La importación se hará conservando los IDs originales y en este orden:

1. `penyes`
2. `actos`
3. `eventos`
4. `site_content` (sin perder las claves JSON originales)
5. Normalización de `site_content.noticias_json` a `noticias`, manteniendo también el JSON original como respaldo.
6. Copia de archivos a Backblaze B2 y actualización de referencias de medios solo después de verificar cada archivo.

Al terminar se compararán recuentos, IDs, relaciones entre eventos y peñas, claves de contenido y referencias de archivos. Solo entonces se conectará la aplicación a D1.

## Prohibiciones de seguridad

- No vaciar ni sobrescribir datos existentes en el origen.
- No borrar ni desconectar Supabase antes de validar D1 y B2.
- No importar registros de ejemplo como si fueran datos reales.
- No copiar claves privadas, tokens ni contraseñas al repositorio.
