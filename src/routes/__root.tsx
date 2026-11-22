import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";


function MotionEffects() {
  useEffect(() => {
    // En móviles el CSS ya elimina estas animaciones; evitar además el observador
    // global ahorra trabajo en cada cambio del DOM y mejora el scroll.
    const media = typeof window.matchMedia === "function" ? window.matchMedia.bind(window) : null;
    if ((media && media("(prefers-reduced-motion: reduce)").matches) || (media && media("(max-width: 639px)").matches)) return;

    const selector = "main > section, main article, main details, .copyright-footer";
    const observed = new WeakSet<Element>();
    const pending = new Set<HTMLElement>();
    let observer: IntersectionObserver | null = null;
    let mutationFrame = 0;

    const prepare = (element: HTMLElement) => {
      if (observed.has(element)) return;
      observed.add(element);
      element.classList.add("motion-reveal");
      element.style.setProperty("--motion-delay", "0ms");
      if (observer) observer.observe(element);
      else element.classList.add("is-visible");
    };

    const collect = (scope: ParentNode) => {
      if (scope instanceof HTMLElement && scope.matches(selector)) prepare(scope);
      scope.querySelectorAll<HTMLElement>(selector).forEach(prepare);
    };

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer?.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -32px 0px" });
    }

    collect(document);
    if (typeof MutationObserver === "undefined") return () => observer?.disconnect();
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches(selector)) pending.add(node);
        node.querySelectorAll<HTMLElement>(selector).forEach((element) => pending.add(element));
      }));
      if (!pending.size || mutationFrame) return;
      mutationFrame = window.requestAnimationFrame(() => {
        pending.forEach(prepare);
        pending.clear();
        mutationFrame = 0;
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer?.disconnect();
      if (mutationFrame) window.cancelAnimationFrame(mutationFrame);
      pending.clear();
    };
  }, []);

  return null;
}
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
      { rel: "shortcut icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
          <meta name="theme-color" content="#2587a8" />
          <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({ "@context":"https://schema.org", "@graph":[ { "@type":"WebSite", "@id":"https://pixel-perfect-match-ten-tau.vercel.app/#website", "url":"https://pixel-perfect-match-ten-tau.vercel.app/", "name":"PENYERA", "alternateName":["PENYERA · Peñas y fiestas de l’Alfàs del Pi","PENYERA Alfaz del Pi"], "description":"Guía digital de las peñas, fiestas, Mayorales, eventos, actividades y noticias de l’Alfàs del Pi (Alfaz del Pi, Alicante).", "inLanguage":"es-ES", "publisher":{"@id":"https://pixel-perfect-match-ten-tau.vercel.app/#organization"} }, { "@type":"Organization", "@id":"https://pixel-perfect-match-ten-tau.vercel.app/#organization", "name":"PENYERA", "url":"https://pixel-perfect-match-ten-tau.vercel.app/", "description":"Plataforma digital para descubrir las peñas y seguir la actualidad de las fiestas de l’Alfàs del Pi.", "logo":{"@type":"ImageObject","url":"https://pixel-perfect-match-ten-tau.vercel.app/favicon.svg"}, "areaServed":{"@type":"City","name":"l’Alfàs del Pi","containedInPlace":{"@type":"AdministrativeArea","name":"Alicante, Comunitat Valenciana, España"}} }, { "@type":"Place", "@id":"https://pixel-perfect-match-ten-tau.vercel.app/#alfas-del-pi", "name":"l’Alfàs del Pi (Alfaz del Pi)","address":{"@type":"PostalAddress","addressLocality":"l’Alfàs del Pi","addressRegion":"Alicante","addressCountry":"ES"} } ] })}} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <MotionEffects />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div className="min-h-screen" onContextMenu={(event) => { if ((event.target as HTMLElement).closest('img, picture, video')) event.preventDefault(); }} onDragStart={(event) => { if ((event.target as HTMLElement).closest('img, picture')) event.preventDefault(); }}>
        <Outlet />
      </div>
    </QueryClientProvider>
  );
}
