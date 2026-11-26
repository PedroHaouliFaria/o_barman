// Laboratório de estilos: o bar inteiro com os 3 estilos propostos.
// Abra /estilos.html (npm run dev). Teclas 1, 2, 3 trocam o estilo; V troca a vista.
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Noise, Pixelation, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { createLabAudio } from './audio';
import { buildBar, type BarScene } from './bar';
import { STYLES, type StyleId } from './styles';
import './lab.css';

const VIEWS = {
  bartender: { name: 'Bartender', pos: [0, 1.62, 0], look: [0, 1.05, -5] },
  salao: { name: 'Salão', pos: [4.7, 2.75, 0.9], look: [-1.4, 0.7, -6.2] },
  fundo: { name: 'Porta e piano', pos: [0.4, 1.62, -2.9], look: [0.3, 1.2, -9.8] },
  balcao: { name: 'Visto do cliente', pos: [0.4, 1.58, -3.3], look: [0, 1.3, 0.6] },
} as const;
type ViewId = keyof typeof VIEWS;

const listener = new THREE.AudioListener();
const audio = createLabAudio(listener);

function Rig({ view }: { view: ViewId }) {
  const { camera, gl } = useThree();
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  useEffect(() => {
    camera.add(listener);
    return () => void camera.remove(listener);
  }, [camera]);
  const applied = useRef<ViewId | null>(null);
  // Andar livre: WASD ou setas, Shift corre. Fica na altura dos olhos e dentro do salão.
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.code);
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const clear = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);
  const forward = useRef(new THREE.Vector3());
  const side = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    const k = keys.current;
    const ahead = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const strafe = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    if (!ahead && !strafe) return;
    const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? 3.2 : 1.4) * Math.min(dt, 0.1);
    const yaw = euler.current.y;
    forward.current.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    side.current.set(Math.cos(yaw), 0, -Math.sin(yaw));
    camera.position.addScaledVector(forward.current, ahead * speed).addScaledVector(side.current, strafe * speed);
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -5.2, 5.2);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -9.7, 1.4);
    camera.position.y += (1.62 - camera.position.y) * Math.min(1, dt * 4);
  });
  useFrame(() => {
    if (applied.current === view) return;
    applied.current = view;
    const v = VIEWS[view];
    camera.position.set(...(v.pos as unknown as [number, number, number]));
    camera.lookAt(...(v.look as unknown as [number, number, number]));
    euler.current.setFromQuaternion(camera.quaternion, 'YXZ');
  });
  useEffect(() => {
    let dragging = false;
    const canvas = gl.domElement;
    const down = () => (dragging = true);
    const up = () => (dragging = false);
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const eu = euler.current;
      eu.y -= e.movementX * 0.003;
      eu.x = Math.max(-1.3, Math.min(1.3, eu.x - e.movementY * 0.003));
      camera.quaternion.setFromEuler(eu);
    };
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointermove', move);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointermove', move);
    };
  }, [gl, camera]);
  return null;
}

function Bar({ styleId, sound, onBar }: { styleId: StyleId; sound: boolean; onBar: (b: BarScene) => void }) {
  const style = STYLES[styleId];
  const bar = useMemo(() => buildBar(style), [style]);
  const wasOpen = useRef(false);
  useEffect(() => {
    onBar(bar);
    if (sound) audio.start(style, bar.pianoAnchor, bar.murmurAnchors, bar.strike);
    return () => audio.stop();
  }, [bar, sound, style, onBar]);
  useFrame((state, dt) => {
    bar.update(state.clock.elapsedTime, dt);
    const opening = bar.door.openness > 0.05;
    if (opening && !wasOpen.current && sound) audio.creak(bar.doorAnchor);
    wasOpen.current = opening;
  });
  return (
    <>
      <primitive object={bar.root} />
      <ambientLight color={style.light.ambient[0]} intensity={style.light.ambient[1]} />
      <hemisphereLight args={[style.light.hemi[0], style.light.hemi[1], style.light.hemi[2]]} />
    </>
  );
}

function Effects({ styleId }: { styleId: StyleId }) {
  const s = STYLES[styleId];
  const offset = useMemo(() => new THREE.Vector2(s.post.chroma, s.post.chroma), [s]);
  return (
    <EffectComposer multisampling={s.resolution < 1 ? 0 : 4}>
      <Bloom intensity={s.post.bloom} luminanceThreshold={0.75} luminanceSmoothing={0.2} mipmapBlur />
      <ChromaticAberration offset={offset} />
      <Vignette darkness={s.post.vignette} offset={0.25} />
      <Noise opacity={s.post.noise} />
      {s.resolution < 1 ? <Pixelation granularity={Math.round(1 / s.resolution)} /> : <></>}
      <ToneMapping mode={s.toneMapping === THREE.ACESFilmicToneMapping ? ToneMappingMode.ACES_FILMIC : ToneMappingMode.LINEAR} />
    </EffectComposer>
  );
}

function Lab() {
  const initial = (new URLSearchParams(location.search).get('estilo') as StyleId) || 'ambar';
  const initialView = (new URLSearchParams(location.search).get('vista') as ViewId) || 'bartender';
  const [styleId, setStyle] = useState<StyleId>(STYLES[initial] ? initial : 'ambar');
  const [view, setView] = useState<ViewId>(VIEWS[initialView] ? initialView : 'bartender');
  const [sound, setSound] = useState(false);
  const [panel, setPanel] = useState(!new URLSearchParams(location.search).has('limpo'));
  const style = STYLES[styleId];
  const onBar = useMemo(() => (b: BarScene) => ((window as any).__lab = { bar: b }), []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const ids = Object.keys(STYLES) as StyleId[];
      if (['1', '2', '3'].includes(e.key)) setStyle(ids[Number(e.key) - 1]);
      if (e.key === 'v') {
        const vs = Object.keys(VIEWS) as ViewId[];
        setView((v) => vs[(vs.indexOf(v) + 1) % vs.length]);
      }
      if (e.key === 'h') setPanel((p) => !p);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set('estilo', styleId);
    url.searchParams.set('vista', view);
    history.replaceState(null, '', url);
  }, [styleId, view]);

  return (
    <>
      <div className="stage">
        <Canvas
          key={styleId}
          flat
          shadows={style.shadows ? 'soft' : false}
          dpr={style.resolution < 1 ? 1 : [1, 2]}
          gl={{ antialias: style.resolution >= 1, preserveDrawingBuffer: true }}
          camera={{ fov: 72, near: 0.02, far: 40 }}
        >
          <color attach="background" args={[style.background]} />
          <fogExp2 attach="fog" args={[style.fog.color, style.fog.density]} />
          <Rig view={view} />
          <Bar styleId={styleId} sound={sound} onBar={onBar} />
          {!new URLSearchParams(location.search).has('semfx') && <Effects styleId={styleId} />}
        </Canvas>
      </div>
      <header className="bar-top">
        <span className="brand">Spirits &amp; Spirits · Laboratório de estilos</span>
        <nav>
          {(Object.keys(STYLES) as StyleId[]).map((id, i) => (
            <button key={id} aria-pressed={id === styleId} onClick={() => setStyle(id)}>
              {i + 1}. {STYLES[id].name}
            </button>
          ))}
          <span className="sep" />
          {(Object.keys(VIEWS) as ViewId[]).map((id) => (
            <button key={id} aria-pressed={id === view} onClick={() => setView(id)}>
              {VIEWS[id].name}
            </button>
          ))}
          <span className="sep" />
          <button
            aria-pressed={sound}
            onClick={() => {
              if (listener.context.state === 'suspended') listener.context.resume();
              setSound((s) => !s);
            }}
          >
            {sound ? 'Som ligado' : 'Ligar som'}
          </button>
        </nav>
      </header>
      {panel && (
        <aside className="card">
          <h1>{style.name}</h1>
          <p className="tag">{style.tagline}</p>
          <ul>
            {style.description.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p className="refs">Referências: {style.references}</p>
          <p className="keys">Arraste para olhar · WASD anda (Shift corre) · 1 2 3 estilos · V vistas · H esconde o painel</p>
        </aside>
      )}
    </>
  );
}

createRoot(document.getElementById('lab')!).render(
  <StrictMode>
    <Lab />
  </StrictMode>,
);
