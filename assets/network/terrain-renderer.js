import {
  ACESFilmicToneMapping, Color, Group, Mesh, NormalBlending, PerspectiveCamera,
  PlaneGeometry, Points, Scene, ShaderMaterial, SRGBColorSpace, Vector2, WebGLRenderer,
} from '../vendor/three-0.185.1/three.module.min.js';
import { SURFACE_VERTEX_SHADER, LINE_FRAGMENT_SHADER, POINT_FRAGMENT_SHADER } from './terrain-shaders.js';

// LoginNetworkSurface.tsx is the authority, not the original uniform placeholders.
export const DEFAULT_NETWORK_SETTINGS = Object.freeze({
  lineStrength: .5, nodeStrength: 3, frontVisibility: 3, backVisibility: 2,
  relief: 2, randomness: .4, speed: 1.6, brightness: 2, verticalPosition: -2.8,
});

export function createTerrainRenderer(canvas, { mobile = false, settings = DEFAULT_NETWORK_SETTINGS } = {}) {
  const context = canvas.getContext('webgl2', {
    alpha: true, antialias: false, depth: false,
    powerPreference: 'high-performance', failIfMajorPerformanceCaveat: true,
  });
  if (!context) throw new Error('WebGL2 is unavailable');
  const renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: false, depth: false });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  let shaderFailed = false;
  renderer.debug.onShaderError = () => { shaderFailed = true; };

  const scene = new Scene();
  const camera = new PerspectiveCamera(51, 1, .1, 60);
  camera.position.set(0, .78, 10.2);
  camera.lookAt(0, -1.42, -5.65);
  const group = new Group();
  group.rotation.set(-Math.PI * .455, 0, 0);
  group.position.set(0, settings.verticalPosition, -5.35);
  scene.add(group);

  const pointerTarget = new Vector2(.5, -2);
  const pointerCurrent = new Vector2(.5, -2);
  let pointerStrengthTarget = 0;
  let pointerStrength = 0;
  const uniforms = {
    uTime: { value: 0 }, uPixelRatio: { value: 1 },
    uPointer: { value: new Vector2(.5, -2) }, uPointerStrength: { value: 0 },
    uRelief: { value: settings.relief }, uRandomness: { value: settings.randomness },
    uSpeed: { value: settings.speed }, uLineStrength: { value: settings.lineStrength },
    uNodeStrength: { value: settings.nodeStrength }, uFrontVisibility: { value: settings.frontVisibility },
    uBackVisibility: { value: settings.backVisibility }, uBrightness: { value: settings.brightness },
    uNearColor: { value: new Color('#7d8792') }, uFarColor: { value: new Color('#aeb6bd') },
  };
  const materialOptions = { uniforms, vertexShader: SURFACE_VERTEX_SHADER,
    transparent: true, depthWrite: false, blending: NormalBlending, toneMapped: false };
  const lineMaterial = new ShaderMaterial({ ...materialOptions, fragmentShader: LINE_FRAGMENT_SHADER, wireframe: true });
  const pointMaterial = new ShaderMaterial({ ...materialOptions, fragmentShader: POINT_FRAGMENT_SHADER });
  let geometry = new PlaneGeometry(64, 18, 44, 18);
  const mesh = new Mesh(geometry, lineMaterial);
  const points = new Points(geometry, pointMaterial);
  mesh.frustumCulled = points.frustumCulled = false;
  group.add(mesh, points);
  let previousWidth = 0;
  let previousHeight = 0;
  let previousMobile = null;
  let disposed = false;

  return {
    // Shared objects are also available to the isolated fidelity check fixture.
    mesh, points, camera, group, uniforms, renderer,
    resize(width, height, isMobile = mobile) {
      if (!width || !height || disposed) return;
      mobile = isMobile;
      const dpr = mobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(dpr);
      uniforms.uPixelRatio.value = dpr;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (width !== previousWidth || height !== previousHeight || mobile !== previousMobile) {
        const next = new PlaneGeometry(Math.max(mobile ? 40 : 64, camera.aspect * (mobile ? 25 : 28)),
          mobile ? 16 : 18, mobile ? 28 : 44, mobile ? 12 : 18);
        mesh.geometry = points.geometry = next;
        geometry.dispose();
        geometry = next;
        previousWidth = width;
        previousHeight = height;
        previousMobile = mobile;
      }
      if (mobile) pointerStrengthTarget = 0;
    },
    pointer(x, y, inside) {
      pointerTarget.set(x, y);
      pointerStrengthTarget = inside ? 1 : 0;
    },
    clearPointer() { pointerStrengthTarget = 0; },
    draw(time, delta = 0) {
      if (disposed) return;
      const smoothing = 1 - Math.exp(-delta * 5.5);
      pointerCurrent.lerp(pointerTarget, smoothing);
      pointerStrength += (pointerStrengthTarget - pointerStrength) * smoothing;
      uniforms.uTime.value = time;
      uniforms.uPointer.value.copy(pointerCurrent);
      uniforms.uPointerStrength.value = pointerStrength;
      renderer.render(scene, camera);
      if (shaderFailed) throw new Error('Network shader compilation failed');
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometry.dispose();
      lineMaterial.dispose();
      pointMaterial.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
