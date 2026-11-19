import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/mi-penya")({ component: MiPenyaPage });
const GLOBAL_ADMIN = "gomezandersonalex@gmail.com";
const field = "w-full rounded-xl border border-input bg-background px-3 py-3 text-sm";
const button = "rounded-full px-4 py-2.5 text-sm font-bold disabled:opacity-50";

function MiPenyaPage() {
  const [session, setSession] = useState<any>(null);
  const [penyes, setPenyes] = useState<any[]>([]);
  const [membership, setMembership] = useState<any>(null);
  const [ownRequests, setOwnRequests] = useState<any[]>([]);
  const [adminRequests, setAdminRequests] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedPenya, setSelectedPenya] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [profile, setProfile] = useState<any>({ direccion: "", informacion: "", instagram: "", tipo_musica: "Variada" });
  const [eventDraft, setEventDraft] = useState<any>({ id: "", titulo: "", descripcion: "", dia: "", hora: "", lugar: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const isGlobalAdmin = session?.user?.email?.toLowerCase() === GLOBAL_ADMIN;

  const refresh = useCallback(async (user: any) => {
    if (!user) return;
    const db = supabase as any;
    const [members, requests] = await Promise.all([
      db.from("penya_admins").select("*, penyes(*)").eq("user_id", user.id).eq("estado", "activo"),
      db.from("penya_admin_requests").select("*, penyes(nombre)").eq("user_id", user.id).order("created_at", { ascending: false })
    ]);
    if (members.error || requests.error) {
      setMessage("No se ha podido cargar la zona privada. Comprueba que la migración de administradores está aplicada en Supabase. " + (members.error?.message || requests.error?.message || ""));
      return;
    }
    setMembership(members.data?.[0] ?? null);
    setOwnRequests(requests.data ?? []);
    if (user.email?.toLowerCase() === GLOBAL_ADMIN) {
      const all = await db.from("penya_admin_requests").select("*, penyes(nombre)").eq("estado", "pendiente").order("created_at", { ascending: true });
      if (all.error) setMessage("No se pudieron cargar las solicitudes: " + all.error.message);
      else setAdminRequests(all.data ?? []);
    }
    if (members.data?.[0]?.penyes) {
      const p = members.data[0].penyes;
      setProfile({ direccion: p.direccion ?? "", informacion: p.informacion ?? "", instagram: p.instagram ?? "", tipo_musica: p.tipo_musica ?? "Variada" });
      const list = await db.from("eventos").select("*").eq("penya_id", p.id).order("dia", { ascending: true });
      if (!list.error) setEvents(list.data ?? []);
    } else {
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        const fullName = String(data.session.user.user_metadata?.full_name ?? "").trim().split(/\s+/);
        setNombre(fullName[0] ?? "");
        setApellidos(fullName.slice(1).join(" "));
        await refresh(data.session.user);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      if (next?.user) void refresh(next.user);
      else { setMembership(null); setOwnRequests([]); setAdminRequests([]); setEvents([]); }
    });
    const db = supabase as any;
    db.from("penyes").select("id,nombre").eq("estado", "aprobada").order("nombre").then(({ data, error }: any) => {
      if (active && !error) setPenyes(data ?? []);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [refresh]);

  const requestAccess = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage("");
    const { error } = await (supabase as any).from("penya_admin_requests").insert({
      penya_id: selectedPenya, user_id: session.user.id, nombre: nombre.trim(),
      apellidos: apellidos.trim(), email: session.user.email, estado: "pendiente"
    });
    setBusy(false);
    if (error) setMessage(error.code === "23505" ? "Ya existe una solicitud pendiente para esta peña." : "No se pudo enviar la solicitud: " + error.message);
    else { setMessage("Solicitud enviada. El administrador general debe aprobarla antes de activar los permisos."); await refresh(session.user); }
  };

  const resolveRequest = async (id: string, approve: boolean) => {
    setBusy(true);
    const { error } = await (supabase as any).rpc("resolve_penya_admin_request", { p_request_id: id, p_approve: approve });
    setBusy(false);
    setMessage(error ? "No se pudo actualizar la solicitud: " + error.message : approve ? "Responsable de peña aprobado." : "Solicitud rechazada.");
    if (!error) await refresh(session.user);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); if (!membership) return; setBusy(true);
    const { error } = await (supabase as any).from("penyes").update(profile).eq("id", membership.penya_id);
    setBusy(false); setMessage(error ? "No se pudo guardar la ficha: " + error.message : "Ficha de la peña actualizada.");
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault(); if (!membership) return; setBusy(true);
    const payload = { ...eventDraft, penya_id: membership.penya_id, publicado: false };
    const query = eventDraft.id
      ? (supabase as any).from("eventos").update(payload).eq("id", eventDraft.id).eq("penya_id", membership.penya_id)
      : (supabase as any).from("eventos").insert(payload);
    const { error } = await query;
    setBusy(false);
    setMessage(error ? "No se pudo guardar el evento: " + error.message : "Evento enviado para revisión del administrador general.");
    if (!error) { setEventDraft({ id: "", titulo: "", descripcion: "", dia: "", hora: "", lugar: "" }); await refresh(session.user); }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("¿Eliminar este evento de la peña?")) return;
    const { error } = await (supabase as any).from("eventos").delete().eq("id", id).eq("penya_id", membership.penya_id);
    setMessage(error ? "No se pudo eliminar: " + error.message : "Evento eliminado.");
    if (!error) await refresh(session.user);
  };

  return <main className="page-bg min-h-screen px-4 pb-16 pt-24 sm:px-6">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary/15 bg-card/75 p-5 shadow-sm">
        <div><p className="text-xs font-extrabold uppercase tracking-widest text-primary">festalfàs · zona privada</p><h1 className="mt-1 text-2xl font-black text-primary sm:text-3xl">Gestión de mi peña</h1><p className="mt-1 text-sm text-muted-foreground">Cada responsable solo puede gestionar la peña que tiene asignada.</p></div>
        <Link to="/" className="rounded-full border border-border px-4 py-2 text-sm font-bold">← Volver</Link>
      </header>
      {message && <p role="status" className="rounded-2xl border border-primary/15 bg-card/80 p-4 text-sm">{message}</p>}
      {!session ? <section className="glass mx-auto max-w-xl space-y-3 rounded-3xl p-6"><h2 className="text-xl font-bold">Inicia sesión</h2><p className="text-sm text-muted-foreground">Utiliza tu cuenta de FestAlfàs desde Ajustes para solicitar o gestionar una peña.</p><Link to="/" className={button + " inline-block bg-primary text-primary-foreground"}>Ir a iniciar sesión</Link></section> : <>
        {isGlobalAdmin && <section className="glass space-y-4 rounded-3xl p-5"><div><h2 className="text-xl font-black text-primary">Solicitudes de administración</h2><p className="text-sm text-muted-foreground">Solo el administrador general puede aprobar o rechazar responsables.</p></div>
          {adminRequests.length ? adminRequests.map((r:any) => <article key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-3"><div><b>{r.penyes?.nombre ?? "Peña"}</b><p className="text-sm">{r.nombre} {r.apellidos} · {r.email}</p></div><div className="flex gap-2"><button disabled={busy} onClick={() => void resolveRequest(r.id, true)} className={button + " bg-primary text-primary-foreground"}>Aprobar</button><button disabled={busy} onClick={() => void resolveRequest(r.id, false)} className={button + " border border-destructive text-destructive"}>Rechazar</button></div></article>) : <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p>}
        </section>}
        {membership ? <div className="grid gap-5 lg:grid-cols-2">
          <form onSubmit={saveProfile} className="glass space-y-3 rounded-3xl p-5"><h2 className="text-xl font-black text-primary">{membership.penyes?.nombre}</h2><p className="text-sm text-muted-foreground">Edita los datos básicos de la ficha pública. Los permisos se comprueban en la base de datos.</p>
            <label className="block space-y-1 text-sm font-semibold">Dirección<input className={field} value={profile.direccion} onChange={e=>setProfile({...profile,direccion:e.target.value})}/></label>
            <label className="block space-y-1 text-sm font-semibold">Descripción<textarea className={field} rows={5} maxLength={3000} value={profile.informacion} onChange={e=>setProfile({...profile,informacion:e.target.value})}/></label>
            <label className="block space-y-1 text-sm font-semibold">Instagram<input className={field} value={profile.instagram} onChange={e=>setProfile({...profile,instagram:e.target.value})}/></label>
            <label className="block space-y-1 text-sm font-semibold">Tipo de música<input className={field} value={profile.tipo_musica} onChange={e=>setProfile({...profile,tipo_musica:e.target.value})}/></label>
            <button disabled={busy} className={button + " bg-primary text-primary-foreground"}>Guardar ficha</button>
          </form>
          <section className="glass space-y-4 rounded-3xl p-5"><h2 className="text-xl font-black text-primary">Eventos de la peña</h2>
            <form onSubmit={saveEvent} className="space-y-2"><input className={field} placeholder="Nombre del evento" required value={eventDraft.titulo} onChange={e=>setEventDraft({...eventDraft,titulo:e.target.value})}/><textarea className={field} rows={3} placeholder="Descripción" value={eventDraft.descripcion} onChange={e=>setEventDraft({...eventDraft,descripcion:e.target.value})}/><input className={field} type="date" required value={eventDraft.dia} onChange={e=>setEventDraft({...eventDraft,dia:e.target.value})}/><input className={field} placeholder="Hora" value={eventDraft.hora} onChange={e=>setEventDraft({...eventDraft,hora:e.target.value})}/><input className={field} placeholder="Lugar" value={eventDraft.lugar} onChange={e=>setEventDraft({...eventDraft,lugar:e.target.value})}/><button disabled={busy} className={button + " bg-primary text-primary-foreground"}>{eventDraft.id ? "Guardar cambios" : "Enviar evento para revisión"}</button>{eventDraft.id && <button type="button" onClick={()=>setEventDraft({id:"",titulo:"",descripcion:"",dia:"",hora:"",lugar:""})} className={button + " border border-border"}>Cancelar</button>}</form>
            <div className="space-y-2">{events.map((ev:any)=><article key={ev.id} className="rounded-2xl border border-border p-3"><div className="flex items-start justify-between gap-2"><div><b>{ev.titulo}</b><p className="text-xs text-muted-foreground">{ev.dia} · {ev.hora} · {ev.publicado ? "Publicado" : "Pendiente de revisión"}</p></div><div className="flex gap-2"><button onClick={()=>setEventDraft({id:ev.id,titulo:ev.titulo,descripcion:ev.descripcion??"",dia:ev.dia,hora:ev.hora??"",lugar:ev.lugar??""})} className="text-xs font-bold text-primary">Editar</button><button onClick={()=>void deleteEvent(ev.id)} className="text-xs text-destructive">Eliminar</button></div></div></article>)}</div>
          </section>
        </div> : !isGlobalAdmin && <section className="glass space-y-4 rounded-3xl p-5"><div><h2 className="text-xl font-black text-primary">Solicitar acceso de responsable</h2><p className="text-sm text-muted-foreground">Selecciona tu peña. El administrador general revisará la solicitud antes de activar los permisos.</p></div>
          <form onSubmit={requestAccess} className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm font-semibold">Peña<select className={field} required value={selectedPenya} onChange={e=>setSelectedPenya(e.target.value)}><option value="">Selecciona tu peña</option>{penyes.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label><label className="space-y-1 text-sm font-semibold">Nombre<input className={field} required maxLength={80} value={nombre} onChange={e=>setNombre(e.target.value)}/></label><label className="space-y-1 text-sm font-semibold">Apellidos<input className={field} required maxLength={120} value={apellidos} onChange={e=>setApellidos(e.target.value)}/></label><div className="flex items-end"><button disabled={busy || !selectedPenya} className={button + " bg-primary text-primary-foreground"}>Enviar solicitud</button></div></form>
          {ownRequests.map((r:any)=><p key={r.id} className="rounded-xl border border-border p-3 text-sm">Solicitud para <b>{r.penyes?.nombre}</b>: {r.estado}</p>)}
        </section>}
      </>}
    </div>
  </main>;
}
