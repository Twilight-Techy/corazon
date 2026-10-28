import * as THREE from 'three'
import { pathAt } from './path.js'

const vert = /* glsl */ `
  uniform float uTime, uVel, uSeed;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec3 p = position;
    float bend = sin(uv.x * 3.14159);
    p.z -= bend * (0.18 + uVel * 0.6);
    p.z += sin(p.y * 2.0 + uTime * 1.3 + uSeed) * 0.05;
    p.y += sin(uv.x * 3.14159) * uVel * 0.25;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const frag = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uTime, uVel, uLoaded, uAspect, uImgAspect;
  varying vec2 vUv;
  varying float vDepth;

  float sdRound(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    // object-fit: cover
    vec2 uv = vUv - 0.5;
    if (uImgAspect > uAspect) uv.x *= uAspect / uImgAspect; else uv.y *= uImgAspect / uAspect;
    uv = uv * (0.92 - min(abs(uVel), 1.0) * 0.06) + 0.5;

    float shift = uVel * 0.025;
    vec3 col;
    col.r = texture2D(uTex, uv + vec2(0.0, shift)).r;
    col.g = texture2D(uTex, uv).g;
    col.b = texture2D(uTex, uv - vec2(0.0, shift)).b;

    // placeholder shimmer until the texture arrives
    vec3 wait = vec3(0.12, 0.05, 0.09) + 0.05 * sin(vUv.y * 20.0 + uTime * 3.0);
    col = mix(wait, col, uLoaded);

    // fade from duotone in the distance to full colour up close
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 duo = mix(vec3(0.09, 0.03, 0.12), vec3(1.0, 0.55, 0.72), lum);
    col = mix(duo, col, smoothstep(22.0, 9.0, vDepth));

    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float d = sdRound(p, vec2(uAspect, 1.0) * 0.5, 0.05);
    float alpha = smoothstep(0.004, -0.004, d);
    float edge = smoothstep(0.012, 0.0, abs(d + 0.018)) * 0.7;
    col += vec3(1.0, 0.6, 0.78) * edge * smoothstep(30.0, 8.0, vDepth);

    // soft vignette inside the frame
    col *= 0.75 + 0.25 * smoothstep(0.75, 0.2, length(vUv - 0.5));

    col *= 0.82;
    float fade = smoothstep(46.0, 20.0, vDepth) * smoothstep(0.6, 2.4, vDepth);
    gl_FragColor = vec4(col, alpha * fade);
  }
`

export class Gallery {
  constructor(items, manager) {
    this.group = new THREE.Group()
    this.items = []
    this.shared = { uTime: { value: 0 }, uVel: { value: 0 } }
    const loader = new THREE.TextureLoader(manager)
    loader.setCrossOrigin('anonymous')
    const geo = new THREE.PlaneGeometry(1, 1, 24, 24)
    const W = 2.25, H = 2.8
    const tmp = new THREE.Vector3()

    items.forEach((item, i) => {
      const uniforms = {
        ...this.shared,
        uTex: { value: null },
        uLoaded: { value: 0 },
        uAspect: { value: W / H },
        uImgAspect: { value: 0.8 },
        uSeed: { value: Math.random() * 10 },
      }
      const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.scale.set(W, H, 1)
      const z = -12 - i * 7
      pathAt(z, tmp)
      const side = i % 2 ? 1 : -1
      const base = new THREE.Vector3(tmp.x + side * 2.15, tmp.y + Math.sin(i * 1.9) * 0.7, z)
      mesh.position.copy(base)
      this.W = W; this.H = H
      mesh.rotation.y = -side * 0.32
      mesh.rotation.z = side * 0.04
      this.group.add(mesh)
      this.items.push({ mesh, base, z, side, uniforms, phase: Math.random() * 6, pathX: tmp.x })

      loader.load(item.src, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.minFilter = THREE.LinearMipmapLinearFilter
        tex.anisotropy = 4
        uniforms.uTex.value = tex
        uniforms.uImgAspect.value = tex.image.width / tex.image.height
        uniforms.uLoaded.value = 1
      })
    })
  }

  // pull photos toward the path (and shrink them) on narrow portrait screens
  layout(aspect) {
    const k = THREE.MathUtils.clamp((aspect - 0.45) / 0.75, 0, 1)
    const offset = THREE.MathUtils.lerp(0.95, 2.15, k)
    const scale = THREE.MathUtils.lerp(0.72, 1, k)
    this.items.forEach((it) => {
      it.base.x = it.pathX + it.side * offset
      it.mesh.position.x = it.base.x
      it.mesh.scale.set(this.W * scale, this.H * scale, 1)
    })
  }

  // index of the photo the camera is currently "with"
  focusIndex(camZ) {
    let best = -1
    let bestD = Infinity
    this.items.forEach((it, i) => {
      const d = camZ - it.z // positive when photo is ahead
      if (d > 1.5 && d < 11 && d < bestD) { bestD = d; best = i }
    })
    return best
  }

  update(t, mouse) {
    this.items.forEach((it) => {
      it.mesh.position.y = it.base.y + Math.sin(t * 0.6 + it.phase) * 0.12
      it.mesh.rotation.x = mouse.y * 0.08
      it.mesh.rotation.y = -it.side * 0.32 + mouse.x * 0.1
    })
  }
}
