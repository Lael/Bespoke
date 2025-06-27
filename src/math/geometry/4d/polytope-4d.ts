import {PolytopeRayCollision, Ray4D} from "./ray4D";
import {Vector4} from "three";

export class Polytope4D {
    castRay(ray: Ray4D): PolytopeRayCollision | undefined {
        return undefined;
    }
}

// HyperCube
// Each face is a cube (8 vertices with one coordinate shared)
// A cube can be broken into
// (-1, -1, -1, -1)
// (-1, -1, -1, +1)
// (-1, -1, +1, -1)
// (-1, -1, +1, +1)

// (-1, +1, -1, -1)
// (-1, +1, -1, +1)
// (-1, +1, +1, -1)
// (-1, +1, +1, +1)

// (+1, -1, -1, -1)
// (+1, -1, -1, +1)
// (+1, -1, +1, -1)
// (+1, -1, +1, +1)

// (+1, +1, -1, -1)
// (+1, +1, -1, +1)
// (+1, +1, +1, -1)
// (+1, +1, +1, +1)

export type Simplex0 = Vector4;
export type Simplex1 = [Vector4, Vector4];
export type Simplex2 = [Vector4, Vector4, Vector4];
export type Simplex3 = [Vector4, Vector4, Vector4, Vector4];
export type Simplex4 = [Vector4, Vector4, Vector4, Vector4, Vector4];

