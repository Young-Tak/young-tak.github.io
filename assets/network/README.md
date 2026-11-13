# Landing network

Framework-free port of the user-supplied RadPathway network graphics. The deployed
site loads self-hosted Three.js **0.185.1** from `../vendor/three-0.185.1/` with its
MIT license. React, React DOM, Fiber, authentication, and application UI are not
part of this port. There is no site build step or runtime CDN dependency.

## Files

- `terrain-shaders.js`: the three original GLSL shader bodies, unchanged.
- `terrain-renderer.js`: Three scene, camera, geometry, materials, and uniforms.
- `../../network-hero.js`: lazy initialization, motion, pointer input, and lifecycle.
- `../research/network-static.svg`: original `StaticNetworkArtwork` at source defaults.
- `../../entrance.css`: homepage placement, mask, opacity, and white-page presentation.

Keep presentation adjustments separate from the source rendering parameters.
The SVG is placed in the lower 60% of the background and faded at its upper edge;
a CSS brightness multiplier of 0.5 keeps its original light artwork visible on white.

## Source identity

SHA-256 of the original files in the supplied transfer package:

| File | SHA-256 |
| --- | --- |
| `LoginNetworkSurface.tsx` | `95365DE368D6B134697D9C4807F84EFBA28E59F6C14384A24C784EF344FC9FC3` |
| `LoginNetworkWebGL.tsx` | `E4C908D86779224445F697E6C64CA18DC65144ACD11A5C85B48001F1125540E8` |
| `NetworkHero.css` | `0A3AB5DBEE17FC50789EF129C3AA35AE79FD282802FAA99B942858104FD298CC` |
| `NetworkHero.tsx` | `E305C0B0431304A61A03DB3646DC9445616581EF8D6CE57837AC48B42FFEF703` |

`LoginNetworkSurface.tsx` is the authority for defaults; the initial uniform
placeholders in the original WebGL component are overwritten on its first frame.

```js
{
  lineStrength: 0.5, nodeStrength: 3,
  frontVisibility: 3, backVisibility: 2,
  relief: 2, randomness: 0.4, speed: 1.6,
  brightness: 2, verticalPosition: -2.8
}
```

## Rendering contract

- Camera: perspective FOV `51`, near/far `0.1 / 60`, position `[0, 0.78, 10.2]`,
  looking at `[0, -1.42, -5.65]`.
- Surface group: rotation `[-Math.PI * 0.455, 0, 0]`, position `[0, -2.8, -5.35]`.
- Desktop plane: width `max(64, aspect * 28)`, depth `18`, segments `44 × 18`.
- Mobile (`≤760px`): width `max(40, aspect * 25)`, depth `16`, segments `28 × 12`.
- DPR: desktop capped at `1.5`; mobile `1`.
- Colors: near `#7d8792`, far `#aeb6bd`. Wireframe and points share the original
  vertex shader; their separate fragment shaders retain the original alpha formulas.
- Transparent WebGL2 canvas, antialias/depth buffers disabled; normal material
  blending, `depthWrite:false`, `toneMapped:false`, no frustum culling.
- Pointer smoothing: `1 - exp(-delta * 5.5)`. Pointer interaction is disabled for
  mobile/coarse pointers. Geometry is rebuilt only when dimensions or mode change.

The original React/Fiber fixture and this renderer produced **zero differing
pixels** at `uTime=0`, 1440×900, DPR 1, neutral pointer, using the original dark
reference presentation. This comparison validates the port, not the homepage's
separate white-background styling.

## Lifecycle and fallback

The adapter loads the renderer only while the landing is visible and motion is
allowed. Pause preserves elapsed time. Offscreen, hidden-tab, and profile views
stop animation frames; resuming does not jump forward through the hidden interval.
Pointer glow is cleared on pointer leave, blur, or mobile-mode changes.

Reduced motion uses the SVG without starting WebGL. Unavailable WebGL2, failed
module/shader initialization, or context loss also selects that fallback and hides
the animation control. Enabling reduced motion releases GPU resources. Normal
page exit disposes geometry, materials, renderer, and context; back/forward-cache
navigation suspends and resumes the existing state.

For maintenance, inspect both renderers, narrow layouts, pause/resume, direct
section links, and reduced-motion changes. Confirm `data-renderer="webgl"` before
comparing animated captures; a static fallback can otherwise look plausible while
masking a renderer failure.
