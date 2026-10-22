import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages project site: https://tn-ip.github.io/teachingapp/
export default defineConfig({
  base: "/teachingapp/",
  plugins: [react()],
});
