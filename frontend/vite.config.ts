import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ports (changed from the defaults 5173 / 8080 to avoid clashes):
//   web app  -> 13000   (this file)
//   API      -> 18080   (backend/src/main/resources/application.properties, server.port)
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on the local network so a phone can open it
    port: 13000,
    strictPort: true, // fail loudly instead of silently picking another port
    // The frontend calls /api/... and Vite forwards it to Spring Boot,
    // so the phone only needs to reach port 13000.
    proxy: { '/api': 'http://localhost:18080' },
  },
  preview: { host: true, port: 13000, strictPort: true, proxy: { '/api': 'http://localhost:18080' } },
});
