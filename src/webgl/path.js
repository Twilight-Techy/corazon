import * as THREE from 'three'

// The flight path through the memory tunnel. z runs from +10 down to TUNNEL_END.
export const TUNNEL_START = 10
export const TUNNEL_END = -88
export const CAKE_POS = new THREE.Vector3(0, -1.3, -124)

export function pathAt(z, target = new THREE.Vector3()) {
  const k = THREE.MathUtils.smoothstep(-z, 4, 14) // dead straight while near the particles
  return target.set(Math.sin(z * 0.06) * 2.2 * k, Math.sin(z * 0.045 + 1.2) * 1.2 * k, z)
}
