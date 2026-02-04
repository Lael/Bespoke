import {Shape, Vector2} from "three";
import {affineFourthCircle} from "./tables";
import {EuclideanRay} from "../geometry/euclidean-ray";
import {closeEnough, normalizeAngle, polar} from "../math-helpers";
import {Line} from "../geometry/line";
import {LineSegment} from "../geometry/line-segment";
import {AffineCircle} from "../geometry/affine-circle";
import {AffinePolygonTable} from "./affine-polygon-table";
import {Generator} from "./new-billiard";
import {Complex} from "../complex/complex";

export type AffineInnerState = {
  time: number;
  angle: number;
}

export type AffineChord = {
  startTime: number;
  startAngle: number;
  endTime: number;
  endAngle: number;

  p1: Vector2;
  p2: Vector2;
}

export class Straight {
  line: Line;

  constructor(readonly start: Vector2,
              readonly end: Vector2,
              readonly infinite: boolean,
              line?: Line,
  ) {
    if (line) this.line = line;
    else this.line = Line.throughTwoPoints(Complex.fromVector2(start), Complex.fromVector2(end));
  }

  intersect(other: Straight): Vector2 | null {
    let intersection: Vector2;
    if (!other.infinite) {
      // if both points are on same side of line, return null without having to intersect lines
      const s = this.line.a * other.start.x + this.line.b * other.start.y + this.line.c;
      const e = this.line.a * other.end.x + this.line.b * other.end.y + this.line.c;
      if (s * e > 0.000_01) return null;
    }
    try {
      intersection = this.line.intersectLine(other.line).toVector2();
    } catch (e) {
      return null;
    }
    const valid = this.containsPoint(intersection) && other.containsPoint(intersection);
    return valid ? intersection : null;
  }

  containsPoint(point: Vector2): boolean {
    if (!this.line.containsPoint(Complex.fromVector2(point))) return false;
    const d1 = point.distanceTo(this.start);
    const d2 = point.distanceTo(this.end);
    // Between start and end
    if (closeEnough(d1 + d2, this.start.distanceTo(this.end))) return true;
    return this.infinite && d1 > d2;
  }
}

export interface AffineInner {
  innerArea(start: AffineInnerState): AffineInnerState;
  innerLength(start: AffineInnerState): AffineInnerState;
  iterateInner(start: AffineInnerState, generator: Generator, iterations: number): AffineChord[];
}

export interface AffineOuter {
  outerArea(start: Vector2): Vector2;
  outerLength(start: Vector2): AffineOuterLengthResult;
  iterateOuterArea(start: Vector2, iterations: number): Vector2[];
  iterateOuterLength(start: Vector2, iterations: number): AffineOuterLengthRecords;
}

abstract class AffineCurve {
  abstract width(angle: number): number;

  abstract point(time: number): Vector2;

  abstract time(point: Vector2): number;

  abstract tangentVector(time: number): Vector2;

  heading(time: number): number {
    return this.tangentVector(time).angle();
  }

  outwardNormal(time: number): Vector2 {
    let tv = this.tangentVector(time);
    return new Vector2(tv.y, -tv.x);
  }

  abstract interior(point: Vector2): boolean;

  abstract boundary(point: Vector2): boolean;

  abstract shape(n: number): Shape;
}

export abstract class AffineInnerBilliardTable extends AffineCurve implements AffineInner {
  abstract intersect(ray: EuclideanRay): number;

  innerLength(state: AffineInnerState): AffineInnerState {
    const dir = polar(1, this.heading(state.time) + state.angle);
    const src = this.point(state.time).addScaledVector(dir, 1e-6);
    const time = this.intersect({src, dir});
    const angle = Math.acos(this.tangentVector(time).normalize().dot(dir));
    return {time, angle};
  }

  innerArea(state: AffineInnerState): AffineInnerState {
    const dir = polar(1, this.heading(state.time) + state.angle);
    const src = this.point(state.time).addScaledVector(dir, 1e-6);
    const yTime = this.intersect({src, dir});
    const yTan = this.tangentVector(yTime);
    const dot = this.outwardNormal(state.time).dot(yTan);
    if (closeEnough(dot, 0)) {
      return {time: yTime, angle: Math.acos(yTan.dot(dir))}
    }
    const parallel = yTan.multiplyScalar(-Math.sign(dot));
    const zTime = this.intersect({
      src: this.point(state.time).addScaledVector(dir, 1e-6),
      dir: parallel
    });
    const y = this.point(yTime);
    const z = this.point(zTime);
    return {time: yTime, angle: normalizeAngle(z.sub(y).angle() - this.heading(yTime), 0)};
  }

  iterateInner(start: AffineInnerState, generator: Generator, iterations: number): AffineChord[] {
    let state = start;
    const chords = [];
    for (let i = 0; i < iterations; i++) {
      let next: AffineInnerState;
      switch (generator) {
      case Generator.AREA:
        next = this.innerArea(state);
        break;
      case Generator.LENGTH:
        next = this.innerLength(state);
        break;
      }
      chords.push({
        startTime: state.time, startAngle: state.angle,
        endTime: next.time, endAngle: next.angle,
        p1: this.point(state.time), p2: this.point(next.time),
      });
      state = next;
      if (closeEnough(start.time, state.time) && closeEnough(start.angle, state.angle)) {
        console.log(`Periodic with period ${i + 1}`);
        break;
      }
    }
    return chords;
  }
}

export interface AffineOuterLengthResult {
  point: Vector2;
  circle: AffineCircle;
}

export interface AffineOuterLengthRecords {
  orbit: Vector2[];
  centers: Vector2[];
  firstCircle: AffineCircle | null;
}

export abstract class AffineOuterBilliardTable extends AffineInnerBilliardTable implements AffineOuter {
  abstract tangentTowardsPoint(point: Vector2): number;

  abstract tangentFromPoint(point: Vector2): number;

  abstract circleTangentLine(circle: AffineCircle, towardCircle: boolean): Line;

  // lineTowardsPoint(point: Vector2): Line {
  //   const tTime = this.tangentTowardsPoint(point);
  //   return Line.throughTwoPoints(this.point(tTime), point);
  // }
  //
  // lineFromPoint(point: Vector2): Line {
  //   const tTime = this.tangentFromPoint(point);
  //   return Line.throughTwoPoints(this.point(tTime), point);
  // }

  outerArea(start: Vector2, reverse: boolean = false): Vector2 {
    const t = reverse ? this.tangentTowardsPoint(start) : this.tangentFromPoint(start);
    const rp = this.point(t);
    return rp.add(rp.clone().sub(start));
  }

  outerLength(start: Vector2, reverse: boolean = false): AffineOuterLengthResult {
    console.clear();
    const towardsPoint = this.point(this.tangentTowardsPoint(start));
    const fromPoint = this.point(this.tangentFromPoint(start));
    const tp = reverse ? fromPoint : towardsPoint;
    const fp = !reverse ? fromPoint : towardsPoint;
    const circle = affineFourthCircle(
      start,
      new LineSegment(start, fp),
      new LineSegment(tp, start),
      fp);
    const l2 = Line.throughTwoPoints(start, fp);
    const l3 = this.circleTangentLine(circle, reverse);
    const point = l2.intersectLine(l3).toVector2();
    if (this instanceof AffinePolygonTable && this.n === 4) {
      const p1 = tp;
      const p2 = fp;
      const p3 = this.point(this.tangentFromPoint(point));
      let s = '';
      for (let p of [p1, p2, p3]) {
        for (let [i, v] of this.vertices.entries()) {
          if (p.distanceToSquared(v) < 0.01) {
            s += `${i + 1}`;
            break;
          }
        }
      }
      // console.log(s);
      // if (point.x > 1 && Math.abs(point.y) < 1) console.log(point.x, point.y);
    }
    return {
      point,
      circle,
    };
  }

  iterateOuterArea(start: Vector2, iterations: number): Vector2[] {
    if (this.interior(start)) {
      return [start];
    }
    const orbit = [start.clone()];
    let state = start.clone();
    for (let i = 0; i < iterations; i++) {
      try {
        state = this.outerArea(state);
        orbit.push(state);
      } catch (e) {
        console.warn(e);
        break;
      }
    }
    return orbit;
  }

  iterateOuterLength(start: Vector2, iterations: number): AffineOuterLengthRecords {
    // console.clear();
    if (this.interior(start)) return {
      orbit: [start],
      centers: [],
      firstCircle: null,
    };
    let state = start.clone();
    const orbit: Vector2[] = [state];
    const centers: Vector2[] = [];
    let firstCircle: AffineCircle | null = null;
    try {
      const result = this.outerLength(state);
      firstCircle = result.circle;
    } catch (e) {
      console.warn(e);
      return {orbit, centers, firstCircle};
    }
    for (let i = 0; i < iterations; i++) {
      let result;
      try {
        result = this.outerLength(state);
      } catch (e) {
        console.warn(e);
        break;
      }
      orbit.push(result.point);
      state = result.point;
      centers.push(result.circle.center.toVector2());
    }
    return {orbit, centers, firstCircle};
  }

  abstract outerAreaPreimages(iterations: number): Straight[];

  abstract outerLengthPreimages(iterations: number): Straight[];

  preimages(generator: Generator, iterations: number): Straight[] {
    switch (generator) {
    case Generator.AREA:
      return this.outerAreaPreimages(iterations);
    case Generator.LENGTH:
      return this.outerLengthPreimages(iterations);
    }
  }
}

