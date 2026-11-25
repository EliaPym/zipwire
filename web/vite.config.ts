import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import basicSSL from "@vitejs/plugin-basic-ssl";

// https://vite.dev/config/
export default defineConfig({
   plugins: [react(), basicSSL()],
   server: {
      host: true,
      proxy: {
         "/ws": { target: "ws:/127.0.0.1:8080", ws: true }
      }
   }
});
