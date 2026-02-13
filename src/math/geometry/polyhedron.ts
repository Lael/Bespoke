import {Object3D, Vector3} from "three";
import {Plane} from "./plane";

interface Edge {
  startIndex: number,
  endIndex: number,
}

interface Face {
  indices: number[],
  plane: Plane,
}

interface PolyhedronStyle {

}

export class Polyhedron {
  constructor(readonly vertices: Vector3[], readonly edges: Edge[], readonly faces: Face[]) {
    // Verify that vertices on each face are coplanar.
  }

  get volume(): number {
    throw Error('NYI');
  }

  get surfaceArea(): number {
    throw Error('NYI');
  }

  drawable(style: PolyhedronStyle): Object3D {
    throw Error('NYI');
  }
}

