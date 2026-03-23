import {Generator} from "./new-billiard";
import {includedAngle, SpherePoint, SphericalArc, SphericalCircle} from "../geometry/spherical";
import {ColorRepresentation, Mesh, Vector3} from "three";
import {closeEnough} from "../math-helpers";

export interface SphericalInnerState {
  time: number;
  angle: number;
}

export interface SphericalChord {
  start: SpherePoint;
  end: SpherePoint;
}

export interface SphericalRay {
  src: SpherePoint;
  dir: Vector3;
}

export interface SphericalInner {
  innerArea(start: SphericalInnerState): SphericalInnerState;
  innerLength(start: SphericalInnerState): SphericalInnerState;
  iterateInner(start: SphericalInnerState, generator: Generator, iterations: number): SphericalChord[];
}

export interface SphericalOuter {
  outerArea(start: SpherePoint): SpherePoint[];
  outerLength(start: SpherePoint): SpherePoint[];
  iterateOuterArea(start: SpherePoint, iterations: number): SpherePoint[];
  iterateOuterLength(start: SpherePoint, iterations: number): SpherePoint[];
}

abstract class SphericalCurve {
  abstract point(time: number): SpherePoint;

  abstract time(point: SpherePoint): number;

  abstract tangentVector(time: number): Vector3;

  abstract containsPoint(point: SpherePoint): boolean;

  abstract pointOnBoundary(point: SpherePoint): boolean;

  abstract mesh(n: number, color: ColorRepresentation, stereograph: boolean): Mesh;

  abstract points(n: number, stereograph: boolean): Vector3[];
}

export abstract class SphericalInnerBilliardTable extends SphericalCurve implements SphericalInner {
  abstract intersect(ray: SphericalRay): number;

  abstract intersectSmallCircle(circle: SphericalCircle): SpherePoint[];

  private stateToRay(state: SphericalInnerState): SphericalRay {
    const pt = this.point(state.time);
    const dir = this.tangentVector(state.time).applyAxisAngle(pt.coords, state.angle);
    const axis = pt.coords.clone().cross(dir).normalize();
    return {
      src: new SpherePoint(pt.coords.clone().applyAxisAngle(axis, 1e-6)),
      dir: dir.applyAxisAngle(axis, 1e-6),
    }
  }

  innerArea(state: SphericalInnerState): SphericalInnerState {
    const x = this.point(state.time);
    const xTangent = this.tangentVector(state.time);
    const yTime = this.intersect(this.stateToRay(state));
    const y = this.point(yTime);
    const yTangent = this.tangentVector(yTime);
    const lexell = SphericalCircle.withTangent(y.antipode, yTangent.multiplyScalar(-1), x);
    const candidates = this.intersectSmallCircle(lexell);

    const sign = Math.sign(xTangent.dot(lexell.center.coords));
    let z: SpherePoint | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let candidate of candidates) {
      const dist = sign * includedAngle(x, lexell.center, candidate)
      if (dist < 0) continue;
      if (dist < bestDist) {
        bestDist = dist;
        z = candidate;
      }
    }

    if (!z) throw Error('no forward image');

    return {time: yTime, angle: yTangent.angleTo(new SphericalArc(y, z).t2)}
  }

  innerLength(state: SphericalInnerState): SphericalInnerState {
    const x = this.point(state.time);
    const time = this.intersect(this.stateToRay(state));
    const y = this.point(time);
    const yTangent = this.tangentVector(time);
    const angle = yTangent.angleTo(new SphericalArc(x, y).t2);
    return {
      time,
      angle,
    };
  }

  iterateInner(start: SphericalInnerState, generator: Generator, iterations: number): SphericalChord[] {
    let chords = [];
    let state = start;
    for (let i = 0; i < iterations; i++) {
      let next: SphericalInnerState;
      try {
        switch (generator) {
        case Generator.LENGTH:
          next = this.innerLength(state);
          break;
        case Generator.AREA:
          next = this.innerArea(state);
          break;
        }
        chords.push({start: this.point(state.time), end: this.point(next.time)});
        state = next;
      } catch (e) {
        console.warn(e);
        break;
      }
    }
    return chords;
  }
}

export abstract class SphericalOuterBilliardTable extends SphericalInnerBilliardTable implements SphericalOuter {
  iterateOuterArea(start: SpherePoint, iterations: number): SpherePoint[] {
    throw new Error("Method not implemented.");
  }

  iterateOuterLength(start: SpherePoint, iterations: number): SpherePoint[] {
    throw new Error("Method not implemented.");
  }

  abstract leftTangentPoint(point: SpherePoint): SpherePoint;

  abstract rightTangentPoint(point: SpherePoint): SpherePoint;

  outerArea(point: SpherePoint, inverse = false): SpherePoint[] {
    let invertPoint: SpherePoint;
    if (inverse) {
      invertPoint = this.leftTangentPoint(point);
    } else {
      invertPoint = this.rightTangentPoint(point);
    }
    return [point.reflectThrough(invertPoint), invertPoint];
  }

  outerLength(point: SpherePoint, inverse = false): SpherePoint[] {
    return [];
  }

  iterateOuter(start: SpherePoint, iters: number): SpherePoint[][] {
    if (this.containsPoint(start) || this.containsPoint(start.antipode)) {
      console.log(`point or antipode is in interior of table: <${start.x}, ${start.y}>`);
      return [[start], []];
    }
    if (this.pointOnBoundary(start) || this.pointOnBoundary(start.antipode)) {
      console.log(`point or antipode is on boundary of table: <${start.x}, ${start.y}>`);
      return [[start], []];
    }
    const points = [start];
    const centers = [];
    let point = start;
    for (let i = 0; i < iters; i++) {
      let newPoint, center;
      try {
        [newPoint, center] = this.outerArea(point);
        points.push(newPoint);
        centers.push(center);
      } catch (e) {
        // console.log(e);
        return [points, centers];
      }
      point = newPoint;
      if (closeEnough(newPoint.distanceTo(start), 0)) break;
    }
    return [points, centers];
  }

  abstract preimages(flavor: Generator, iterations: number): SphericalArc[];
}