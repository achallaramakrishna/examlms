import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Inside the Docker Compose network, "localhost" refers to the frontend
// container itself, not the backend container — the backend must be reached
// by its service name instead. VITE_API_PROXY_TARGET lets docker-compose.yml
// override this; local (non-Docker) dev keeps the localhost default.
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:4000';

// Set only for production builds served from a subpath (e.g. VITE_BASE_PATH=/examlms/
// when nginx serves this app at https://host/examlms/). Local dev is unaffected.
const basePath = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
