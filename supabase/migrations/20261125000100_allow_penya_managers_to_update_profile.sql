-- Permite editar la ficha y su configuración a administradores y miembros aprobados de esa peña.
create or replace function public.actualizar_configuracion_penya(
  p_penya_id uuid,
  p_clave text,
  p_valor jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actual text;
  v_config jsonb := '{}'::jsonb;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para modificar la ficha.';
  end if;

  if not private.es_admin_penyera()
     and not exists (
       select 1 from public.penya_miembros m
       where m.penya_id = p_penya_id
         and m.user_id = auth.uid()
         and m.estado = 'aprobado'
     ) then
    raise exception 'Solo los miembros aprobados de esta peña pueden modificar su ficha.';
  end if;

  if p_penya_id is null then raise exception 'Falta identificar la peña.'; end if;
  if p_clave not in ('penyes_visitas_json','penyes_logos_ficha_json','penyes_perfiles_json','penyes_miembros_actuales_json') then
    raise exception 'Esta clave de configuración no se puede modificar desde la ficha de peña.';
  end if;
  if not exists (select 1 from public.penyes where id = p_penya_id) then raise exception 'No se ha encontrado la peña.'; end if;

  select valor into v_actual from public.site_content where clave = p_clave for update;
  if v_actual is not null then
    begin
      v_config := v_actual::jsonb;
      if jsonb_typeof(v_config) <> 'object' then v_config := '{}'::jsonb; end if;
    exception when others then v_config := '{}'::jsonb;
    end;
  end if;
  v_result := jsonb_set(v_config, array[p_penya_id::text], coalesce(p_valor, 'null'::jsonb), true);
  insert into public.site_content(clave, valor, updated_at) values (p_clave, v_result::text, now())
  on conflict (clave) do update set valor = excluded.valor, updated_at = now();
  return v_result;
end;
$function$;
revoke all on function public.actualizar_configuracion_penya(uuid,text,jsonb) from public, anon;
grant execute on function public.actualizar_configuracion_penya(uuid,text,jsonb) to authenticated;
notify pgrst, 'reload schema';
