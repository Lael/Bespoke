import {Group, Vector2} from "three";
import {EuclideanRay} from "./euclidean-ray";

export interface ShapeRayCollision {
    point: Vector2;
    paramTime: number;
}


export interface NormalPair {
    point: Vector2,
    normal: Vector2,
}

export interface EuclideanShape {
    scale(factor: number): EuclideanShape;
    rotate(angle: number): EuclideanShape;
    translate(t: Vector2): EuclideanShape;
    castRay(ray: EuclideanRay): ShapeRayCollision;
    drawable(color: number): Group;
    param(t: number): NormalPair;
}