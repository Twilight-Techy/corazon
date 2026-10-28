import * as THREE from 'three'

const PALETTES = [
  ['#ff3d7f', '#ff8fb1', '#ffffff'],
  ['#f6d6b0', '#ffd166', '#ffffff'],
  ['#9b7bff', '#c9b8ff', '#ff8fb1'],
  ['#7be0ff', '#ffffff', '#9b7bff'],
].map((p) => p.map((c) => new THREE.Color(c)))

// GPU fireworks: all motion is computed in the vertex shader from birth data.
export class Fireworks {
  constructor(max = 14000) {
    this.max = max
    this.i = 0
    this.time = 0
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 3), 3))
    g.setAttribute('aVel', new THREE.BufferAttribute(new Float32Array(max * 3), 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(max * 3), 3))
    g.setAttribute('aBirth', new THREE.BufferAttribute(new Float32Array(max).fill(-999), 1))
    g.setAttribute('aLife', new THREE.BufferAttribute(new Float32Array(max).fill(1), 1))
    this.geo = g
    this.uniforms = { uTime: { value: 0 }, uPixelRatio: { value: 1 } }
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime, uPixelRatio;
        attribute vec3 aVel, aColor;
        attribute float aBirth, aLife;
        varying vec3 vColor;
        varying float vA;
        void main() {
          float t = uTime - aBirth;
          float k = 1.6;
          vec3 p = position + aVel * (1.0 - exp(-k * t)) / k;
          p.y -= 0.55 * t * t * 0.5;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float life = clamp(t / aLife, 0.0, 1.0);
          float flick = 0.6 + 0.4 * sin(t * 40.0 + position.x * 100.0);
          gl_PointSize = (26.0 * (1.0 - life) + 6.0) * uPixelRatio / max(-mv.z, 0.5) * mix(1.0, flick, life);
          vA = step(0.0, t) * (1.0 - life) * (1.0 - life);
          vColor = aColor * (1.0 + (1.0 - life) * 1.5);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor, a * a * vA);
        }
      `,
    })
    this.points = new THREE.Points(g, mat)
    this.points.frustumCulled = false
  }

  burst(origin, { count = 900, speed = 3.2, shape = 'sphere', delay = 0, palette } = {}) {
    const pal = palette || PALETTES[(Math.random() * PALETTES.length) | 0]
    const a = this.geo.attributes
    const v = new THREE.Vector3()
    const scale = 1 / 17
    for (let n = 0; n < count; n++) {
      const k = this.i++ % this.max
      if (shape === 'heart') {
        const t = Math.random() * Math.PI * 2
        const x = 16 * Math.pow(Math.sin(t), 3)
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
        v.set(x * scale, y * scale + 0.15, (Math.random() - 0.5) * 0.15).multiplyScalar(speed * (0.92 + Math.random() * 0.08))
      } else {
        v.randomDirection().multiplyScalar(speed * (0.75 + Math.random() * 0.25))
        if (shape === 'ring') v.z *= 0.12
      }
      const c = pal[(Math.random() * pal.length) | 0]
      a.position.setXYZ(k, origin.x, origin.y, origin.z)
      a.aVel.setXYZ(k, v.x, v.y, v.z)
      a.aColor.setXYZ(k, c.r, c.g, c.b)
      a.aBirth.setX(k, this.time + delay + Math.random() * 0.04)
      a.aLife.setX(k, 1.8 + Math.random() * 1.4)
    }
    for (const key of ['position', 'aVel', 'aColor', 'aBirth', 'aLife']) a[key].needsUpdate = true
  }

  update(dt) {
    this.time += dt
    this.uniforms.uTime.value = this.time
  }
}
