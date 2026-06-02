import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: "src/frontend",
  build: {
    outDir: "../../dist/public",
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000"
    }
  }
});
