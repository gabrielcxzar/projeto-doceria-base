import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["images/logo.png"],
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
            src: "/images/logo.png",
            sizes: "1024x1024",
            type: "image/png",
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
        globIgnores: ["404.html"],
      },
    }),
  ],
});
