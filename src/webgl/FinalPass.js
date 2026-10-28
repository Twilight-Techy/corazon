import * as THREE from 'three'

export const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0.002 },
    uVignette: { value: 0.85 },
    uGrain: { value: 0.06 },
    uFlash: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uAberration, uVignette, uGrain, uFlash;
    uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      float d = length(c);
      vec2 uv = vUv - c * d * d * 0.04; // whisper of barrel distortion
      float ab = uAberration * (0.3 + d * 2.5);
      vec3 col;
      col.r = texture2D(tDiffuse, uv - c * ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv + c * ab).b;
      col *= mix(1.0, smoothstep(0.95, 0.2, d), uVignette);
      col += (hash(vUv * uRes + fract(uTime * 7.0) * 113.0) - 0.5) * uGrain;
      col += uFlash * vec3(1.0, 0.85, 0.9);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
}
