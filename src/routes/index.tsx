import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import hero from "@/assets/hero-fiestas.jpg";
import { actos, edicion, lugares, penyes, ui, type Categoria } from "@/content/fiestas";
import { LangProvider, useLang } from "@/lib/i18n";

const FestMap = lazy(() => import("@/components/FestMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fiestas de l'Alfàs del Pi · Programa, mapa y peñas" },
      { name: "description", content: "Programa, mapa interactivo, agenda y peñas de las fiestas de l'Alfàs del Pi." },
      { property: "og:title", content: "Fiestas de l'Alfàs del Pi" },
      { property: "og:description", content: "Programa, mapa interactivo, agenda y peñas de las fiestas." },
    ],
  }),
  component: () => (
    <LangProvider>
      <Home />
    </LangProvider>
  ),
});

const cats: Categoria[] = ["penya", "actuacion", "evento", "recinto", "servicio"];
const catBg: Record<Categoria, string> = {
  penya: "bg-cat-penya", actuacion: "bg-cat-actuacion", evento: "bg-cat-evento", recinto: "bg-cat-recinto", servicio: "bg-cat-servicio",
};

function fmtDia(d: string, lang: string) {
  return new Date(d + "T12:00:00").toLocaleDateString(lang === "va" ? "ca-ES" : "es-ES", { weekday: "long", day: "numeric", month: "long" });
}

function Home() {
  const { t, lang, setLang } = useLang();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Categoria | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const dias = useMemo(() => [...new Set(actos.map((a) => a.dia))].sort(), []);
  const [dia, setDia] = useState(dias[0]);

  const visibles = lugares.filter(
    (l) => (!cat || l.categoria === cat) && t(l.nombre).toLowerCase().includes(q.toLowerCase()),
  );

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
      {/* Nav */}
      <header className="fixed inset-x-0 top-4 z-[1000] flex justify-center px-4">
        <nav className="glass flex items-center gap-1 rounded-full p-1.5 text-sm">
          {(Object.keys(ui.nav) as (keyof typeof ui.nav)[]).map((k) => (
            <a key={k} href={`#${k}`} className="hidden rounded-full px-3 py-1.5 hover:bg-glass sm:block">{t(ui.nav[k])}</a>
          ))}
          <div className="flex rounded-full bg-muted/60 p-0.5">
            {(["es", "va"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`rounded-full px-3 py-1 font-bold uppercase ${lang === l ? "bg-primary text-primary-foreground" : ""}`}>{l}</button>
            ))}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[92vh] items-end overflow-hidden">
        <img src={hero} alt="" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brown/90 via-brown/20 to-transparent" />
        <div className="relative mx-auto w-full max-w-6xl px-5 pb-16">
          {edicion.ejemplo && <span className="glass-dark mb-4 inline-block rounded-full px-3 py-1 text-xs">{t(ui.ejemplo)}</span>}
          <h1 className="rise text-5xl font-bold leading-[0.95] text-on-image sm:text-7xl md:text-8xl">{t(edicion.titulo)} <span className="text-pink">{edicion.anyo}</span></h1>
          <p className="rise mt-4 max-w-xl text-lg text-on-image/85">{t(edicion.subtitulo)}</p>
          <div className="rise mt-8 flex flex-wrap gap-3">
            <div className="glass-dark rounded-2xl px-5 py-3 text-sm first-letter:uppercase">{fmtDia(edicion.fechaInicio, lang)} → {fmtDia(edicion.fechaFin, lang)}</div>
            <a href="#programa" className="rounded-full bg-pink px-6 py-3 font-bold text-brown transition hover:-translate-y-0.5">{t(ui.nav.programa)}</a>
            <a href="#mapa" className="glass-dark rounded-full px-6 py-3 font-bold">{t(ui.nav.mapa)}</a>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-24 px-5 py-20">
        {/* Mapa */}
        <section id="mapa" className="scroll-mt-24">
          <SectionTitle>{t(ui.nav.mapa)}</SectionTitle>
          <div className="glass grid gap-4 rounded-[2rem] p-3 md:grid-cols-[280px_1fr]">
            <div className="space-y-3 p-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(ui.buscar)} className="w-full rounded-full border border-input bg-glass px-4 py-2.5 outline-none focus:ring-2 focus:ring-ring" />
              <div className="flex flex-wrap gap-2">
                <Chip active={!cat} onClick={() => setCat(null)}>{t(ui.todos)}</Chip>
                {cats.map((c) => (
                  <Chip key={c} active={cat === c} onClick={() => setCat(c)}><span className={`h-2.5 w-2.5 rounded-full ${catBg[c]}`} />{t(ui.categorias[c])}</Chip>
                ))}
              </div>
              <ul className="max-h-72 space-y-1 overflow-auto">
                {visibles.map((l) => (
                  <li key={l.id}>
                    <button onClick={() => { setFocus(null); requestAnimationFrame(() => setFocus(l.id)); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-glass">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${catBg[l.categoria]}`} />{t(l.nombre)}
                    </button>
                  </li>
                ))}
                {!visibles.length && <li className="px-3 text-sm text-muted-foreground">{t(ui.sinResultados)}</li>}
              </ul>
            </div>
            <div className="h-[460px] overflow-hidden rounded-[1.5rem] md:h-[540px]">
              <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
                <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}>
                  <FestMap lugares={visibles} focusId={focus} />
                </Suspense>
              </ClientOnly>
            </div>
          </div>
        </section>

        {/* Programa */}
        <section id="programa" className="scroll-mt-24">
          <SectionTitle>{t(ui.nav.programa)}</SectionTitle>
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {dias.map((d) => (
              <Chip key={d} active={dia === d} onClick={() => setDia(d)}><span className="inline-block first-letter:uppercase">{fmtDia(d, lang)}</span></Chip>
            ))}
          </div>
          <div className="space-y-3">
            {actos.filter((a) => a.dia === dia).map((a) => (
              <div key={a.id} className="glass flex flex-col gap-3 rounded-3xl p-5 sm:flex-row sm:items-center">
                <div className="font-display text-3xl font-bold text-primary sm:w-28">{a.hora}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{t(a.titulo)}</h3>
                  <p className="text-sm text-muted-foreground">{t(a.descripcion)}</p>
                </div>
                {a.lugarId && <button onClick={() => goMap(a.lugarId)} className="glass-btn px-4 py-2 text-sm font-bold">📍 {t(ui.verMapa)}</button>}
              </div>
            ))}
          </div>
        </section>

        {/* Agenda */}
        <section id="agenda" className="scroll-mt-24">
          <SectionTitle>{t(ui.nav.agenda)}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {actos.map((a) => (
              <article key={a.id} className="glass group rounded-3xl p-6 transition hover:-translate-y-1">
                <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wide">
                  <span className={`rounded-full px-3 py-1 text-on-image ${catBg[a.tipo]}`}>{t(ui.categorias[a.tipo])}</span>
                  <span className="first-letter:uppercase text-muted-foreground">{fmtDia(a.dia, lang)} · {a.hora}</span>
                </div>
                <h3 className="text-2xl font-bold">{t(a.titulo)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(a.descripcion)}</p>
                {a.lugarId && <button onClick={() => goMap(a.lugarId)} className="mt-4 text-sm font-bold text-primary underline-offset-4 hover:underline">📍 {t(ui.verMapa)}</button>}
              </article>
            ))}
          </div>
        </section>

        {/* Peñas */}
        <section id="penyes" className="scroll-mt-24">
          <SectionTitle>{t(ui.nav.penyes)}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {penyes.map((p) => (
              <article key={p.id} className="glass rounded-3xl p-6">
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-pink font-display text-2xl font-bold text-brown">{p.nombre.split(" ").pop()?.[0]}</div>
                <h3 className="text-2xl font-bold">{p.nombre}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(p.descripcion)}</p>
                {p.lugarId && <button onClick={() => goMap(p.lugarId)} className="glass-btn mt-4 px-4 py-2 text-sm font-bold">📍 {t(ui.verMapa)}</button>}
              </article>
            ))}
          </div>
        </section>

        {/* Info */}
        <section id="info" className="scroll-mt-24">
          <SectionTitle>{t(ui.nav.info)}</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass rounded-3xl p-6 md:col-span-1"><p className="text-muted-foreground">{t(ui.infoTexto)}</p></div>
            <div className="glass rounded-3xl p-6"><h3 className="text-xl font-bold">{t(ui.emergencias)}</h3><p className="mt-2 font-display text-4xl font-bold text-primary">112</p></div>
            <div className="glass rounded-3xl p-6"><h3 className="text-xl font-bold">{t(ui.contacto)}</h3><p className="mt-2 text-muted-foreground">{t(ui.pendiente)}</p></div>
          </div>
        </section>
      </main>

      <footer className="pb-10 text-center text-sm text-muted-foreground">{t(edicion.titulo)} · {edicion.anyo}</footer>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-8 text-4xl font-bold text-primary sm:text-5xl">{children}</h2>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "glass-btn"}`}>
      {children}
    </button>
  );
}
