import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Lá Divino Sabor · Gestão",
        short_name: "Divino Sabor",
        description: "Gestão de vendas, encomendas e finanças da confeitaria.",
        theme_color: "#492f26",
        background_color: "#f7f5f0",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "pt-BR",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallbackDenylist: [/^\/__\//],
        cleanupOutdatedCaches: true,
        // API e dados autenticados nunca entram no cache do service worker.
        runtimeCaching: [],
        globIgnores: ["images/logo.png", "404.html"],
      },
    }),
  ],
});
