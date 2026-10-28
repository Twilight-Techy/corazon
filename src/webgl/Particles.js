import * as THREE from 'three'
import { snoise } from './noise.js'
import { galaxy, heart, textPoints } from './shapes.js'

// One cloud of points that morphs: name (0) → galaxy (1) → heart (2) → age (3).
export class Particles {
  constructor({ count, name, age }) {
    this.count = count
    const nameShape = textPoints(name, count, { height: 3.1, italic: true, weight: 300 })
    const ageShape = textPoints(String(age), count, { height: 4.8, italic: true, weight: 200, offsetY: 0.55 })
    this.nameWidth = nameShape.width
    this.ageWidth = ageShape.width

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(nameShape.points, 3))
    g.setAttribute('aGalaxy', new THREE.BufferAttribute(galaxy(count), 3))
    g.setAttribute('aHeart', new THREE.BufferAttribute(heart(count), 3))
    g.setAttribute('aAge', new THREE.BufferAttribute(ageShape.points, 3))
    const r = new Float32Array(count * 4)
    for (let i = 0; i < r.length; i++) r[i] = Math.random()
    g.setAttribute('aRand', new THREE.BufferAttribute(r, 4))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30)

    this.uniforms = {
      uTime: { value: 0 },
      uMorph: { value: 1 },
      uBang: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 26 },
      uFitName: { value: 1 },
      uFitAge: { value: 1 },
      uFitHeart: { value: 1 },
      uBeat: { value: 0 },
      uAlpha: { value: 1 },
      uMouse: { value: new THREE.Vector3(99, 99, 0) },
      uMouseForce: { value: 0 },
      uShock: { value: new THREE.Vector4(0, 0, 0, 99) },
    }

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime, uMorph, uBang, uPixelRatio, uSize, uFitName, uFitAge, uFitHeart, uBeat, uAlpha, uMouseForce;
        uniform vec3 uMouse;
        uniform vec4 uShock;
        attribute vec3 aGalaxy, aHeart, aAge;
        attribute vec4 aRand;
        varying vec3 vColor;
        varying float vAlpha;
        #define PI 3.14159265
        ${snoise}

        float stageT(float m, float i, float r) {
          float s = 0.9;
          return smoothstep(0.0, 1.0, clamp((m - (i - 1.0)) * (1.0 + s) - r * s, 0.0, 1.0));
        }
        mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

        void main() {
          vec3 name = position * uFitName;

          vec3 gal = aGalaxy;
          float rad = length(gal.xz);
          gal.xz = rot(uTime * 0.12 / (0.25 + rad * 0.22)) * gal.xz;
          gal.yz = rot(1.05) * gal.yz;
          gal.xy = rot(-0.35) * gal.xy;

          vec3 hrt = aHeart * uFitHeart * (1.0 + uBeat * 0.09 * (0.6 + aRand.y * 0.4));
          vec3 age = aAge * uFitAge;

          float t1 = stageT(uMorph, 1.0, aRand.x);
          float t2 = stageT(uMorph, 2.0, aRand.x);
          float t3 = stageT(uMorph, 3.0, aRand.x);
          vec3 p = mix(name, gal, t1);
          p = mix(p, hrt, t2);
          p = mix(p, age, t3);

          float trans = sin(t1 * PI) + sin(t2 * PI) + sin(t3 * PI);
          vec3 q = p * 0.35 + uTime * 0.15;
          vec3 n = vec3(snoise(q), snoise(q + 31.7), snoise(q + 73.1));
          p += n * (trans * 1.4 + 0.035);

          // big bang: everything starts as one point
          float b = clamp(uBang * 1.35 - aRand.y * 0.35, 0.0, 1.0);
          float eb = 1.0 - pow(1.0 - b, 4.0);
          p = p * eb + n * sin(b * PI) * 2.5;

          // cursor repulsion
          vec3 dm = p - uMouse;
          float md = length(dm.xy);
          float f = smoothstep(1.6, 0.0, md) * uMouseForce;
          p.xy += normalize(dm.xy + 1e-4) * f * 0.9;
          p.z += f * 0.8;

          // click shockwave
          vec3 ds = p - uShock.xyz;
          float sd = length(ds);
          float ring = exp(-pow((sd - uShock.w * 7.0) * 1.6, 2.0)) * exp(-uShock.w * 1.2);
          p += normalize(ds + 1e-4) * ring * 0.9;

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float depth = -mv.z;

          float twinkle = 0.65 + 0.35 * sin(uTime * (1.5 + aRand.z * 3.0) + aRand.y * 60.0);
          float size = uSize * (0.35 + pow(aRand.w, 2.0) * 1.3) * twinkle;
          size *= 1.0 + ring * 2.0 + f;
          gl_PointSize = min(size * uPixelRatio / max(depth, 0.1), 48.0 * uPixelRatio);

          // palette
          vec3 rose = vec3(1.0, 0.42, 0.62);
          vec3 champ = vec3(1.0, 0.82, 0.66);
          vec3 violet = vec3(0.55, 0.42, 1.0);
          vec3 hot = vec3(1.0, 0.16, 0.42);
          vec3 col = mix(rose, champ, smoothstep(0.3, 0.9, aRand.z));
          col = mix(col, violet, step(0.86, aRand.w) * 0.8);

          float wGal = t1 * (1.0 - t2);
          vec3 galCol = mix(vec3(1.0, 0.86, 0.75), mix(rose, violet, aRand.z), smoothstep(0.3, 4.5, rad));
          col = mix(col, galCol * (0.8 + smoothstep(1.0, 0.0, rad) * 0.5), wGal);
          float wHeart = t2 * (1.0 - t3);
          col = mix(col, mix(hot, rose, aRand.z * 0.7), wHeart);
          col *= 1.0 + ring * 3.0;

          vColor = col;
          vAlpha = uAlpha * (0.45 + aRand.y * 0.55) * smoothstep(0.3, 2.2, depth) * (0.4 + eb * 0.6);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          a = a * a * (0.6 + 0.4 * smoothstep(0.18, 0.0, d) * 2.0);
          if (a < 0.003) discard;
          gl_FragColor = vec4(vColor, a * vAlpha);
        }
      `,
    })

    this.points = new THREE.Points(g, this.material)
    this.points.frustumCulled = false
  }

  resize(visibleWidth) {
    this.uniforms.uFitName.value = Math.min(1, (visibleWidth * 0.86) / this.nameWidth)
    this.uniforms.uFitAge.value = Math.min(1, (visibleWidth * 0.8) / this.ageWidth)
    this.uniforms.uFitHeart.value = Math.min(1, (visibleWidth * 0.78) / 3.7)
  }
}
