import type * as THREE from 'three';
import type { Vec3 } from './blockout';

/** Objeto da estação que pode ser apontado, pego ou acionado. */
export interface Item {
  id: string;
  name: string;
  obj: THREE.Object3D;
  /** true quando o objeto pode ser segurado (garrafa, copo, utensílio...). */
  held: boolean;
  home: THREE.Vector3;
  homeQuaternion?: THREE.Quaternion;
  thrownSpecial?: boolean;
}

export type Target = (id: string, name: string, at: Vec3, held?: boolean, parent?: THREE.Object3D) => THREE.Group;

export interface Action {
  type: string;
  [key: string]: unknown;
}

export interface Result {
  ok: boolean;
  message: string;
}
