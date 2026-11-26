import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { createXRStore, XR } from '@react-three/xr';
import { useEffect, useRef } from 'react';
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

interface Props {
  game: any;
  callbacks: StationCallbacks;
  onReady: (station: Station) => void;
}

export function App(props: Props) {
  return (
    <Canvas
      flat
      gl={{ antialias: true, alpha: false }}
      camera={{ position: [0, 1.6, 0], fov: 80, near: 0.005, far: 100 }}
      onCreated={({ gl }) => gl.setClearColor('#343e37')}
    >
      <XR store={xrStore}>
        <DesktopLook />
        <StationMount {...props} />
      </XR>
    </Canvas>
  );
}
