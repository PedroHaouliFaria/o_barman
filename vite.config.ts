import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `npm run dev:quest` serve em HTTPS na rede local para abrir no Meta Quest 3.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'quest' ? [basicSsl()] : [])],
  server: { port: 5173 },
  build: { target: 'es2022' },
}));
