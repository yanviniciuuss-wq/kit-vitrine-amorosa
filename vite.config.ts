// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { UserConfig } from "vite";

// The Lovable config hardcodes the dev server to port 8080 (its own sandbox).
// The v0 sandbox preview proxy expects the dev server on the port exposed via
// DEV_PORT (Vite's default 5173). We wrap the generated config factory and
// override only the server port so the preview can reach the app, leaving all
// bundled plugins and other options untouched.
const baseConfig = defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

const previewPort = Number(process.env.DEV_PORT) || 5173;

export default async (env: { command: string; mode: string }): Promise<UserConfig> => {
  const resolved = (typeof baseConfig === "function"
    ? await (baseConfig as (env: unknown) => UserConfig | Promise<UserConfig>)(env)
    : baseConfig) as UserConfig;

  return {
    ...resolved,
    server: {
      ...resolved.server,
      port: previewPort,
      strictPort: true,
    },
  };
};
