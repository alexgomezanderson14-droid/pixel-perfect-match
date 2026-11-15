# Plan de migración de festalfàs a Cloudflare

## Objetivo
Adoptar una infraestructura común y ampliable con Cloudflare Workers (API), D1 (datos relacionales) y R2 (fotografías y documentos). La migración debe ser gradual y sin rehacer el diseño de la web.

## Estado real
- La web actual depende de Supabase para autenticación de administración, lectura/escritura de peñas, actos, eventos, contenido y almacenamiento.
- Las noticias se guardan actualmente en `site_content` bajo `noticias_json`; avisos y puntos de mapa también se conservan como JSON en `site_content`.
- Este repositorio contiene los tipos y migraciones SQL de Supabase, pero no contiene una exportación verificada de los registros actuales ni de los archivos almacenados.
- El proyecto Supabase que se pudo ver desde la conexión disponible no era el proyecto correcto. No se debe tocar.
- Por tanto, no se puede retirar Supabase ni cambiar la aplicación a D1 hasta conseguir una exportación íntegra del backend antiguo. La base nueva no debe arrancar vacía.

## Arquitectura objetivo
1. **Workers:** API única para operaciones de lectura/escritura, validación, permisos, moderación y límites anti-spam.
2. **D1:** peñas, programa, eventos, noticias, ajustes, likes, comentarios, miembros y roles.
3. **R2:** imágenes de peñas, carteles, fotos de noticias y portada. Guardar claves de objeto en D1, no blobs en las filas.
4. **Identidad:** definir el proveedor de autenticación antes de habilitar cuentas públicas. La sesión y los roles deben validarse en el Worker; nunca confiar en un rol enviado desde el navegador.
5. **Compartir noticias:** endpoint público de vista previa por noticia, con Open Graph/Twitter Card generado en servidor a partir de la imagen principal asignada. Un cambio de metadatos en React no basta para WhatsApp/Facebook, porque sus rastreadores no ejecutan la aplicación cliente.

## Modelo D1 inicial
El archivo `cloudflare/schema.sql` propone las tablas para:
- Las tablas actuales `penyes`, `actos`, `eventos` y `site_content`.
- Noticias normalizadas a una fila por noticia.
- Likes únicos por visitante y noticia.
- Comentarios con respuestas y estados de moderación.
- Usuarios, membresías por peña, roles de responsable y avisos internos para una futura zona privada.

El esquema es una propuesta inicial y debe contrastarse con la estructura real exportada, especialmente las columnas históricas que no aparecen en el tipo generado actual.

## Orden seguro de implantación
1. Obtener y verificar exportación de Supabase: tablas, registros, usuarios necesarios y archivos del bucket `penyes`.
2. Crear D1 y R2 en una cuenta Cloudflare del propietario; guardar identificadores y secretos como variables/secretos de despliegue, nunca en Git.
3. Aplicar y revisar el esquema D1; importar datos y archivos; comparar recuentos y referencias con el origen.
4. Desplegar Worker con autenticación, validación, moderación, límites anti-spam y endpoints de compatibilidad.
5. Conectar la base D1 al Worker con el binding `DB` y aplicar `cloudflare/migrations/0001_initial.sql` en un entorno de pruebas.
6. Importar noticias y probar `GET /noticia/:id`: los rastreadores sociales reciben HTML con Open Graph/Twitter Card; los visitantes normales se redirigen a la ruta hash existente de la SPA.
7. Cambiar la web por módulos (primero noticias, después peñas/eventos/administración), manteniendo Supabase como origen de lectura hasta validar cada módulo.
8. Verificar las vistas previas con las herramientas de depuración de WhatsApp/Facebook y con Telegram; comprobar que `og:image` coincide con `imagen_url` de cada noticia.
9. Solo cuando todo esté verificado, retirar la dependencia de Supabase.

## Vistas previas para compartir noticias
- La aplicación genera enlaces canónicos con formato `/noticia/<id>`.
- `src/server.ts` intercepta esa ruta antes del SSR normal. Los bots sociales reciben HTML con `og:title`, `og:description`, `og:image`, `og:url` y etiquetas Twitter.
- Los visitantes normales reciben una redirección a `/#noticia=<id>`, por lo que se conserva la navegación actual de la SPA.
- El Worker consulta `noticias` en D1 mediante el binding opcional `DB`. La noticia CuBaTa 2027 tiene un fallback temporal en código hasta importar las noticias.
- Para que funcione en producción, el despliegue Cloudflare debe pasar el binding D1 como `env.DB` y ejecutar el Worker para la ruta `/noticia/*`. Si la aplicación sigue desplegada únicamente en otro hosting, los metadatos dinámicos no estarán activos en el dominio público.
- Las imágenes de `og:image` deben ser URLs públicas HTTPS, accesibles por los rastreadores sin cookies ni autenticación.

## Requisitos antes del despliegue
- Acceso a una cuenta Cloudflare del propietario para crear D1, R2 y Workers.
- Exportación del Supabase correcto. No pedir ni guardar contraseñas, tokens o claves en el repositorio.
- Confirmar dominio y DNS para configurar las rutas del Worker.
- Revisar los límites gratuitos vigentes antes de publicar y añadir alertas de uso.

**No desplegar una base vacía ni borrar el backend antiguo.** El esquema SQL de esta carpeta todavía no se ha aplicado a ninguna cuenta Cloudflare.
