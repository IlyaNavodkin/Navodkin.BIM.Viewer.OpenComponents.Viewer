import * as THREE from "three";

export function expandSphere(sphere: THREE.Sphere, multiplier: number): THREE.Sphere {
  const expandedSphere = new THREE.Sphere();
  expandedSphere.center.copy(sphere.center);
  expandedSphere.radius = sphere.radius * multiplier;
  return expandedSphere;
}
