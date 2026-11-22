import { Link } from "@tanstack/react-router";
import CopyrightFooter from "@/components/CopyrightFooter";

type SeoLandingPageProps = {
  path: "/penyes" | "/programa-fiestas" | "/eventos";\n  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  sections: { title: string; text: string }[];
  links: { label: string; to: "/penyes" | "/programa-fiestas" | "/eventos" | "/noticias" }[];
};

export default function SeoLandingPage({ path, eyebrow, title, description, intro, sections, links }: SeoLandingPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-card/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="text-lg font-extrabold tracking-tight text-primary">PENYERA</Link>
          <Link to="/" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Entrar en PENYERA</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <nav aria-label="Migas de pan" className="mb-7 text-sm text-muted-foreground">
          <Link to="/" className="underline underline-offset-4">Inicio</Link><span aria-hidden="true"> / </span><span>{title}</span>
        </nav>
        <section className="rounded-[2rem] border border-primary/10 bg-gradient-to-br from-primary/[0.08] via-card to-card p-6 shadow-sm sm:p-10">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-primary">{eyebrow}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-extrabold leading-tight text-primary sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl">{description}</p>
          <Link to="/" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-extrabold text-primary-foreground shadow-sm transition hover:opacity-90">Entrar en PENYERA <span aria-hidden="true" className="ml-2">→</span></Link>
        </section>
        <section className="mt-9 max-w-4xl">
          <h2 className="text-2xl font-extrabold text-primary sm:text-3xl">{intro}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {sections.map((section) => <article key={section.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-lg font-bold text-primary">{section.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{section.text}</p>
            </article>)}
          </div>
        </section>
        <nav aria-label="Otras secciones de PENYERA" className="mt-10 rounded-3xl border border-border bg-card p-5 sm:p-7">
          <h2 className="text-xl font-extrabold text-primary">Descubre también</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map((item) => <Link key={item.to} to={item.to} className="rounded-full border border-primary/20 px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/5">{item.label}</Link>)}
          </div>
        </nav>
        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">PENYERA es la guía digital de las peñas de Alfaz del Pi y l’Alfàs del Pi, con información del programa de fiestas, Mayorales, eventos, actividades y noticias de la comunidad festera. Las fechas, horarios y actividades se actualizarán cuando exista información confirmada.</p>
      </main>
      <div className="border-t border-border/70 bg-card px-4 py-8 text-center">
        <p className="mb-4 text-sm font-semibold text-muted-foreground">PENYERA · {new Date().getFullYear()}</p>
        <Link to="/" className="text-sm font-bold text-primary underline underline-offset-4">Volver a la portada</Link>
      </div>
      <CopyrightFooter />
    </div>
  );
}
