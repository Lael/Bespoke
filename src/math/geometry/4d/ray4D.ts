import {Vector4} from "three";

export interface Ray4D {
    src: Vector4;
    dir: Vector4;
}

export interface HyperplaneRayIntersection {
    t: number,
    point: Vector4,
}

export interface PolytopeRayCollision {
    t: number;
    point: Vector4;
    facet: number;
}