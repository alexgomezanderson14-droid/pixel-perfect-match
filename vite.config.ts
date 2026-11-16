// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using Cloudflare by default), VITE_* env injection, @ alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection.
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Lovable continues using its existing Cloudflare preview target.
// Vercel builds need Nitro's Vercel preset to emit the Vercel Build Output API.
const isVercel = Boolean(process.env.VERCEL && process.env.VERCEL !== "0");

export default defineConfig({
  tanstackStart: {
    // Keep the existing SSR error wrapper.
    server: { entry: "server" },
  },
  nitro: isVercel ? { preset: "vercel" } : undefined,
});
