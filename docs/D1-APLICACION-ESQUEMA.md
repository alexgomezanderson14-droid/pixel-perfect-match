# Aplicar el esquema inicial de D1

Esta operación crea tablas vacías. **No importa registros ni elimina datos de Supabase.** Antes de ejecutarla, comprueba que la base seleccionada sea `festalfas-db`.

## 1. Abrir la consola D1

1. Entra en Cloudflare Dashboard.
2. Abre **Storage & databases → D1 SQL Database**.
3. Selecciona `festalfas-db`.
4. Abre **Console** (o **Query** según la interfaz).

## 2. Ejecutar la migración inicial

Abre el archivo del repositorio:

`cloudflare/migrations/0001_initial.sql`

Copia su contenido completo en la consola D1 y ejecútalo una sola vez. La migración usa `CREATE TABLE IF NOT EXISTS` e índices idempotentes, así que también puede repetirse si la consola informa de un error parcial; revisa el error antes de repetirla.

## 3. Verificar que se han creado las tablas

Ejecuta:

```sql
SELECT name
FROM sqlite_master
WHERE type = 'table'
  AND name NOT LIKE 'sqlite_%'
ORDER BY name;
```

Deben aparecer estas tablas:

- `actos`
- `avisos_internos`
- `eventos`
- `noticia_comentarios`
- `noticia_likes`
- `noticias`
- `penyes`
- `penya_invitaciones`
- `penya_miembros`
- `site_content`
- `usuarios`

Comprueba también que la base está vacía, sin importar aún contenido:

```sql
SELECT
  (SELECT COUNT(*) FROM penyes) AS penyes,
  (SELECT COUNT(*) FROM actos) AS actos,
  (SELECT COUNT(*) FROM eventos) AS eventos,
  (SELECT COUNT(*) FROM site_content) AS site_content,
  (SELECT COUNT(*) FROM noticias) AS noticias;
```

Es normal que los recuentos sean cero en esta fase.

## 4. No hacer todavía

- No borres, pauses ni elimines el proyecto antiguo de Supabase.
- No sustituyas las variables de Supabase del despliegue actual.
- No crees manualmente usuarios, administradores o peñas de prueba.
- No cambies el dominio ni el proveedor de publicación.
- No ejecutes una importación hasta disponer de una exportación verificada de las tablas y del bucket antiguo.

## Siguiente fase

Una vez aplicado el esquema, se prepara la importación conservando los identificadores originales y las referencias entre peñas, eventos, noticias y archivos. La importación debe terminar con una comparación de recuentos y referencias antes de conectar las pantallas públicas a D1.
