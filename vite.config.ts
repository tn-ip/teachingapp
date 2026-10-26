import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages project site keeps `/teachingapp/`. A Vercel build served at
// the domain root sets VITE_BASE_PATH=/ so asset URLs are not prefixed.
function viteBase(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return "/teachingapp/";
  if (value === "/") return "/";
  return value.endsWith("/") ? value : `${value}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: viteBase(process.env.VITE_BASE_PATH || env.VITE_BASE_PATH),
    plugins: [react()],
  };
});
