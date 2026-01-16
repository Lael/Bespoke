import {Vector3} from "three";
import {Plane} from "./plane";

interface Edge {
  startIndex: number,
  endIndex: number,
}

interface Face {
  indices: number[],
  plane: Plane,
}

// Assumed to be convex!
export class Polyhedron {
  constructor(readonly vertices: Vector3[], readonly edges: Edge[], readonly faces: Face[]) {

  }
}

