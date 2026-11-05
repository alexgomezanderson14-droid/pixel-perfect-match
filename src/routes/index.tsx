import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import hero from "@/assets/hero-fiestas.jpg";
import { edicion, lugares as lugaresFijos, ui, type Categoria, type Lugar } from "@/content/fiestas";
import { programaOficial2026 } from "@/content/programa-oficial-2026";
import { supabase } from "@/integrations/supabase/client";

const FestMap = lazy(() => import("@/components/FestMap"));
const AddPenyaForm = lazy(() => import("@/components/AddPenyaForm"));
const AddPenyaEventForm = lazy(() => import("@/components/AddPenyaEventForm"));

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

function eventoSigueActivo(item: { dia?: string; hora?: string }, now = Date.now()) {
  if (!item.dia) return true;
  const hora = String(item.hora || "").match(/(?:^|\D)([01]\d|2[0-3]):([0-5]\d)/);
  const fechaLimite = new Date(`${String(item.dia).slice(0, 10)}T${hora ? hora[1] + ":" + hora[2] : "23:59"}:00`).getTime();
  return Number.isNaN(fechaLimite) || fechaLimite >= now;
}

function instagramUrl(value?: string | null) {
  if (!value?.trim()) return null;
  const raw = value.trim().replace(/^@/, "");
  return raw.startsWith("http") ? raw : "https://www.instagram.com/" + raw;
}

async function shareWebsite() {
  const url = window.location.href;
  const title = "Fiestas de l'Alfàs del Pi 2026";
  const text = "Consulta el programa, el mapa y las peñas de las fiestas.";
  try {
    await navigator.clipboard.writeText(url);
    localStorage.setItem("fiestas-share-reminder-last", String(Date.now()));
    window.alert("Enlace de la web copiado. ¡Ya puedes compartirlo!");
    return;
  } catch {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        localStorage.setItem("fiestas-share-reminder-last", String(Date.now()));
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    window.prompt("Copia el enlace de la web:", url);
  }
}

async function sharePenyaCard(p: PenyaDb) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1350;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("No se pudo crear la imagen.");
  c.fillStyle = "#f4eee5"; c.fillRect(0, 0, 1080, 1350);
  c.fillStyle = "#49352f"; c.fillRect(0, 0, 1080, 270);
  c.fillStyle = "#e6b6c7"; c.font = "bold 30px Arial"; c.fillText("FIESTAS L'ALFÀS DEL PI · 2026", 76, 92);
  c.fillStyle = "#ffffff"; c.font = "bold 66px Arial";
  const words = p.nombre.split(" "); let line = ""; let y = 190;
  for (const word of words) { const test = line ? line + " " + word : word; if (c.measureText(test).width > 900) { c.fillText(line, 76, y); line = word; y += 78; } else line = test; }
  if (line) c.fillText(line, 76, y);
  let mapDrawn = false;
  try {
    const mapUrl = "https://staticmap.openstreetmap.de/staticmap.php?center=" + p.lat + "," + p.lng + "&zoom=16&size=960x650&markers=" + p.lat + "," + p.lng + ",red-pushpin";
    const response = await fetch(mapUrl);
    if (!response.ok) throw new Error("No se pudo cargar el mapa.");
    const mapBlob = await response.blob();
    const mapObjectUrl = URL.createObjectURL(mapBlob);
    const mapImage = new Image();
    await new Promise<void>((resolve, reject) => { mapImage.onload = () => resolve(); mapImage.onerror = () => reject(new Error("Mapa no disponible.")); mapImage.src = mapObjectUrl; });
    c.drawImage(mapImage, 60, 330, 960, 650);
    URL.revokeObjectURL(mapObjectUrl);
    mapDrawn = true;
  } catch { mapDrawn = false; }
  if (!mapDrawn) {
    c.fillStyle = "#d9e3d8"; c.fillRect(60, 330, 960, 650);
    c.strokeStyle = "#ffffff"; c.lineWidth = 28; c.lineCap = "round";
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(90, 410 + i * 115); c.bezierCurveTo(360, 330 + i * 110, 620, 620 + i * 70, 990, 390 + i * 100); c.stroke(); }
    c.strokeStyle = "#c5d0c3"; c.lineWidth = 5;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(110 + i * 240, 350); c.lineTo(160 + i * 210, 950); c.stroke(); }
    c.fillStyle = "#b45c79"; c.beginPath(); c.arc(540, 650, 44, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#49352f"; c.font = "bold 30px Arial"; c.fillText("UBICACIÓN EN EL MAPA", 340, 840);
  }
  c.font = "bold 36px Arial"; c.fillText("EN L'ALFÀS DEL PI", 76, 1060);
  c.font = "30px Arial"; c.fillStyle = "#655650";
  c.fillText((p.direccion || "Consulta nuestra ubicación en el mapa de las fiestas").slice(0, 48), 76, 1115);
  c.fillStyle = "#49352f"; c.fillRect(60, 1180, 960, 2);
  c.font = "bold 28px Arial"; c.fillText("DESCUBRE LAS PEÑAS · PROGRAMA · MAPA", 76, 1245);
  c.font = "24px Arial"; c.fillStyle = "#806e65"; c.fillText(window.location.host, 76, 1295);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("No se pudo generar el PNG.")), "image/png"));
  const file = new File([blob], "penya-" + p.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".png", { type: "image/png" });
  const url = window.location.origin + "/#penya-" + p.id;
  if (navigator.canShare?.({ files: [file] }) && navigator.share) await navigator.share({ files: [file], title: p.nombre, text: "Conoce " + p.nombre + " en las fiestas de l'Alfàs del Pi: " + url });
  else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); URL.revokeObjectURL(a.href); await navigator.clipboard?.writeText(url); window.alert("Imagen descargada y enlace de la peña copiado."); }
}


type PenyaDb = { id: string; nombre: string; direccion: string | null; lat: number; lng: number; foto: string; tipo_musica: string; tiene_evento?: boolean; informacion: string; instagram?: string | null; email?: string | null };

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
  const [shareReminder, setShareReminder] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [selectedPenya, setSelectedPenya] = useState<PenyaDb | null>(null);
  const [eventFormPenya, setEventFormPenya] = useState<PenyaDb | null>(null);
  const dias = useMemo(() => [...new Set(actos.map((a) => a.dia))].sort(), [actos]);
  const [dia, setDia] = useState<string | undefined>();
  const eventosActivos = useMemo(() => eventos.filter((e) => eventoSigueActivo(e, now)), [eventos, now]);
  useEffect(() => { if (dias.length && !dia) setDia(dias[0]); }, [dias, dia]);
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(tick);
  }, []);
  useEffect(() => {
    const key = "fiestas-share-reminder-last";
    const shouldShow = () => {
      const last = Number(localStorage.getItem(key) || 0);
      if (Date.now() - last >= 30 * 60 * 1000) setShareReminder(true);
    };
    const first = window.setTimeout(shouldShow, 90_000);
    const repeat = window.setInterval(shouldShow, 5 * 60 * 1000);
    return () => { window.clearTimeout(first); window.clearInterval(repeat); };
  }, []);

  const cargar = useCallback(async () => {
    const [penyaResult, { data: actosData }, { data: eventosData }, { data: contentData }] = await Promise.all([
      supabase.from("penyes").select("id,nombre,direccion,lat,lng,foto_url,tipo_musica,tiene_evento,informacion,instagram").eq("estado","aprobada").order("nombre"),
      supabase.from("actos").select("*").eq("publicado",true).order("dia").order("hora"),
      supabase.from("eventos").select("*").eq("publicado",true).order("dia").order("hora"),
      supabase.from("site_content").select("clave,valor"),
    ]);
    let data: any[] | null = penyaResult.data as any[] | null;
    if (penyaResult.error) {
      const legacyPenyes = await supabase.from("penyes").select("id,nombre,direccion,lat,lng,foto_url,tipo_musica,tiene_evento,informacion").eq("estado","aprobada").order("nombre");
      data = legacyPenyes.data?.map((p) => ({ ...p, instagram: "" })) ?? null;
    }
    const filas = actosData ?? [];
    // El programa oficial del PDF es la fuente principal. La base de datos aporta
    // identificadores y actos añadidos, pero no debe sobrescribir el contenido oficial.
    const oficiales = programaOficial2026.map((oficial) => {
      const fila = filas.find((item) => item.dia === oficial.dia && item.hora === oficial.hora && item.titulo === oficial.titulo);
      return fila ? { ...fila, ...oficial, id: fila.id } : oficial;
    });
    const extras = filas.filter((fila) => !/autobús lanzadera/i.test(fila.titulo || "") && !programaOficial2026.some((oficial) => fila.dia === oficial.dia && fila.hora === oficial.hora && fila.titulo === oficial.titulo));
    setActos([...oficiales, ...extras]);
    setEventos(eventosData ?? []);
    const content = Object.fromEntries((contentData ?? []).map((x:any)=>[x.clave,x.valor]));
    setSiteContent(content);
    if (content.hero_image_path) {
      const { data: imageData } = supabase.storage.from("penyes").getPublicUrl(content.hero_image_path);
      setHeroImage(imageData.publicUrl);
    } else {
      setHeroImage("");
    }
    if (!data) return;
    const urls = data.map((p) => supabase.storage.from("penyes").getPublicUrl(p.foto_url).data.publicUrl);
    setPenyes(data.map((p, i) => ({ ...p, foto: urls[i] ?? "" })));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const todos: Lugar[] = useMemo(() => [
    ...lugaresFijos,
    ...penyes.map((p) => ({ id: p.id, categoria: "penya" as const, nombre: p.nombre, descripcion: p.direccion ?? "", lat: p.lat, lng: p.lng, foto: p.foto })),
    ...actos.filter((a) => a.lat != null && a.lng != null).map((a) => ({ id: "acto-" + a.id, categoria: a.tipo as Categoria, nombre: a.titulo, descripcion: a.lugar || a.descripcion || "", lat: Number(a.lat), lng: Number(a.lng) })),
    ...eventosActivos.filter((e) => e.lat != null && e.lng != null).map((e) => ({ id: "evento-" + e.id, categoria: "evento" as const, nombre: e.titulo, descripcion: e.lugar || e.descripcion || "", lat: Number(e.lat), lng: Number(e.lng) })),
  ], [penyes, actos, eventosActivos]);

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
    <div className="page-bg min-h-screen" style={{ "--pink": siteContent.theme_accent || "oklch(0.76 0.08 355)", "--secondary": siteContent.theme_accent || "oklch(0.76 0.08 355)", "--accent": siteContent.theme_accent || "oklch(0.76 0.08 355)", "--ring": siteContent.theme_accent || "oklch(0.76 0.08 355)", "--cat-penya": siteContent.theme_accent || "oklch(0.76 0.08 355)", "--background": siteContent.theme_background || "oklch(0.95 0.015 75)", "--gradient-page": `linear-gradient(180deg, ${siteContent.theme_background || "oklch(0.96 0.015 70)"}, ${siteContent.theme_background || "oklch(0.93 0.02 60)"})` } as React.CSSProperties}>
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
            <button onClick={() => void shareWebsite()} className="glass-dark rounded-full px-6 py-3 font-bold">↗ Compartir web</button>
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
                {[...actos.filter((a) => a.dia === dia)].sort((a, b) => {
                  const minutes = (h: string) => { const match = (h || "00:00").match(/^(\d{1,2}):(\d{2})/); if (!match) return 0; const value = Number(match[1]) * 60 + Number(match[2]); return value < 5 * 60 ? value + 24 * 60 : value; };
                  return minutes(a.hora) - minutes(b.hora);
                }).map((a) => {
                  const title = String(a.titulo || "").toLocaleLowerCase("es");
                  const festaCarrer = /tardeo|mañaneo|mananeo|nocheo/.test(title);
                  const esActuacion = !festaCarrer && a.tipo === "actuacion";
                  const etiqueta = festaCarrer ? "Festa al carrer" : esActuacion ? "Actuación" :
                    /albaes|maleta|despertà|desperta|pasacalles|visita de los mayorales/.test(title) ? "Tradición" :
                    /misa|trisagio|jubileo|santísimo|procesión|ofrenda/.test(title) ? "Acto religioso" :
                    /infantil|niño|niños|familiar|chocolatada/.test(title) ? "Actividad familiar" :
                    /autobús|bus lanzadera/.test(title) ? "Transporte" : "Actividad";
                  return <article key={a.id} className="glass flex flex-col gap-3 rounded-3xl p-5 sm:flex-row sm:items-center">
                    <div className="font-display text-3xl font-bold text-primary sm:w-28">{a.hora || "—"}</div>
                    <div className="flex-1">
                      <span className={`mb-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase text-on-image ${esActuacion ? catBg.actuacion : festaCarrer ? "bg-pink" : catBg.evento}`}>{etiqueta}</span>
                      <h4 className="text-xl font-bold">{a.titulo}</h4>
                      {a.descripcion && <p className="mt-1 text-sm text-muted-foreground">{a.descripcion}</p>}
                      {a.lugar && <p className="mt-2 text-sm text-muted-foreground">📍 {a.lugar}</p>}
                    </div>
                    {a.lat != null && a.lng != null ? <button onClick={() => goMap("acto-" + a.id)} className="glass-btn px-4 py-2 text-sm font-bold">Ver en el mapa</button> : null}
                  </article>;
                })}
                {!actos.some((a) => a.dia === dia) && <p className="glass rounded-2xl p-5 text-muted-foreground">No hay actos publicados para este día.</p>}
              </div>
            </>
          )}
        </section>

        <section id="eventos" className="scroll-mt-24">
          <SectionTitle>Eventos</SectionTitle>
          <div className="mb-6 space-y-2">
            <h3 className="text-2xl font-bold text-primary">Actuaciones y festes al carrer</h3>
            <p className="text-sm text-muted-foreground">Pulsa en cada evento para consultar su descripción, fecha y lugar.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {actos.filter((a) => {
              if (!eventoSigueActivo(a, now)) return false;
              const t = String(a.titulo || "").toLocaleLowerCase("es");
              const excluido = /despertà|desperta|despertada|nit de albaes|nit d'albaes|nit de les albaes|albaes/.test(t);
              return !excluido && (a.tipo === "actuacion" || /tardeo|mañaneo|mananeo|nocheo/.test(t));
            }).sort((a,b) => a.dia.localeCompare(b.dia) || (a.hora || "").localeCompare(b.hora || "")).map((a) => {
              const t = String(a.titulo || "").toLocaleLowerCase("es");
              const festaCarrer = /tardeo|mañaneo|mananeo|nocheo/.test(t);
              const portada = a.imagen_url || a.imagen || a.foto_url || a.foto || "";
              return <details key={a.id} className="glass group min-w-0 overflow-hidden rounded-3xl border border-border/60 shadow-sm">
                <summary className="cursor-pointer list-none">
                  <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-[#f4e8e9] via-[#ead9df] to-[#e9e3d7]">
                    {portada ? <img src={portada} alt={a.titulo} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"/> : <div className="absolute inset-0 flex items-center justify-center p-5 text-center"><span className="font-display text-3xl font-bold leading-tight text-[#765563]">{a.titulo}</span></div>}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#49352f]/80 to-transparent p-4 pt-14">
                      <span className="mb-2 inline-block rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#765563]">{festaCarrer ? "Festa al carrer" : "Actuación"}</span>
                      <h3 className="line-clamp-2 text-lg font-bold leading-tight text-white sm:text-xl">{a.titulo}</h3>
                      <p className="mt-2 text-xs font-semibold text-white/90">Ver detalles <span className="inline-block transition group-open:rotate-180">⌄</span></p>
                    </div>
                  </div>
                </summary>
                <div className="space-y-3 border-t border-border/50 p-4">
                  {a.descripcion && <p className="text-sm leading-relaxed text-muted-foreground">{a.descripcion}</p>}
                  <p className="text-sm"><strong>Fecha:</strong> {fmtDia(a.dia)}{a.hora ? " · " + a.hora : ""}</p>
                  {a.lugar && <p className="text-sm"><strong>Lugar:</strong> {a.lugar}</p>}
                  {a.lat != null && a.lng != null && <button onClick={() => goMap("acto-" + a.id)} className="glass-btn px-4 py-2 text-sm font-bold">Ver en el mapa de la web</button>}
                </div>
              </details>;
            })}
          </div>
          <div className="mt-10 space-y-3">
            <h3 className="text-2xl font-bold text-primary">Otros eventos de las peñas</h3>
            {!eventosActivos.length ? <div className="glass rounded-3xl p-6 text-muted-foreground">Todavía no hay eventos de peñas publicados.</div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{eventosActivos.map((e) => <details key={e.id} className="glass group min-w-0 overflow-hidden rounded-3xl border border-border/60 shadow-sm"><summary className="cursor-pointer list-none"><div className="relative aspect-square overflow-hidden bg-gradient-to-br from-[#f4e8e9] via-[#ead9df] to-[#e9e3d7]">{(e.imagen_url || e.imagen || e.foto_url || e.foto) ? <img src={e.imagen_url || e.imagen || e.foto_url || e.foto} alt={e.titulo} loading="lazy" className="absolute inset-0 h-full w-full object-cover"/> : <div className="absolute inset-0 flex items-center justify-center p-5 text-center"><span className="font-display text-3xl font-bold text-[#765563]">{e.titulo}</span></div>}<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#49352f]/80 to-transparent p-4 pt-14"><h3 className="text-xl font-bold text-white">{e.titulo}</h3><p className="mt-2 text-xs font-semibold text-white/90">Ver detalles <span className="inline-block transition group-open:rotate-180">⌄</span></p></div></div></summary><div className="space-y-3 border-t border-border/50 p-4">{e.descripcion && <p className="text-sm leading-relaxed text-muted-foreground">{e.descripcion}</p>}<p className="text-sm"><strong>Fecha:</strong> {fmtDia(e.dia)}{e.hora ? " · " + e.hora : ""}</p>{e.lugar && <p className="text-sm"><strong>Lugar:</strong> {e.lugar}</p>}{e.penya_id && <p className="text-xs font-bold text-primary">{penyes.find(p=>p.id===e.penya_id)?.nombre || "Evento de peña"}</p>}{e.lat != null && e.lng != null && <button onClick={() => goMap("evento-" + e.id)} className="glass-btn px-4 py-2 text-sm font-bold">Ver ubicación en el mapa</button>}</div></details>)}</div>}
          </div>
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
                <article id={"penya-" + p.id} key={p.id} className="glass overflow-hidden rounded-3xl">
                  {p.foto && <img src={p.foto} alt={p.nombre} loading="lazy" className="h-44 w-full object-cover" />}
                  <div className="p-6">
                    <h3 className="text-2xl font-bold">{p.nombre}</h3>
                    {p.direccion && <p className="mt-1 text-sm text-muted-foreground">{p.direccion}</p>}
                    <p className="mt-3 text-sm"><strong>Música:</strong> {p.tipo_musica || "Variada"}</p>
                    {p.informacion && <p className="mt-2 text-sm text-muted-foreground">{p.informacion}</p>}
                    {eventosActivos.filter(e=>e.penya_id===p.id).map(e=><p key={e.id} className="mt-2 text-sm"><strong>Evento:</strong> {e.titulo} · {fmtDia(e.dia)}</p>)}
                    <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => setSelectedPenya(p)} className="rounded-full bg-pink px-4 py-2 text-sm font-bold text-brown">Ver peña</button><button onClick={() => goMap(p.id)} className="glass-btn px-4 py-2 text-sm font-bold">📍 {ui.verMapa}</button><button onClick={() => void sharePenyaCard(p)} className="glass-btn px-4 py-2 text-sm font-bold">↗ Compartir peña</button><button onClick={() => setEventFormPenya(p)} className="glass-btn px-4 py-2 text-sm font-bold">{p.tiene_evento ? "Añadir otro evento" : "+ Añadir evento"}</button></div>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">{instagramUrl(p.instagram) && <a className="font-semibold text-primary underline" href={instagramUrl(p.instagram)!} target="_blank" rel="noreferrer">↗ Instagram</a>}</div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="info" className="scroll-mt-24">
          <SectionTitle>{ui.nav.info}</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass rounded-3xl p-6"><h3 className="text-xl font-bold">{siteContent.info_titulo || ui.emergencias}</h3><p className="mt-2 font-display text-4xl font-bold text-primary">{siteContent.info_telefono || "112"}</p></div>
            <article className="glass rounded-3xl p-6 md:col-span-2">
              <div className="mb-3 flex items-center gap-3"><span className="text-3xl">🚌</span><div><h3 className="text-2xl font-bold text-primary">Autobús lanzadera</h3><p className="text-sm text-muted-foreground">Información práctica de transporte durante las fiestas</p></div></div>
              <p className="font-semibold">Del 6 al 9 de noviembre · de 01:00 a 04:00 h</p>
              <p className="mt-2 text-sm">Salidas cada hora desde el parking de La Bolleta (frente a Gaudí).</p>
              <p className="mt-2 text-sm"><strong>Paradas:</strong> Parque Escandinavia, San Rafael, Tossalet, avenida Sant Pere (Albir Garden) y Consum Albir.</p>
              <p className="mt-2 text-sm">El recorrido de regreso finaliza en el parking de La Bolleta.</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="space-y-4 px-5 pb-10 text-center text-sm text-muted-foreground">
        <p>{edicion.titulo} · {edicion.anyo}</p>
        <button onClick={() => void shareWebsite()} className="glass-btn rounded-full px-6 py-3 font-bold text-primary">↗ Compartir la web</button>
      </footer>
      {shareReminder && <aside role="status" className="fixed inset-x-4 bottom-4 z-[1800] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-border bg-background p-4 shadow-2xl">
        <div className="min-w-0 flex-1"><p className="font-bold text-primary">¿Compartimos las fiestas?</p><p className="text-sm text-muted-foreground">Pasa la web a tus amigos para que nadie se pierda el programa ni los eventos.</p></div>
        <button onClick={() => { setShareReminder(false); localStorage.setItem("fiestas-share-reminder-last", String(Date.now())); }} className="shrink-0 rounded-full px-3 py-2 text-sm">Ahora no</button>
        <button onClick={() => { setShareReminder(false); void shareWebsite(); }} className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Compartir</button>
      </aside>}

      {selectedPenya && (
        <div className="fixed inset-0 z-[1900] flex items-end justify-center bg-brown/70 p-3 sm:items-center" onClick={() => setSelectedPenya(null)}>
          <section role="dialog" aria-modal="true" aria-label={selectedPenya.nombre} onClick={(e) => e.stopPropagation()} className="glass max-h-[92vh] w-full max-w-2xl overflow-auto rounded-[2rem] bg-background">
            {selectedPenya.foto && <img src={selectedPenya.foto} alt={selectedPenya.nombre} className="h-56 w-full object-cover sm:h-72" />}
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Peña participante</p><h2 className="mt-1 text-3xl font-bold text-primary sm:text-4xl">{selectedPenya.nombre}</h2></div><button onClick={() => setSelectedPenya(null)} aria-label="Cerrar" className="glass-btn h-10 w-10 shrink-0 rounded-full">✕</button></div>
              {selectedPenya.direccion && <p className="mt-3 text-sm">📍 {selectedPenya.direccion}</p>}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-glass p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Música</p><p className="mt-1 font-semibold">{selectedPenya.tipo_musica || "Variada"}</p></div>
              </div>
              {selectedPenya.informacion && <div className="mt-5"><h3 className="font-bold">Sobre la peña</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{selectedPenya.informacion}</p></div>}
              <div className="mt-6"><h3 className="text-xl font-bold">Eventos y actividades</h3>
                {eventosActivos.filter((e) => e.penya_id === selectedPenya.id).length ? <div className="mt-3 space-y-3">{eventosActivos.filter((e) => e.penya_id === selectedPenya.id).map((e) => <article key={e.id} className="rounded-2xl bg-glass p-4"><p className="text-xs font-bold uppercase text-muted-foreground">{fmtDia(e.dia)}{e.hora ? " · " + e.hora : ""}</p><h4 className="mt-1 font-bold">{e.titulo}</h4>{e.descripcion && <p className="mt-1 text-sm text-muted-foreground">{e.descripcion}</p>}{e.lugar && <p className="mt-2 text-sm">📍 {e.lugar}</p>}</article>)}</div> : <p className="mt-2 text-sm text-muted-foreground">Esta peña todavía no tiene eventos publicados.</p>}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">{instagramUrl(selectedPenya.instagram) && <a className="glass-btn rounded-full px-4 py-2 text-sm font-bold" href={instagramUrl(selectedPenya.instagram)!} target="_blank" rel="noreferrer">Instagram</a>}<button onClick={() => void sharePenyaCard(selectedPenya)} className="glass-btn rounded-full px-4 py-2 text-sm font-bold">↗ Compartir ficha</button><button onClick={() => setEventFormPenya(selectedPenya)} className="glass-btn rounded-full px-4 py-2 text-sm font-bold">{selectedPenya.tiene_evento ? "Añadir otro evento" : "+ Añadir evento"}</button><button onClick={() => { const id = selectedPenya.id; setSelectedPenya(null); goMap(id); }} className="rounded-full bg-pink px-5 py-3 text-sm font-bold text-brown">📍 Ver ubicación en el mapa</button></div>
            </div>
          </section>
        </div>
      )}

      {eventFormPenya && (
        <ClientOnly><Suspense fallback={null}><AddPenyaEventForm penyaId={eventFormPenya.id} penyaName={eventFormPenya.nombre} onClose={() => setEventFormPenya(null)} onSaved={(organizaEvento) => { setEventFormPenya(null); void cargar(); window.alert(organizaEvento ? "¡Evento enviado! Aparecerá en la web cuando sea aprobado." : "Se ha guardado que esta peña no organiza ningún evento."); }} /></Suspense></ClientOnly>
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
