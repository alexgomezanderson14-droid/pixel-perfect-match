import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import hero from "@/assets/hero-fiestas.jpg";
import { edicion, lugares as lugaresFijos, ui, type Categoria, type Lugar } from "@/content/fiestas";
import { supabase } from "@/integrations/supabase/client";

const FestMap = lazy(() => import("@/components/FestMap"));
const AddPenyaForm = lazy(() => import("@/components/AddPenyaForm"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fiestas de l'Alfàs del Pi 2026 · Programa, mapa y peñas" },
      { name: "description", content: "Programa oficial, mapa interactivo y peñas de las Fiestas del Jubileo y del Santísimo Cristo del Buen Acierto de l'Alfàs del Pi." },
      { property: "og:title", content: "Fiestas de l'Alfàs del Pi 2026" },
      { property: "og:description", content: "Programa oficial, mapa interactivo y peñas de las fiestas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const cats: Categoria[] = ["penya", "actuacion", "evento", "recinto", "servicio"];
const catBg: Record<Categoria, string> = {
  penya: "bg-cat-penya", actuacion: "bg-cat-actuacion", evento: "bg-cat-evento", recinto: "bg-cat-recinto", servicio: "bg-cat-servicio",
};

function fmtDia(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

type PenyaDb = { id: string; nombre: string; direccion: string | null; lat: number; lng: number; foto: string; tipo_musica: string; acepta_visitas: boolean; informacion: string };

function Home() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Categoria | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [penyes, setPenyes] = useState<PenyaDb[]>([]);
  const [actos, setActos] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [siteContent, setSiteContent] = useState<Record<string,string>>({});
  const [heroImage, setHeroImage] = useState("");
  const [form, setForm] = useState(false);
  const [selectedPenya, setSelectedPenya] = useState<PenyaDb | null>(null);
  const dias = useMemo(() => [...new Set(actos.map((a) => a.dia))].sort(), [actos]);
  const [dia, setDia] = useState<string | undefined>();
  useEffect(() => { if (dias.length && !dia) setDia(dias[0]); }, [dias, dia]);

  const cargar = useCallback(async () => {
    const [{ data }, { data: actosData }, { data: eventosData }, { data: contentData }] = await Promise.all([
      supabase.from("penyes").select("id,nombre,direccion,lat,lng,foto_url,tipo_musica,acepta_visitas,informacion").eq("estado","aprobada").order("nombre"),
      supabase.from("actos").select("*").eq("publicado",true).order("dia").order("hora"),
      supabase.from("eventos").select("*").eq("publicado",true).order("dia").order("hora"),
      supabase.from("site_content").select("clave,valor"),
    ]);
    setActos(actosData ?? []);
    setEventos(eventosData ?? []);
    const content = Object.fromEntries((contentData ?? []).map((x:any)=>[x.clave,x.valor]));
    setSiteContent(content);
    if (content.hero_image_path) {
      const { data: imageData } = await supabase.storage.from("penyes").createSignedUrl(content.hero_image_path, 604800);
      setHeroImage(imageData?.signedUrl ?? "");
    }
    if (!data) return;
    const { data: urls } = data.length
      ? await supabase.storage.from("penyes").createSignedUrls(data.map((p) => p.foto_url), 60 * 60 * 24 * 7)
      : { data: [] };
    setPenyes(data.map((p, i) => ({ ...p, foto: urls?.[i]?.signedUrl ?? "" })));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const todos: Lugar[] = useMemo(() => [
    ...lugaresFijos,
    ...penyes.map((p) => ({ id: p.id, categoria: "penya" as const, nombre: p.nombre, descripcion: p.direccion ?? "", lat: p.lat, lng: p.lng, foto: p.foto })),
  ], [penyes]);

  const visibles = todos.filter((l) => (!cat || l.categoria === cat) && l.nombre.toLowerCase().includes(q.toLowerCase()));

  const goMap = (id?: string) => {
    if (!id) return;
    setCat(null);
    setQ("");
    setFocus(null);
    requestAnimationFrame(() => setFocus(id));
    document.getElementById("mapa")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="page-bg min-h-screen">
      <header className="fixed inset-x-0 top-4 z-[1000] flex justify-center px-4">
        <nav className="glass flex items-center gap-1 rounded-full p-1.5 text-sm">
          {(Object.keys(ui.nav) as (keyof typeof ui.nav)[]).map((k) => (
            <a key={k} href={`#${k}`} className="rounded-full px-3 py-1.5 hover:bg-glass">{ui.nav[k]}</a>
          ))}
        </nav>
      </header>

      <section className="relative flex min-h-[92vh] items-end overflow-hidden">
        <img src={heroImage || hero} alt="Fiestas en las calles de l'Alfàs del Pi" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brown/90 via-brown/20 to-transparent" />
        <div className="relative mx-auto w-full max-w-6xl px-5 pb-16">
          <span className="glass-dark mb-4 inline-block rounded-full px-3 py-1 text-xs">{siteContent.hero_fechas || edicion.fechas}</span>
          <h1 className="rise text-5xl font-bold leading-[0.95] text-on-image sm:text-7xl md:text-8xl">{siteContent.hero_titulo || edicion.titulo} <span className="text-pink">{edicion.anyo}</span></h1>
          <p className="rise mt-4 max-w-xl text-lg text-on-image/85">{siteContent.hero_subtitulo || edicion.subtitulo}</p>
          <div className="rise mt-8 flex flex-wrap gap-3">
            <div className="glass-dark rounded-2xl px-5 py-3 text-sm">¡VIVE LAS FIESTAS!</div>
            <a href="#programa" className="rounded-full bg-pink px-6 py-3 font-bold text-brown transition hover:-translate-y-0.5">{ui.nav.programa}</a>
            <a href="#mapa" className="glass-dark rounded-full px-6 py-3 font-bold">{ui.nav.mapa}</a>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-24 px-5 py-20">
        <section id="mapa" className="scroll-mt-24">
          <SectionTitle>{ui.nav.mapa}</SectionTitle>
          <div className="glass grid gap-4 rounded-[2rem] p-3 md:grid-cols-[280px_1fr]">
            <div className="space-y-3 p-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ui.buscar} className="w-full rounded-full border border-input bg-glass px-4 py-2.5 outline-none focus:ring-2 focus:ring-ring" />
              <div className="flex flex-wrap gap-2">
                <Chip active={!cat} onClick={() => setCat(null)}>{ui.todos}</Chip>
                {cats.map((c) => (
                  <Chip key={c} active={cat === c} onClick={() => setCat(c)}><span className={`h-2.5 w-2.5 rounded-full ${catBg[c]}`} />{ui.categorias[c]}</Chip>
                ))}
              </div>
              <ul className="max-h-72 space-y-1 overflow-auto">
                {visibles.map((l) => (
                  <li key={l.id}>
                    <button onClick={() => { setFocus(null); requestAnimationFrame(() => setFocus(l.id)); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-glass">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${catBg[l.categoria]}`} />{l.nombre}
                    </button>
                  </li>
                ))}
                {!visibles.length && <li className="px-3 text-sm text-muted-foreground">{ui.sinResultados}</li>}
              </ul>
            </div>
            <div className="h-[460px] overflow-hidden rounded-[1.5rem] md:h-[540px]">
              <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
                <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}>
                  <FestMap lugares={visibles} focusId={focus} onPenyaClick={(id) => setSelectedPenya(penyes.find((p) => p.id === id) ?? null)} />
                </Suspense>
              </ClientOnly>
            </div>
          </div>
        </section>

        <section id="programa" className="scroll-mt-24">
          <SectionTitle>{ui.nav.programa}</SectionTitle>
          {!dias.length ? (
            <div className="glass rounded-3xl p-6 text-muted-foreground">{ui.programaPendiente}</div>
          ) : (
            <>
              <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                {dias.map((d) => (
                  <Chip key={d} active={dia === d} onClick={() => setDia(d)}><span className="inline-block first-letter:uppercase">{fmtDia(d)}</span></Chip>
                ))}
              </div>
              <div className="space-y-3">
                {actos.filter((a) => a.dia === dia).map((a) => (
                  <div key={a.id} className="glass flex flex-col gap-3 rounded-3xl p-5 sm:flex-row sm:items-center">
                    <div className="font-display text-3xl font-bold text-primary sm:w-28">{a.hora}</div>
                    <div className="flex-1">
                      <span className={`mb-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase text-on-image ${catBg[a.tipo]}`}>{ui.categorias[a.tipo]}</span>
                      <h3 className="text-xl font-bold">{a.titulo}</h3>
                      <p className="text-sm text-muted-foreground">{a.descripcion}</p>
                    </div>
                    {a.lugarId && <button onClick={() => goMap(a.lugarId)} className="glass-btn px-4 py-2 text-sm font-bold">📍 {ui.verMapa}</button>}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section id="eventos" className="scroll-mt-24">
          <SectionTitle>Eventos</SectionTitle>
          {!eventos.length ? <div className="glass rounded-3xl p-6 text-muted-foreground">Próximamente publicaremos los eventos de las peñas y actividades especiales.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eventos.map((e) => <article key={e.id} className="glass rounded-3xl p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{fmtDia(e.dia)}{e.hora ? " · "+e.hora : ""}</p><h3 className="mt-2 text-2xl font-bold">{e.titulo}</h3>{e.descripcion && <p className="mt-2 text-sm text-muted-foreground">{e.descripcion}</p>}{e.lugar && <p className="mt-3 text-sm">📍 {e.lugar}</p>}{e.penya_id && <p className="mt-2 text-xs font-bold text-primary">{penyes.find(p=>p.id===e.penya_id)?.nombre || "Evento de peña"}</p>}</article>)}
          </div>}
        </section>
        <section id="penyes" className="scroll-mt-24">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-4xl font-bold text-primary sm:text-5xl">{ui.nav.penyes}</h2>
            <button onClick={() => setForm(true)} className="rounded-full bg-pink px-6 py-3 font-bold text-brown transition hover:-translate-y-0.5">+ {ui.addPenya}</button>
          </div>
          {!penyes.length ? (
            <div className="glass rounded-3xl p-6 text-muted-foreground">{ui.sinPenyes}</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {penyes.map((p) => (
                <article key={p.id} className="glass overflow-hidden rounded-3xl">
                  {p.foto && <img src={p.foto} alt={p.nombre} loading="lazy" className="h-44 w-full object-cover" />}
                  <div className="p-6">
                    <h3 className="text-2xl font-bold">{p.nombre}</h3>
                    {p.direccion && <p className="mt-1 text-sm text-muted-foreground">{p.direccion}</p>}
                    <p className="mt-3 text-sm"><strong>Música:</strong> {p.tipo_musica || "Variada"}</p>
                    <p className="mt-1 text-sm"><strong>Visitas:</strong> {p.acepta_visitas ? "Sí, acepta visitas" : "No acepta visitas"}</p>
                    {p.informacion && <p className="mt-2 text-sm text-muted-foreground">{p.informacion}</p>}
                    {eventos.filter(e=>e.penya_id===p.id).map(e=><p key={e.id} className="mt-2 text-sm"><strong>Evento:</strong> {e.titulo} · {fmtDia(e.dia)}</p>)}
                    <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => setSelectedPenya(p)} className="rounded-full bg-pink px-4 py-2 text-sm font-bold text-brown">Ver peña</button><button onClick={() => goMap(p.id)} className="glass-btn px-4 py-2 text-sm font-bold">📍 {ui.verMapa}</button></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="info" className="scroll-mt-24">
          <SectionTitle>{ui.nav.info}</SectionTitle>
          <div className="glass max-w-sm rounded-3xl p-6"><h3 className="text-xl font-bold">{siteContent.info_titulo || ui.emergencias}</h3><p className="mt-2 font-display text-4xl font-bold text-primary">{siteContent.info_telefono || "112"}</p></div>
        </section>
      </main>

      <footer className="pb-10 text-center text-sm text-muted-foreground">{edicion.titulo} · {edicion.anyo}</footer>

      {selectedPenya && (
        <div className="fixed inset-0 z-[1900] flex items-end justify-center bg-brown/70 p-3 sm:items-center" onClick={() => setSelectedPenya(null)}>
          <section role="dialog" aria-modal="true" aria-label={selectedPenya.nombre} onClick={(e) => e.stopPropagation()} className="glass max-h-[92vh] w-full max-w-2xl overflow-auto rounded-[2rem] bg-background">
            {selectedPenya.foto && <img src={selectedPenya.foto} alt={selectedPenya.nombre} className="h-56 w-full object-cover sm:h-72" />}
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Peña participante</p><h2 className="mt-1 text-3xl font-bold text-primary sm:text-4xl">{selectedPenya.nombre}</h2></div><button onClick={() => setSelectedPenya(null)} aria-label="Cerrar" className="glass-btn h-10 w-10 shrink-0 rounded-full">✕</button></div>
              {selectedPenya.direccion && <p className="mt-3 text-sm">📍 {selectedPenya.direccion}</p>}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-glass p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Música</p><p className="mt-1 font-semibold">{selectedPenya.tipo_musica || "Variada"}</p></div>
                <div className="rounded-2xl bg-glass p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Visitas</p><p className="mt-1 font-semibold">{selectedPenya.acepta_visitas ? "Sí, acepta visitas" : "No acepta visitas"}</p></div>
              </div>
              {selectedPenya.informacion && <div className="mt-5"><h3 className="font-bold">Sobre la peña</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{selectedPenya.informacion}</p></div>}
              <div className="mt-6"><h3 className="text-xl font-bold">Eventos y actividades</h3>
                {eventos.filter((e) => e.penya_id === selectedPenya.id).length ? <div className="mt-3 space-y-3">{eventos.filter((e) => e.penya_id === selectedPenya.id).map((e) => <article key={e.id} className="rounded-2xl bg-glass p-4"><p className="text-xs font-bold uppercase text-muted-foreground">{fmtDia(e.dia)}{e.hora ? " · " + e.hora : ""}</p><h4 className="mt-1 font-bold">{e.titulo}</h4>{e.descripcion && <p className="mt-1 text-sm text-muted-foreground">{e.descripcion}</p>}{e.lugar && <p className="mt-2 text-sm">📍 {e.lugar}</p>}</article>)}</div> : <p className="mt-2 text-sm text-muted-foreground">Esta peña todavía no tiene eventos publicados.</p>}
              </div>
              <button onClick={() => { const id = selectedPenya.id; setSelectedPenya(null); goMap(id); }} className="mt-6 rounded-full bg-pink px-5 py-3 text-sm font-bold text-brown">📍 Ver ubicación en el mapa</button>
            </div>
          </section>
        </div>
      )}

      {form && (
        <ClientOnly>
          <Suspense fallback={null}>
            <AddPenyaForm onClose={() => setForm(false)} onSaved={() => { setForm(false); cargar(); }} />
          </Suspense>
        </ClientOnly>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-8 text-4xl font-bold text-primary sm:text-5xl">{children}</h2>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "glass-btn"}`}>
      {children}
    </button>
  );
}
