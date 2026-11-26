// Pós-processamento no VR igual ao do computador.
// O navegador do Quest não roda o EffectComposer em WebXR; aqui a mesma receita do
// laboratório (@react-three/postprocessing) é refeita à mão, olho por olho:
//   cena (HDR, MSAA 4x) → luminância (limiar 0,75 / suavização 0,2) → mipmap blur
//   (8 níveis, raio 0,85, mesmos kernels) → bloom em "screen" (0,9) → vinheta (0,75 / 0,25)
//   → grão (0,06, screen) → ACES → sRGB → framebuffer do headset.
// O quadro do VR tem os dois olhos lado a lado: os filtros nunca misturam um olho com o outro
// e a vinheta é centrada em cada olho.
import * as THREE from 'three';
import { STYLES } from '../lab/styles';

const POST = STYLES.ambar.post;
const LEVELS = 8;
const RADIUS = 0.85;
const THRESHOLD = 0.75;
const SMOOTHING = 0.2;

const quadVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// Limites do olho deste fragmento (metade esquerda ou direita do quadro).
const eyeBounds = /* glsl */ `
uniform float stereo;
vec2 eyeRange(vec2 uv) { return stereo > 0.5 ? (uv.x < 0.5 ? vec2(0.0, 0.5) : vec2(0.5, 1.0)) : vec2(0.0, 1.0); }
float inside(vec2 s, vec2 range) { return float(s.x >= range.x && s.x <= range.y && s.y >= 0.0 && s.y <= 1.0); }
vec2 clampEye(vec2 s, vec2 range, vec2 texel) { return vec2(clamp(s.x, range.x + texel.x * 0.5, range.y - texel.x * 0.5), clamp(s.y, 0.0, 1.0)); }
`;

function material(fragmentShader: string, uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    vertexShader: quadVertex,
    fragmentShader,
    uniforms: { stereo: { value: 1 }, ...uniforms },
    depthTest: false,
    depthWrite: false,
  });
}

const luminanceMaterial = () =>
  material(
    /* glsl */ `
    uniform sampler2D inputBuffer; uniform float threshold; uniform float smoothing;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(inputBuffer, vUv);
      float l = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));
      gl_FragColor = texel * smoothstep(threshold, threshold + smoothing, l);
    }`,
    { inputBuffer: { value: null }, threshold: { value: THRESHOLD }, smoothing: { value: SMOOTHING } },
  );

// Mesmos pesos do DownsamplingMaterial do postprocessing (13 amostras), com borda por olho.
const downMaterial = () =>
  material(
    /* glsl */ `
    uniform sampler2D inputBuffer; uniform vec2 texelSize;
    varying vec2 vUv;
    ${eyeBounds}
    void main() {
      vec2 range = eyeRange(vUv);
      vec2 o[12];
      o[0]=vec2(-1.,1.); o[1]=vec2(1.,1.); o[2]=vec2(-1.,-1.); o[3]=vec2(1.,-1.);
      o[4]=vec2(-2.,2.); o[5]=vec2(0.,2.); o[6]=vec2(2.,2.); o[7]=vec2(-2.,0.);
      o[8]=vec2(2.,0.); o[9]=vec2(-2.,-2.); o[10]=vec2(0.,-2.); o[11]=vec2(2.,-2.);
      vec4 c = vec4(0.0);
      for (int i = 0; i < 12; i++) {
        vec2 s = vUv + texelSize * o[i];
        float w = (i < 4 ? 0.125 : 0.05556) * inside(s, range);
        c += w * texture2D(inputBuffer, s);
      }
      c += 0.05556 * texture2D(inputBuffer, vUv);
      gl_FragColor = c;
    }`,
    { inputBuffer: { value: null }, texelSize: { value: new THREE.Vector2() } },
  );

// Mesmos pesos do UpsamplingMaterial (tenda 3x3) misturando com o nível de suporte pelo raio.
const upMaterial = () =>
  material(
    /* glsl */ `
    uniform sampler2D inputBuffer; uniform sampler2D supportBuffer; uniform vec2 texelSize; uniform float radius;
    varying vec2 vUv;
    ${eyeBounds}
    vec4 at(vec2 d, vec2 range) { return texture2D(inputBuffer, clampEye(vUv + texelSize * d, range, texelSize)); }
    void main() {
      vec2 range = eyeRange(vUv);
      vec4 c = at(vec2(-1.,1.),range)*0.0625 + at(vec2(0.,1.),range)*0.125 + at(vec2(1.,1.),range)*0.0625
             + at(vec2(-1.,0.),range)*0.125 + at(vec2(0.,0.),range)*0.25 + at(vec2(1.,0.),range)*0.125
             + at(vec2(-1.,-1.),range)*0.0625 + at(vec2(0.,-1.),range)*0.125 + at(vec2(1.,-1.),range)*0.0625;
      gl_FragColor = mix(texture2D(supportBuffer, vUv), c, radius);
    }`,
    { inputBuffer: { value: null }, supportBuffer: { value: null }, texelSize: { value: new THREE.Vector2() }, radius: { value: RADIUS } },
  );

const compositeMaterial = () =>
  material(
    /* glsl */ `
    uniform sampler2D sceneBuffer; uniform sampler2D bloomBuffer;
    uniform float intensity; uniform float darkness; uniform float offset; uniform float noise; uniform float time;
    varying vec2 vUv;
    ${eyeBounds}
    highp float rand(const in vec2 uv) {
      const highp float a = 12.9898, b = 78.233, c = 43758.5453;
      highp float dt = dot(uv.xy, vec2(a, b)), sn = mod(dt, 3.141592653589793);
      return fract(sin(sn) * c);
    }
    vec3 screen(vec3 dst, vec3 src, float opacity) { return mix(dst, dst + src - min(dst * src, 1.0), opacity); }
    // ACES filmic do Three.js (mesma curva do ToneMappingEffect ACES_FILMIC).
    vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
    vec3 aces(vec3 color) {
      const mat3 ACESInputMat = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
      const mat3 ACESOutputMat = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
      color *= 1.0 / 0.6;
      color = ACESInputMat * color;
      color = RRTAndODTFit(color);
      color = ACESOutputMat * color;
      return clamp(color, 0.0, 1.0);
    }
    vec3 toSRGB(vec3 c) { return mix(c * 12.92, pow(c, vec3(0.41666)) * 1.055 - 0.055, step(0.0031308, c)); }
    void main() {
      vec3 color = texture2D(sceneBuffer, vUv).rgb;
      color = screen(color, texture2D(bloomBuffer, vUv).rgb * intensity, 1.0);
      vec2 range = eyeRange(vUv);
      vec2 eyeUv = vec2((vUv.x - range.x) / (range.y - range.x), vUv.y);
      float d = distance(eyeUv, vec2(0.5));
      color *= smoothstep(0.8, offset * 0.799, d * (darkness + offset));
      // O grão entra na imagem final (espaço de exibição), como no computador: em luz linear
      // ele "levantava" os pretos para cinza.
      vec3 display = toSRGB(aces(color));
      display = screen(display, vec3(rand(gl_FragCoord.xy * 0.001 * (1.0 + time))), noise);
      gl_FragColor = vec4(display, 1.0);
    }`,
    {
      sceneBuffer: { value: null },
      bloomBuffer: { value: null },
      intensity: { value: POST.bloom },
      darkness: { value: POST.vignette },
      offset: { value: 0.25 },
      noise: { value: POST.noise },
      time: { value: 0 },
    },
  );

export function createXRPost(gl: THREE.WebGLRenderer) {
  const quadScene = new THREE.Scene();
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  quadScene.add(quad);
  const lum = luminanceMaterial();
  const down = downMaterial();
  const up = upMaterial();
  const composite = compositeMaterial();
  const options = { type: THREE.HalfFloatType, depthBuffer: false, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter };
  let sceneTarget: THREE.WebGLRenderTarget | null = null;
  const lumTarget = new THREE.WebGLRenderTarget(1, 1, options);
  const downs = Array.from({ length: LEVELS }, () => new THREE.WebGLRenderTarget(1, 1, options));
  const ups = Array.from({ length: LEVELS - 1 }, () => new THREE.WebGLRenderTarget(1, 1, options));
  let width = 0,
    height = 0;
  const clock = new THREE.Timer();

  function resize(w: number, h: number) {
    if (w === width && h === height) return;
    width = w;
    height = h;
    sceneTarget?.dispose();
    sceneTarget = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true });
    lumTarget.setSize(w, h);
    let mw = w,
      mh = h;
    for (let i = 0; i < LEVELS; i++) {
      mw = Math.max(1, Math.round(mw * 0.5));
      mh = Math.max(1, Math.round(mh * 0.5));
      downs[i].setSize(mw, mh);
      if (i < ups.length) ups[i].setSize(mw, mh);
    }
  }

  function pass(mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    quad.material = mat;
    gl.setRenderTarget(target);
    gl.render(quadScene, quadCamera);
  }

  return {
    /** Desenha a cena com a atmosfera do computador no quadro do headset. */
    render(scene: THREE.Scene, camera: THREE.Camera) {
      const xrTarget = gl.getRenderTarget();
      if (!xrTarget) return gl.render(scene, camera);
      resize(xrTarget.width, xrTarget.height);
      clock.update();
      // 1. cena inteira (os dois olhos) em HDR linear
      gl.setRenderTarget(sceneTarget);
      gl.clear();
      gl.render(scene, camera);
      // 2. filtros em tela cheia, sem a câmera do VR. Dois olhos lado a lado = estéreo;
      //    um só (ex.: espelho do simulador) = imagem inteira.
      const xr = gl.xr;
      // Estéreo = dois olhos com largura de verdade (o simulador em mono deixa o direito com 0).
      const cams = (xr.getCamera() as THREE.ArrayCamera).cameras ?? [];
      const stereo = cams.length > 1 && (cams[1] as THREE.PerspectiveCamera & { viewport?: THREE.Vector4 }).viewport!.z > 0;
      for (const m of [lum, down, up, composite]) m.uniforms.stereo.value = stereo ? 1 : 0;
      xr.enabled = false;
      lum.uniforms.inputBuffer.value = sceneTarget!.texture;
      pass(lum, lumTarget);
      let previous: THREE.WebGLRenderTarget = lumTarget;
      for (let i = 0; i < LEVELS; i++) {
        down.uniforms.inputBuffer.value = previous.texture;
        down.uniforms.texelSize.value.set(1 / previous.width, 1 / previous.height);
        pass(down, downs[i]);
        previous = downs[i];
      }
      for (let i = ups.length - 1; i >= 0; i--) {
        up.uniforms.inputBuffer.value = previous.texture;
        up.uniforms.supportBuffer.value = downs[i].texture;
        up.uniforms.texelSize.value.set(1 / previous.width, 1 / previous.height);
        pass(up, ups[i]);
        previous = ups[i];
      }
      composite.uniforms.sceneBuffer.value = sceneTarget!.texture;
      composite.uniforms.bloomBuffer.value = ups[0].texture;
      composite.uniforms.time.value = clock.getElapsed();
      pass(composite, xrTarget);
      xr.enabled = true;
    },
    dispose() {
      sceneTarget?.dispose();
      lumTarget.dispose();
      for (const t of [...downs, ...ups]) t.dispose();
      for (const m of [lum, down, up, composite]) m.dispose();
    },
  };
}
