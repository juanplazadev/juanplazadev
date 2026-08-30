import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// The .env lives at the repo root, not in frontend/, so that compose.yaml and
// Vite read the same file — one source of truth for ports and URLs, the way
// Laravel shares a single root .env between artisan, sail and vite.
const envDir = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, envDir, "");
  // Real environment wins over the file, so compose can override per-container
  // without a .env having to exist inside the image.
  const env = (key: string) => process.env[key] ?? fileEnv[key];

  return {
    plugins: [react(), tailwindcss()],
    envDir,

    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },

    server: {
      // Defaults match .env.example: 5173 is taken by ibiri-laravel.test-1.
      port: Number(env("VITE_PORT")) || 5180,
      // Fail loudly on a conflict instead of silently drifting to another port,
      // which would break the 1:1 container mapping and with it the HMR socket.
      strictPort: true,
      // Bind 0.0.0.0 so the dev server is reachable from outside the container.
      host: true,
      watch: {
        // File events do not cross macOS bind mounts reliably; without polling
        // HMR silently stops firing when running under Docker.
        usePolling: true,
      },
      proxy: {
        // Inert until the Spring Boot backend exists. The target is an env var
        // because it differs by where Vite runs: localhost on the host,
        // host.docker.internal from inside the dev container, and the service
        // name once backend/ is a compose service.
        "/api": {
          target: env("VITE_API_PROXY_TARGET") || `http://localhost:${env("APP_PORT") || 8080}`,
          changeOrigin: true,
        },
      },
    },

    preview: {
      // Match the port the app listens on everywhere else.
      port: Number(env("APP_PORT")) || 8080,
      strictPort: true,
      host: true,
    },
  };
});
