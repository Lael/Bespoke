import {EuclideanShape, NormalPair, ShapeRayCollision} from "./euclidean-shape";
import {EuclideanRay} from "./euclidean-ray";
import {
  BufferGeometry,
  CircleGeometry,
  ColorRepresentation,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Path,
  Vector2
} from "three";
import {Line as GeoLine} from './line';
import {AffineCircle} from "./affine-circle";
import {Complex} from "../complex/complex";
import {EPSILON, normalizeAngle} from "../math-helpers";

export interface EllipseRayCollision extends ShapeRayCollision {

}

export class EuclideanEllipse implements EuclideanShape {
  a: number;
  b: number;

  constructor(readonly eccentricity: number = 0,
              readonly center: Vector2 = new Vector2(),
              readonly rotation: number = 0,
              readonly size: number = 1) {
    this.a = size;
    this.b = this.a * Math.sqrt(1 - this.eccentricity * this.eccentricity);
  }

  drawable(color: ColorRepresentation): Group {
    let g = new Group();
    let path = new Path();
    path.absellipse(this.center.x, this.center.y,
      this.a, this.b, 0, 2 * Math.PI, false, this.rotation);
    let l = new Line(new BufferGeometry().setFromPoints(path.getPoints(360)), new LineBasicMaterial({color}));
    g.add(l);
    let geo = new CircleGeometry(0.01);
    let mat = new MeshBasicMaterial({color});
    let f1 = new Mesh(geo, mat);
    let f2 = new Mesh(geo, mat);
    let c = Math.sqrt(this.a * this.a - this.b * this.b);
    f1.position.set(c * Math.cos(this.rotation), c * Math.sin(this.rotation), 1);
    f2.position.set(-c * Math.cos(this.rotation), -c * Math.sin(this.rotation), 1);
    g.add(f1, f2);
    return g;
  }

  castRay(ray: EuclideanRay): EllipseRayCollision {
    let src = ray.src.clone()
      .sub(this.center)
      .rotateAround(new Vector2(), -this.rotation)
      .divide(new Vector2(this.a, this.b))
    let dir = ray.dir.clone()
      .rotateAround(new Vector2(), -this.rotation)
      .divide(new Vector2(this.a, this.b))
    let line = GeoLine.srcDir(src, dir);
    let intersections = new AffineCircle(new Complex(), 1)
      .intersectLine(line).map(i => i.toVector2());
    for (let i of intersections) {
      if (i.distanceTo(src) < EPSILON) continue;
      let angle = normalizeAngle(i.angle(), 0) / (2 * Math.PI);
      return {
        point: i.multiply(new Vector2(this.a, this.b)).rotateAround(new Vector2(), this.rotation).add(this.center),
        paramTime: angle,
      }
    }
    throw Error('no collision');
  }

  // cast(t: number, alpha: number): Vector2 {
  //     const start = this.point(t);
  //     const v = this.tangent(t).rotateAround(new Vector2(), alpha * Math.PI);
  //     const line = GeoLine.srcDir(
  //         new Complex(start.x / this.a, start.y / this.b),
  //         new Complex(v.x / this.a, v.y / this.b)
  //     );
  //
  //     const intersections = new AffineCircle(new Complex(), 1).intersectLine(line);
  //     for (let i of intersections) {
  //         let iv = new Vector2(i.x * this.a, i.y * this.b);
  //         if (iv.distanceTo(start) < 0.000_001) continue;
  //         const newT = normalizeAngle(i.argument(), 0) / (2 * Math.PI);
  //
  //         const endPoint = this.point(newT);
  //         const endTangent = this.tangent(newT);
  //         const newAlpha = normalizeAngle(Math.PI + (endTangent.angle() - (start.sub(endPoint)).angle())) / Math.PI;
  //         return new Vector2(newT, newAlpha);
  //     }
  //     throw Error('no intersection');
  // }

  rotate(angle: number): EuclideanShape {
    return new EuclideanEllipse(
      this.eccentricity,
      this.center.clone(),
      this.rotation + angle,
      this.size,
    );
  }

  scale(factor: number): EuclideanShape {
    return new EuclideanEllipse(
      this.eccentricity,
      this.center.clone(),
      this.rotation,
      this.size * factor,
    );
  }

  translate(t: Vector2): EuclideanShape {
    return new EuclideanEllipse(
      this.eccentricity,
      this.center.clone().add(t),
      this.rotation,
      this.size,
    );
  }

  param(t: number): NormalPair {
    let theta = t * Math.PI * 2;
    let point = new Vector2(this.a * Math.cos(theta), this.b * Math.sin(theta))
      .rotateAround(new Vector2(), this.rotation)
      .add(this.center);
    let normal = new Vector2(-this.a * Math.sin(theta), this.b * Math.cos(theta))
      .normalize()
      .rotateAround(new Vector2(), this.rotation - Math.PI / 2);
    return {point, normal};
  }

  corners(): number[] {
    return [];
  }
}