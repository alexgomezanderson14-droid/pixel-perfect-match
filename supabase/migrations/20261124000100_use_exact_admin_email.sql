-- El correo exacto del propietario es la única identidad administradora.
-- No se exige un proveedor concreto: Supabase puede emitir distintos metadatos
-- de proveedor para una misma cuenta, pero el claim email está firmado en el JWT.
CREATE OR REPLACE FUNCTION private.es_admin_penyera()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT lower(btrim(coalesce(auth.jwt()->>'email',''))) = 'alexgomezanderson14@gmail.com';
$function$;

GRANT EXECUTE ON FUNCTION private.es_admin_penyera() TO authenticated;
NOTIFY pgrst, 'reload schema';
