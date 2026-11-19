create or replace function public.submit_site_feedback(
  p_tipo text, p_titulo text, p_descripcion text,
  p_email text default null, p_pagina text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid := gen_random_uuid(); v_item jsonb;
begin
  if p_tipo not in ('sugerencia','error') then raise exception 'Tipo no válido'; end if;
  if length(btrim(coalesce(p_titulo,''))) < 3 or length(btrim(p_titulo)) > 100 then raise exception 'Título no válido'; end if;
  if length(btrim(coalesce(p_descripcion,''))) < 10 or length(btrim(p_descripcion)) > 2000 then raise exception 'Descripción no válida'; end if;
  if p_email is not null and length(btrim(p_email)) > 254 then raise exception 'Correo no válido'; end if;
  v_item := jsonb_build_object('id',v_id,'tipo',p_tipo,'titulo',btrim(p_titulo),'descripcion',btrim(p_descripcion),'email',nullif(btrim(coalesce(p_email,'')),''),'pagina',left(coalesce(p_pagina,''),500),'estado','pendiente','created_at',now());
  insert into public.site_content as current_content(clave,valor) values('sugerencias_json',jsonb_build_array(v_item)::text)
  on conflict(clave) do update set valor=(case when jsonb_typeof(current_content.valor::jsonb)='array' then current_content.valor::jsonb else '[]'::jsonb end || jsonb_build_array(v_item))::text;
  return v_id;
end; $$;
revoke all on function public.submit_site_feedback(text,text,text,text,text) from public;
grant execute on function public.submit_site_feedback(text,text,text,text,text) to anon,authenticated;
