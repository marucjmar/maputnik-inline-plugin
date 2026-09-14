import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import dts from 'unplugin-dts/vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), dts({ include: ['./src/index.tsx'] })],
  build: {
    lib: {
      entry: "src/index.tsx",
      name: "MaputnikInline",
      fileName: "maputnik-inline",
      formats: ["es"],
    },
    cssCodeSplit: false,
  },
  base: mode === "desktop" ? "/" : "/maputnik/",
  define: {
    global: "globalThis"
  },
}));