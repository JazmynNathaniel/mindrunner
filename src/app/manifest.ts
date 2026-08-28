import type { MetadataRoute } from "next";

// Installable-app identity: "add to home screen" reads this and mounts
// BRAIN_OS standalone (no browser chrome) with KEVIN as the app icon.
// The maskable icon carries extra padding so circular crops keep his ears.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JAZ://BRAIN_OS",
    short_name: "BRAIN_OS",
    description: "private neural interface. authorized personnel only.",
    start_url: "/",
    display: "standalone",
    background_color: "#030207",
    theme_color: "#060310",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
