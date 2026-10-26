import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * GitHub Pages hosts this repo at /teachingapp/.
 * Vercel sets VERCEL=1 and serves the same build at the domain root.
 * An explicit VITE_BASE_PATH overrides both.
 */
function viteBase(override: string | undefined, onVercel: boolean): string {
  const value = override?.trim();
  if (value) {
    if (value === "/") return "/";
    return value.endsWith("/") ? value : `${value}/`;
  }
  return onVercel ? "/" : "/teachingapp/";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const override = process.env.VITE_BASE_PATH || env.VITE_BASE_PATH;
  // Vercel injects VERCEL=1. Any non-empty value means this build is on Vercel.
  const onVercel = Boolean(process.env.VERCEL);
  return {
    base: viteBase(override, onVercel),
    plugins: [react()],
  };
});
