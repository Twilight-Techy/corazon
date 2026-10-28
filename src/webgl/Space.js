import * as THREE from 'three'
import { pathAt } from './path.js'

// Background star field + velocity-driven warp streaks along the flight path.
export class Space {
  constructor({ stars = 5000, streaks = 700 } = {}) {
    this.group = new THREE.Group()
    this.uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uVel: { value: 0 },
      uStreak: { value: 0 },
    }

    // stars
    const sp = new Float32Array(stars * 3)
    const sr = new Float32Array(stars)
    const tmp = new THREE.Vector3()
    for (let i = 0; i < stars; i++) {
      const z = THREE.MathUtils.lerp(40, -190, Math.random())
      pathAt(Math.max(z, -88), tmp)
      const a = Math.random() * Math.PI * 2
      const r = 7 + Math.pow(Math.random(), 0.6) * 70
      sp[i * 3] = tmp.x + Math.cos(a) * r
      sp[i * 3 + 1] = tmp.y + Math.sin(a) * r * 0.7
      sp[i * 3 + 2] = z
      sr[i] = Math.random()
    }
    const sg = new THREE.BufferGeometry()
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3))
    sg.setAttribute('aRand', new THREE.BufferAttribute(sr, 1))
    const starMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime, uPixelRatio;
        attribute float aRand;
        varying float vA;
        varying vec3 vC;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float tw = 0.5 + 0.5 * sin(uTime * (0.6 + aRand * 2.5) + aRand * 100.0);
          gl_PointSize = (1.0 + pow(aRand, 6.0) * 5.0) * (0.6 + tw * 0.6) * uPixelRatio * (60.0 / max(-mv.z, 1.0));
          gl_PointSize = clamp(gl_PointSize, 0.0, 6.0 * uPixelRatio);
          vA = (0.35 + tw * 0.65) * smoothstep(160.0, 40.0, -mv.z);
          vC = mix(vec3(1.0, 0.86, 0.92), vec3(0.75, 0.7, 1.0), step(0.7, aRand));
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        varying vec3 vC;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vC, a * a * vA);
        }
      `,
    })
    this.stars = new THREE.Points(sg, starMat)
    this.stars.frustumCulled = false
    this.group.add(this.stars)

    // streaks: pairs of vertices; the tail vertex is stretched by velocity
    const lp = new Float32Array(streaks * 6)
    const le = new Float32Array(streaks * 2)
    const lr = new Float32Array(streaks * 2)
    for (let i = 0; i < streaks; i++) {
      const z = THREE.MathUtils.lerp(8, -150, Math.random())
      pathAt(Math.max(z, -88), tmp)
      const a = Math.random() * Math.PI * 2
      const r = 2.5 + Math.random() * 10
      const x = tmp.x + Math.cos(a) * r
      const y = tmp.y + Math.sin(a) * r * 0.75
      const rr = Math.random()
      for (let j = 0; j < 2; j++) {
        lp.set([x, y, z], (i * 2 + j) * 3)
        le[i * 2 + j] = j
        lr[i * 2 + j] = rr
      }
    }
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3))
    lg.setAttribute('aEnd', new THREE.BufferAttribute(le, 1))
    lg.setAttribute('aRand', new THREE.BufferAttribute(lr, 1))
    const lineMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uStreak, uVel;
        attribute float aEnd, aRand;
        varying float vA;
        void main() {
          vec3 p = position;
          p.z += aEnd * (0.15 + uStreak * (2.0 + aRand * 5.0));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vA = (1.0 - aEnd * 0.9) * smoothstep(0.0, 0.25, uStreak) * smoothstep(60.0, 6.0, -mv.z) * (0.3 + aRand * 0.7);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() { gl_FragColor = vec4(1.0, 0.55, 0.75, vA); }
      `,
    })
    this.streaks = new THREE.LineSegments(lg, lineMat)
    this.streaks.frustumCulled = false
    this.group.add(this.streaks)
  }
}
