import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { createXRStore, useXR, XR } from '@react-three/xr';
import { ToneMappingMode } from 'postprocessing';
import { useEffect, useRef } from 'react';
import { STYLES } from '../lab/styles';
import { createXRPost } from './xr-post';
import * as THREE from 'three';
import { mountStation, type Station, type StationCallbacks } from '../scene/station';

// Usamos a sessão WebXR do @react-three/xr, mas desenhamos mãos e lemos os
// controles por conta própria (porta das interações do protótipo).
export const xrStore = createXRStore({
  controller: false,
  hand: false,
  transientPointer: false,
  gaze: false,
  screenInput: false,
  emulate: false, // o simulador de Quest é instalado em src/dev/xr-emulate.ts
  offerSession: false,
});

/** Olhar arrastando o mouse, como o look-controls do A-Frame (sem pointer lock). */
function DesktopLook() {
  const { camera, gl } = useThree();
  useEffect(() => {
    const euler = new THREE.Euler(-Math.PI / 15, 0, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
    const canvas = gl.domElement;
    let dragging = false;
    const down = (e: PointerEvent) => {
      if (e.button === 0) dragging = true;
    };
    const up = () => (dragging = false);
    const move = (e: PointerEvent) => {
      if (!dragging || gl.xr.isPresenting) return;
      euler.y -= e.movementX * 0.002 * 1.5;
      euler.x -= e.movementY * 0.002 * 1.5;
      euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
      camera.quaternion.setFromEuler(euler);
    };
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointermove', move);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointermove', move);
    };
  }, [camera, gl]);
  return null;
}

function StationMount({ game, callbacks, onReady }: Props) {
  const { scene, gl, get } = useThree();
  const station = useRef<Station | null>(null);
  useEffect(() => {
    const s = mountStation(
      { scene, gl, camera: () => get().camera, stage: document.querySelector<HTMLElement>('.stage')! },
      game,
      callbacks,
    );
    station.current = s;
    onReady(s);
    return () => {
      s.destroy();
      station.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, gl]);
  useFrame((state, delta, frame) => {
    station.current?.frame(state.clock.elapsedTime * 1000, delta * 1000, frame as XRFrame | undefined);
  });
  return null;
}

/**
 * A câmera do Âmbar Noturno, igual ao laboratório: bloom nas lâmpadas e nos filamentos,
 * vinheta, grão de filme e tons ACES.
 * - computador: EffectComposer (@react-three/postprocessing), como no laboratório;
 * - VR: a mesma receita refeita olho por olho (src/app/xr-post.ts);
 * - ?leve (ensaios sem GPU): só ACES, sem pós-processamento.
 */
function Atmosphere() {
  const { gl, scene, camera } = useThree();
  const inXR = useXR((s) => Boolean(s.session));
  const light = new URLSearchParams(location.search).has('leve');
  const xrPost = useRef<ReturnType<typeof createXRPost> | null>(null);
  useEffect(() => {
    gl.toneMapping = light ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    gl.toneMappingExposure = 1;
    // Foveação leve no Quest: a borda da visão perde um pouco de resolução, o centro não.
    if (inXR) gl.xr.setFoveation(0.3);
  }, [gl, inXR, light]);
  useEffect(() => {
    xrPost.current = createXRPost(gl);
    return () => xrPost.current?.dispose();
  }, [gl]);
  // Com prioridade 1 o R3F deixa de desenhar sozinho: quem desenha é o pós-processamento.
  useFrame(() => {
    if (light) gl.render(scene, camera);
    else if (inXR) xrPost.current?.render(scene, camera);
  }, 1);
  if (inXR || light) return null;
  const post = STYLES.ambar.post;
  return (
    <EffectComposer multisampling={4}>
      <Bloom intensity={post.bloom} luminanceThreshold={0.75} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette darkness={post.vignette} offset={0.25} />
      <Noise opacity={post.noise} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

interface Props {
  game: any;
  callbacks: StationCallbacks;
  onReady: (station: Station) => void;
}

export function App(props: Props) {
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      camera={{ position: [0, 1.6, 0], fov: 80, near: 0.005, far: 100 }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0b0807');
        // ?leve (testes no simulador sem GPU): menos pixels por olho.
        if (new URLSearchParams(location.search).has('leve')) gl.xr.setFramebufferScaleFactor(0.2);
      }}
    >
      <XR store={xrStore}>
        <DesktopLook />
        <StationMount {...props} />
        <Atmosphere />
      </XR>
    </Canvas>
  );
}
