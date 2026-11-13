// Verbatim shader bodies from the user-supplied RadPathway transfer package.
export const SURFACE_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform float uRelief;
  uniform float uRandomness;
  uniform float uSpeed;

  varying vec2 vUv;
  varying float vPointerGlow;
  varying float vWave;

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }

  float valueNoise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    vec2 blend = local * local * (3.0 - 2.0 * local);

    float a = hash21(cell);
    float b = hash21(cell + vec2(1.0, 0.0));
    float c = hash21(cell + vec2(0.0, 1.0));
    float d = hash21(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, blend.x), mix(c, d, blend.x), blend.y);
  }

  void main() {
    vUv = uv;
    float animatedTime = uTime * uSpeed;

    // Several independently moving noise fields continuously reshape the
    // terrain. Spatial warping and vertex-specific phases avoid a single,
    // predictable sine-wave motion.
    vec2 spatialWarp = vec2(
      valueNoise(position.xy * vec2(0.12, 0.16) + vec2(animatedTime * 0.09, -animatedTime * 0.07)),
      valueNoise(position.yx * vec2(0.14, 0.11) + vec2(-animatedTime * 0.08, animatedTime * 0.11))
    ) * 2.0 - 1.0;
    vec2 lowDrift = vec2(animatedTime * 0.105, -animatedTime * 0.082);
    vec2 midDrift = vec2(-animatedTime * 0.148, animatedTime * 0.117);
    float lowTerrain = valueNoise(
      position.xy * vec2(0.17, 0.23) + spatialWarp * 0.62 + lowDrift
    ) * 2.0 - 1.0;
    float midTerrain = valueNoise(
      position.xy * vec2(0.38, 0.49) - spatialWarp * 0.38 + midDrift
    ) * 2.0 - 1.0;
    float fineTerrain = valueNoise(
      position.xy * vec2(0.84, 1.04) + spatialWarp * 0.24
        + vec2(animatedTime * 0.19, animatedTime * 0.145)
    ) * 2.0 - 1.0;
    float ridgeField = 1.0 - abs(
      valueNoise(
        position.xy * vec2(0.31, 0.42) + spatialWarp * 0.44
          + vec2(-animatedTime * 0.126, animatedTime * 0.094)
      )
        * 2.0 - 1.0
    );
    float sharpRidges = pow(ridgeField, 6.0);
    float signedField = valueNoise(
      position.xy * vec2(0.53, 0.66) - spatialWarp * 0.26
        + vec2(animatedTime * 0.087, -animatedTime * 0.164)
    ) * 2.0 - 1.0;
    float signedPeaks = sign(signedField) * pow(abs(signedField), 1.65);
    float vertexPhaseA = hash21(position.xy * 1.91 + 3.4) * 6.283185;
    float vertexPhaseB = hash21(position.yx * 2.37 + 8.1) * 6.283185;
    float temporalJitter =
      sin(animatedTime * 0.72 + vertexPhaseA) * 0.18
      + cos(animatedTime * 1.15 + vertexPhaseB) * 0.09;
    float rollingWave =
      sin(position.x * 0.29 + position.y * 0.14 + animatedTime * 0.44) * 0.25
      + cos(position.y * 0.34 - position.x * 0.09 - animatedTime * 0.37) * 0.19;
    float randomRelief = lowTerrain * 0.78
      + midTerrain * 0.56
      + fineTerrain * 0.34
      + signedPeaks * 0.62
      + (sharpRidges - 0.28) * 0.88
      + temporalJitter;
    float relief = (rollingWave + randomRelief * uRandomness) * uRelief;
    float pointerDistance = distance(uv, uPointer);
    float pointerInfluence = exp(-pointerDistance * pointerDistance * 34.0) * uPointerStrength;

    vec3 displaced = position;
    vec2 planarJitter = vec2(
      hash21(position.xy * 1.73 + 4.2),
      hash21(position.yx * 2.11 + 9.7)
    ) - 0.5;
    displaced.xy += planarJitter * vec2(0.28, 0.22) * uRandomness;
    displaced.z += relief - pointerInfluence * 0.58;
    vPointerGlow = pointerInfluence;
    vWave = clamp(relief * 0.2 + 0.5, 0.0, 1.0);

    vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(
      uPixelRatio * (3.45 + pointerInfluence * 3.7) * (9.0 / max(2.0, -viewPosition.z)),
      1.5,
      6.5
    );
  }
`;

export const LINE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uNearColor;
  uniform vec3 uFarColor;
  uniform float uLineStrength;
  uniform float uFrontVisibility;
  uniform float uBackVisibility;
  uniform float uBrightness;
  varying vec2 vUv;
  varying float vPointerGlow;
  varying float vWave;

  void main() {
    float perimeterFade = smoothstep(0.0, 0.035, vUv.x)
      * smoothstep(0.0, 0.035, 1.0 - vUv.x);
    float horizonFade = smoothstep(0.0, 0.08, vUv.y);
    float depthVisibility = mix(uFrontVisibility, uBackVisibility, vUv.y);
    vec3 color = mix(uNearColor, uFarColor, vUv.y) * uBrightness;
    color += vec3(0.13, 0.14, 0.16) * vPointerGlow;
    float alpha = (0.085 + (1.0 - vUv.y) * 0.075 + vWave * 0.04 + vPointerGlow * 0.18)
      * depthVisibility * uLineStrength * perimeterFade * horizonFade;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

export const POINT_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uNearColor;
  uniform vec3 uFarColor;
  uniform float uNodeStrength;
  uniform float uFrontVisibility;
  uniform float uBackVisibility;
  uniform float uBrightness;
  varying vec2 vUv;
  varying float vPointerGlow;
  varying float vWave;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float distanceFromCenter = length(centered);
    if (distanceFromCenter > 0.5) discard;

    float softEdge = 1.0 - smoothstep(0.22, 0.5, distanceFromCenter);
    float depthVisibility = mix(uFrontVisibility, uBackVisibility, vUv.y);
    vec3 color = mix(uNearColor, uFarColor, vUv.y) * uBrightness;
    color = mix(color, vec3(0.94, 0.96, 0.98), vPointerGlow * 0.72);
    float alpha = softEdge
      * (0.15 + (1.0 - vUv.y) * 0.14 + vWave * 0.06 + vPointerGlow * 0.3)
      * depthVisibility * uNodeStrength;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;
