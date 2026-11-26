import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `npm run dev:quest` serve em HTTPS na rede local para abrir no Meta Quest 3.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'quest' ? [basicSsl()] : [])],
  server: { port: 5173 },
  // Pré-otimiza o que só aparece depois do primeiro carregamento (modelos, simulador de Quest):
  // sem isso o Vite recarrega a página no meio da primeira partida.
  optimizeDeps: {
    include: ['three/examples/jsm/loaders/GLTFLoader.js', 'iwer', '@iwer/devui', '@dimforge/rapier3d-compat'],
  },
  // Uma única cópia do Three.js: o painel do simulador (@iwer/devui) traz a 0.165 aninhada,
  // que misturada com a do jogo quebra a renderização dele.
  resolve: { dedupe: ['three'] },
  build: {
    target: 'es2022',
    rollupOptions: { input: { main: 'index.html', estilos: 'estilos.html' } },
  },
}));
