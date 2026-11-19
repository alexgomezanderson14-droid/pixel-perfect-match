-- Per-penya administration, with permissions enforced by PostgreSQL RLS.
CREATE TABLE IF NOT EXISTS public.penya_admins (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 penya_id uuid NOT NULL REFERENCES public.penyes(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 rol text NOT NULL DEFAULT 'admin' CHECK (rol IN ('admin')),
 estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','revocado')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (penya_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_penya_admins_user ON public.penya_admins(user_id, estado);
CREATE TABLE IF NOT EXISTS public.penya_admin_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 penya_id uuid NOT NULL REFERENCES public.penyes(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 nombre text NOT NULL, apellidos text NOT NULL, email text NOT NULL,
 estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobada','rechazada')),
 reviewed_by uuid REFERENCES auth.users(id), reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_penya_admin_requests_pending ON public.penya_admin_requests(penya_id,user_id) WHERE estado='pendiente';
CREATE INDEX IF NOT EXISTS idx_penya_admin_requests_status ON public.penya_admin_requests(estado,created_at DESC);
CREATE OR REPLACE FUNCTION public.is_festalfas_global_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,auth
AS $$ SELECT coalesce(auth.jwt()->>'email','')='gomezandersonalex@gmail.com'; $$;
CREATE OR REPLACE FUNCTION public.is_active_penya_admin(target_penya uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,auth
AS $$ SELECT EXISTS (SELECT 1 FROM public.penya_admins pa WHERE pa.penya_id=target_penya AND pa.user_id=auth.uid() AND pa.estado='activo'); $$;
ALTER TABLE public.penya_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penya_admin_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.penya_admins TO authenticated;
GRANT SELECT, INSERT ON public.penya_admin_requests TO authenticated;
DROP POLICY IF EXISTS "Users can read own penya admin memberships" ON public.penya_admins;
CREATE POLICY "Users can read own penya admin memberships" ON public.penya_admins FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_festalfas_global_admin());
DROP POLICY IF EXISTS "Global admin manages penya admin memberships" ON public.penya_admins;
CREATE POLICY "Global admin manages penya admin memberships" ON public.penya_admins FOR ALL TO authenticated USING (public.is_festalfas_global_admin()) WITH CHECK (public.is_festalfas_global_admin());
DROP POLICY IF EXISTS "Users can create own penya admin requests" ON public.penya_admin_requests;
CREATE POLICY "Users can create own penya admin requests" ON public.penya_admin_requests FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND estado='pendiente' AND EXISTS (SELECT 1 FROM public.penyes p WHERE p.id=penya_id AND p.estado='aprobada'));
DROP POLICY IF EXISTS "Users and global admin can read penya admin requests" ON public.penya_admin_requests;
CREATE POLICY "Users and global admin can read penya admin requests" ON public.penya_admin_requests FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_festalfas_global_admin());
CREATE OR REPLACE FUNCTION public.resolve_penya_admin_request(p_request_id uuid,p_approve boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE request_row public.penya_admin_requests%ROWTYPE;
BEGIN
 IF NOT public.is_festalfas_global_admin() THEN RAISE EXCEPTION 'No tienes permisos para resolver solicitudes.'; END IF;
 SELECT * INTO request_row FROM public.penya_admin_requests WHERE id=p_request_id AND estado='pendiente' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'La solicitud ya no está pendiente.'; END IF;
 UPDATE public.penya_admin_requests SET estado=CASE WHEN p_approve THEN 'aprobada' ELSE 'rechazada' END, reviewed_by=auth.uid(), reviewed_at=now() WHERE id=p_request_id;
 IF p_approve THEN INSERT INTO public.penya_admins(penya_id,user_id,rol,estado) VALUES(request_row.penya_id,request_row.user_id,'admin','activo') ON CONFLICT(penya_id,user_id) DO UPDATE SET estado='activo',rol='admin'; END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.resolve_penya_admin_request(uuid,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.update_own_penya_profile(p_penya_id uuid,p_direccion text,p_informacion text,p_instagram text,p_tipo_musica text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $
BEGIN
 IF NOT public.is_active_penya_admin(p_penya_id) THEN RAISE EXCEPTION 'No tienes permisos para editar esta peña.'; END IF;
 UPDATE public.penyes SET direccion=p_direccion, informacion=p_informacion, instagram=p_instagram, tipo_musica=p_tipo_musica WHERE id=p_penya_id;
END; $;
GRANT EXECUTE ON FUNCTION public.update_own_penya_profile(uuid,text,text,text,text) TO authenticated;
DROP POLICY IF EXISTS "Penya admins can manage own events" ON public.eventos;
CREATE POLICY "Penya admins can manage own events" ON public.eventos FOR ALL TO authenticated USING (public.is_active_penya_admin(penya_id)) WITH CHECK (public.is_active_penya_admin(penya_id));
REVOKE UPDATE,DELETE ON public.eventos FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.eventos TO authenticated;
