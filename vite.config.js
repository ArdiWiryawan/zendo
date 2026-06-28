import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: [
                "favicon.ico",
                "apple-touch-icon.png",
                "icons/icon-192.png",
                "icons/icon-512.png"
            ],
            manifest: {
                name: "Zendo",
                short_name: "Zendo",
                description: "A quiet digital temple for deep focus and intentional progress.",
                start_url: "/",
                scope: "/",
                display: "standalone",
                orientation: "portrait",
                background_color: "#0F100F",
                theme_color: "#0F100F",
                categories: ["productivity", "lifestyle"],
                lang: "en",
                icons: [
                    {
                        src: "/icons/icon-192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "any"
                    },
                    {
                        src: "/icons/icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any"
                    },
                    {
                        src: "/icons/maskable-192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "maskable"
                    },
                    {
                        src: "/icons/maskable-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable"
                    }
                ]
            },
            workbox: {
                navigateFallback: "/index.html",
                globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"]
            }
        })
    ]
});
