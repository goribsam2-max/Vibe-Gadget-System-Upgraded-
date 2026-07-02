import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB limit
          importScripts: ["/custom-sw.js"]
        },
        manifest: {
          name: "Vibe Gadgets",
          short_name: "VibeGadgets",
          description: "Premium mobile accessories and gadgets store in BD",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          start_url: ".",
          icons: [
            {
              src: "https://i.ibb.co.com/XZ8Wx3vL/retouch-2026060219415415.jpg",
              sizes: "192x192",
              type: "image/jpeg",
              purpose: "any maskable"
            },
            {
              src: "https://i.ibb.co.com/XZ8Wx3vL/retouch-2026060219415415.jpg",
              sizes: "512x512",
              type: "image/jpeg",
              purpose: "any maskable"
            },
          ],
        },
      }),
    ],
    build: {
      sourcemap: false,
      minify: "esbuild",
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    esbuild: {
      drop: mode === "production" ? ["console", "debugger"] : [],
    },
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
