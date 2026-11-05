-- The official shuttle runs on 6, 7, 8 and 9 November, not only on the first night.
insert into public.actos (dia, hora, titulo, descripcion, tipo, lugar, publicado)
select v.dia, '01:00–04:00', 'Autobús lanzadera (salidas cada hora)', '',
       'evento',
       'Salida desde el parking La Bolleta (frente a Gaudí). Paradas: Parque Escandinavia, San Rafael, Tossalet, avenida Sant Pere (Albir Garden) y Consum Albir. Regreso al parking La Bolleta.',
       true
from (values ('2026-11-07'::date), ('2026-11-08'::date), ('2026-11-09'::date)) as v(dia)
where not exists (
  select 1 from public.actos a
  where a.dia = v.dia
    and a.hora = '01:00–04:00'
    and a.titulo = 'Autobús lanzadera (salidas cada hora)'
);
