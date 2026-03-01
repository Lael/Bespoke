import {Vector2} from "three";
import {EuclideanRay} from "./euclidean-ray";

export interface ShapeRayCollision {
  point: Vector2;
  paramTime: number;
}

export interface NormalPair {
  point: Vector2;
  normal: Vector2;
}

export interface ShapeData {
  path: Vector2[];
  dots: Vector2[];
}

export interface EuclideanShape {
  scale(factor: number): EuclideanShape;
  rotate(angle: number): EuclideanShape;
  translate(t: Vector2): EuclideanShape;
  castRay(ray: EuclideanRay): ShapeRayCollision;
  shapeData(): ShapeData;
  param(t: number): NormalPair;
  corners(): number[];
  area(): number;
  support(p: Vector2): number;
}