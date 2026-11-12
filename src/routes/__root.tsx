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
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Manrope:wght@400;500;700&display=swap" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
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
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function getWordmarkColor(): "white" | "black" {
  // Comprueba el color sólido del elemento que queda debajo de la marca.
  // Los fondos transparentes o con imagen se omiten para buscar el siguiente
  // fondo sólido de sus contenedores, en lugar de forzar siempre el blanco.
  const x = Math.max(0, window.innerWidth - 32);
  const y = 20;
  let element = document.elementFromPoint(x, y) as HTMLElement | null;

  while (element) {
    const style = window.getComputedStyle(element);
    const background = style.backgroundColor;
    const match = background.match(/rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)(?:\s*[,/]\s*([\d.]+))?\s*\)/);

    if (match && Number(style.opacity) > 0) {
      const alpha = match[4] === undefined ? 1 : Number(match[4]);
      if (alpha > 0.05) {
        const red = Number(match[1]);
        const green = Number(match[2]);
        const blue = Number(match[3]);
        const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
        return luminance > 0.5 ? "black" : "white";
      }
    }

    element = element.parentElement;
  }

  const bodyBackground = window.getComputedStyle(document.body).backgroundColor;
  const bodyMatch = bodyBackground.match(/rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/);
  if (bodyMatch) {
    const red = Number(bodyMatch[1]);
    const green = Number(bodyMatch[2]);
    const blue = Number(bodyMatch[3]);
    return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255 > 0.5 ? "black" : "white";
  }
  return "black";
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [wordmarkColor, setWordmarkColor] = useState<"white" | "black">("black");

  useEffect(() => {
    const updateColor = () => setWordmarkColor(getWordmarkColor());
    updateColor();
    window.addEventListener("scroll", updateColor, true);
    window.addEventListener("resize", updateColor);
    const observer = new MutationObserver(updateColor);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    return () => {
      window.removeEventListener("scroll", updateColor, true);
      window.removeEventListener("resize", updateColor);
      observer.disconnect();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div className="min-h-screen" onContextMenu={(event) => { if ((event.target as HTMLElement).closest('img, picture, video')) event.preventDefault(); }} onDragStart={(event) => { if ((event.target as HTMLElement).closest('img, picture')) event.preventDefault(); }}>
        <Outlet />
        <div
          aria-label="festalfàs"
          className={`pointer-events-none fixed right-4 top-3 z-[10000] select-none text-sm font-extrabold tracking-tight sm:right-6 sm:top-4 sm:text-base ${wordmarkColor === "white" ? "text-white" : "text-black"}`}
        >
          festalfàs
        </div>
      </div>
    </QueryClientProvider>
  );
}
