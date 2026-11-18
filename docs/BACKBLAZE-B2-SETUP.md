# Configuración de almacenamiento Backblaze B2 para festalfàs

La aplicación usa la API nativa HTTPS de Backblaze B2 desde el Worker de Cloudflare. El bucket puede permanecer privado: el Worker recibe las subidas, guarda los archivos en B2 y sirve los medios a través de la ruta propia `/media/*`.

## Variables y secretos de Cloudflare

En el Worker/Pages que publica festalfàs, abre Settings → Variables and Secrets y configura:

| Nombre | Tipo | Valor |
| --- | --- | --- |
| `B2_APPLICATION_KEY_ID` | Secret | ID de la clave de aplicación de Backblaze |
| `B2_APPLICATION_KEY` | Secret | Clave secreta de aplicación de Backblaze |
| `B2_BUCKET_NAME` | Variable | `festalfas-media` |
| `SUPABASE_URL` | Existing variable | URL del proyecto Supabase actual, necesaria temporalmente para validar la sesión del administrador |
| `SUPABASE_PUBLISHABLE_KEY` | Existing variable/secret | Clave pública de Supabase, necesaria temporalmente para validar la sesión del administrador |

No guardes las claves en Git, archivos `.env` versionados, código del navegador ni mensajes. La clave de aplicación debe limitarse al bucket `festalfas-media` y tener permisos de lectura y escritura de archivos.

El endpoint S3 no se utiliza en esta integración porque el Worker usa la API nativa de B2. El ID del bucket se obtiene automáticamente de la autorización si la clave está limitada a `festalfas-media`; si la clave da acceso a varios buckets, se puede configurar también `B2_BUCKET_ID` para seleccionar el correcto. El endpoint que has encontrado (`s3.us-east-005.backblazeb2.com`) se conserva como dato informativo.

## Rutas

- `POST /api/media/upload`: recibe un formulario multipart con `file` y `folder`, valida el tipo y el tamaño y sube el archivo a B2.
- `GET /media/<ruta>`: sirve un objeto del bucket privado a través del Worker y admite peticiones Range para vídeo.

Tipos permitidos: JPG, PNG, WEBP, MP4, WEBM, OGG y MOV. Imágenes hasta 5 MB; vídeos hasta 100 MB.

Carpetas permitidas: `penyes`, `penyes/perfiles/<id>`, `eventos`, `actuaciones`, `noticias` y `site`.

## D1

La base de datos debe estar conectada al Worker mediante un binding llamado `DB`. Crear la base de datos no aplica todavía el esquema ni migra los datos antiguos. No se debe retirar Supabase ni ejecutar una importación vacía hasta verificar una exportación completa del proyecto y de sus archivos.
