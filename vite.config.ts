import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import istanbul from "vite-plugin-istanbul";


export default defineConfig(({ mode }) => ({
  plugins: [react(),
  ],
  build: {
    lib: {
      entry: "src/index.tsx",
      name: "RandomPicker",
      fileName: "random-picker",
      formats: ["es"],
    },
    cssCodeSplit: false,
  },
  base: mode === "desktop" ? "/" : "/maputnik/",
  define: {
    global: "globalThis"
  },
}));