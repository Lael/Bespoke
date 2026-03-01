import {Shape, Vector2} from "three";
import {
  HyperbolicCircle,
  HyperbolicModel,
  HyperCycle,
  HyperGeodesic,
  HyperIsometry,
  HyperPoint
} from "../hyperbolic/hyperbolic";
import {Generator} from "./new-billiard";
import {HyperbolicRay} from "../../app/demos/tile-billiards/hyperbolic-ray";
import {closeEnough, normalizeAngle} from "../math-helpers";
import {AffineCircle} from "../geometry/affine-circle";
import {Complex} from "../complex/complex";

export type HyperbolicInnerState = {
  time: number;
  angle: number;
}

export type HyperbolicInnerAreaResult = {
  state: HyperbolicInnerState;
  hyperCycle: HyperCycle;
}

export type HyperbolicChord = {
  startTime: number;
  startAngle: number;
  endTime: number;
  endAngle: number;

  start: HyperPoint;
  end: HyperPoint;
  geodesic: HyperGeodesic | null;
}

export interface HyperbolicOuterLengthResult {
  point: HyperPoint;
  circle: HyperbolicCircle;
}

export interface HyperbolicOuterLengthRecords {
  orbit: HyperPoint[];
  centers: HyperPoint[];
  firstCircle: HyperbolicCircle | null;
}

export interface HyperbolicInner {
  innerArea(start: HyperbolicInnerState): HyperbolicInnerAreaResult;
  innerLength(start: HyperbolicInnerState): HyperbolicInnerState;
  iterateInner(start: HyperbolicInnerState, generator: Generator, iterations: number): HyperbolicChord[];
}

export interface HyperbolicOuter {
  outerArea(start: HyperPoint): HyperPoint;
  outerLength(start: HyperPoint): HyperbolicOuterLengthResult;
  iterateOuterArea(start: HyperPoint, iterations: number): HyperPoint[];
  iterateOuterLength(start: HyperPoint, iterations: number): HyperbolicOuterLengthRecords;
}

abstract class HyperbolicCurve {
  abstract width(angle: number): number;

  abstract point(time: number): HyperPoint;

  abstract time(point: HyperPoint): number;

  abstract tangentVector(time: number, model: HyperbolicModel): Vector2;

  heading(time: number, model: HyperbolicModel): number {
    return this.tangentVector(time, model).angle();
  }

  outwardNormal(time: number, model: HyperbolicModel): Vector2 {
    let tv = this.tangentVector(time, model);
    return new Vector2(tv.y, -tv.x);
  }

  abstract interior(point: HyperPoint): boolean;

  abstract boundary(point: HyperPoint): boolean;

  abstract shape(model: HyperbolicModel): Shape;
}

export abstract class HyperbolicInnerBilliardTable extends HyperbolicCurve implements HyperbolicInner {
  abstract intersect(ray: HyperbolicRay): number;

  abstract intersectHyperCycle(hc: HyperCycle): HyperPoint[];

  innerLength(state: HyperbolicInnerState): HyperbolicInnerState {
    const pt = this.point(state.time);
    const time = this.intersect(this.innerStateToRay(state));
    const rayHeading = new HyperGeodesic(pt, this.point(time)).heading2() + Math.PI;
    const angle = Math.acos(this.tangentVector(time, HyperbolicModel.POINCARE).normalize().dot(new Vector2(Math.cos(rayHeading), Math.sin(rayHeading))));
    return {time, angle};
  }

  private innerStateToRay(state: HyperbolicInnerState): HyperbolicRay {
    const poincareDir = this.heading(state.time, HyperbolicModel.POINCARE) + state.angle;
    const pt = this.point(state.time);
    const pr = HyperGeodesic.poincareRay(pt, poincareDir);
    const src = pt.translate(pr.p2, 1e-9);
    return {
      src,
      poincareDir
    };
  }

  innerArea(state: HyperbolicInnerState, debug: boolean = false): HyperbolicInnerAreaResult {
    // cast ray, find tangent direction, find hyperCycle
    // intersect again
    const x = this.point(state.time);
    const xHeading = this.heading(state.time, HyperbolicModel.POINCARE);
    const yTime = this.intersect(this.innerStateToRay(state));
    const y = this.point(yTime);
    const yHeading = this.heading(yTime, HyperbolicModel.POINCARE);
    // Create "Lexell Ray" and intersect
    // TODO: special case in which hypercycle should be a straight line
    const lexell = new HyperCycle(AffineCircle.withTangent(y.poincare, yHeading, AffineCircle.UNIT_CIRCLE.invert(x.poincare)));
    const hyperCycle = new HyperCycle(
      AffineCircle.fromThreePoints(
        x.poincare,
        lexell.i1.poincare,
        lexell.i2.poincare
      )
    );

    // Intersect with this thing
    const candidates = this.intersectHyperCycle(hyperCycle);

    // sign > 0 means want "forward" points along hyperCycle
    const sign = Math.sign(
      Complex.polar(1, hyperCycle.poincareCircle.center.heading(x.poincare)).dot(
        Complex.polar(1, xHeading)
      ));
    const start = normalizeAngle(
      x.poincare.minus(hyperCycle.poincareCircle.center).argument(),
      hyperCycle.poincareCircle.center.argument()
    );
    // want branch cut along hyperCycle.poincareCircle.center.argument() so that points along hyperCycle have ordering

    // Choose best one
    let best: HyperPoint | null = null;
    let bestDiff = Number.POSITIVE_INFINITY;
    for (let c of candidates) {
      const diff = normalizeAngle(
        c.poincare.minus(hyperCycle.poincareCircle.center).argument(), hyperCycle.poincareCircle.center.argument()
      ) - start;
      const signedDiff = diff * sign;
      if (signedDiff < 0 || closeEnough(diff, 0)) continue;
      if (signedDiff < bestDiff) {
        bestDiff = signedDiff;
        best = c;
      }
    }
    if (best === null) {
      // return {
      //   state: {
      //     time: yTime,
      //     deltaAngle: Math.PI / 2,
      //   }, hyperCycle: hyperCycle
      // };
      if (debug) {
        return {
          state,
          hyperCycle,
        }
      }
      throw Error('no forward image');
    }

    const absAngle = new HyperGeodesic(y, best).heading1();
    const angle = normalizeAngle(absAngle - yHeading, yHeading);
    return {
      state: {
        time: yTime,
        angle,
      }, hyperCycle: hyperCycle
    };
  }

  iterateInner(start: HyperbolicInnerState, generator: Generator, iterations: number): HyperbolicChord[] {
    let state = start;
    const chords = [];
    let fn: (s: HyperbolicInnerState) => HyperbolicInnerState;
    switch (generator) {
    case Generator.LENGTH:
      fn = this.innerLength.bind(this);
      break;
    case Generator.AREA:
      fn = (s) => this.innerArea(s).state;
      break;
    default:
      throw Error('Unknown generator');
    }
    for (let i = 0; i < iterations; i++) {
      let next;
      try {
        next = fn(state);
      } catch (e) {
        console.error(e);
        return chords;
      }
      const p1 = this.point(state.time);
      const p2 = this.point(next.time);
      chords.push({
        startTime: state.time, startAngle: state.angle,
        endTime: next.time, endAngle: next.angle,
        start: p1, end: p2,
        geodesic: p1.equals(p2) ? null : new HyperGeodesic(p1, p2)
      });
      if (closeEnough(start.time, next.time) && closeEnough(start.angle, next.angle)) {
        console.log(`Periodic with period ${i + 1}`);
        break;
      }
      state = next;
    }
    return chords;
  }
}

export abstract class HyperbolicOuterBilliardTable extends HyperbolicInnerBilliardTable implements HyperbolicOuter {
  abstract tangentTowardsPoint(point: HyperPoint): HyperPoint;

  abstract tangentFromPoint(point: HyperPoint): HyperPoint;

  abstract circleTangentLine(circle: HyperbolicCircle, towardCircle: boolean): HyperGeodesic;

  outerArea(start: HyperPoint, reverse: boolean = false): HyperPoint {
    const rp = reverse ? this.tangentTowardsPoint(start) : this.tangentFromPoint(start);
    const inversion = HyperIsometry.pointInversion(rp);
    return inversion.apply(start);
  }

  outerLength(start: HyperPoint, reverse: boolean = false): HyperbolicOuterLengthResult {
    const towardsPoint = this.tangentTowardsPoint(start);
    const fromPoint = this.tangentFromPoint(start);
    const tp = reverse ? fromPoint : towardsPoint;
    const fp = !reverse ? fromPoint : towardsPoint;
    const circle = hyperbolicFourthCircle(
      start,
      new HyperGeodesic(start, fp),
      new HyperGeodesic(tp, start),
      fp);
    const l2 = new HyperGeodesic(start, fp);
    const l3 = this.circleTangentLine(circle, reverse);
    const point = l2.intersectIdeal(l3);

    if (!point) throw Error('no forward map');

    return {
      point,
      circle,
    };
  }

  iterateOuterLength(start: HyperPoint, iterations: number): HyperbolicOuterLengthRecords {
    if (this.interior(start)) return {orbit: [start], centers: [], firstCircle: null};
    let state = start;
    const orbit: HyperPoint[] = [state];
    const centers: HyperPoint[] = [];
    let firstCircle: HyperbolicCircle | null = null;
    let result;
    try {
      result = this.outerLength(state);
      firstCircle = result.circle;
    } catch (e) {
      console.warn(e);
      return {orbit, centers, firstCircle};
    }
    for (let i = 0; i < iterations; i++) {
      try {
        result = this.outerLength(state);
      } catch (e) {
        console.warn(e);
        break;
      }
      orbit.push(result.point);
      state = result.point;
      centers.push(result.circle.center);
    }
    return {orbit, centers, firstCircle};
  }

  iterateOuterArea(start: HyperPoint, iterations: number): HyperPoint[] {
    if (this.interior(start)) return [start];
    const orbit = [start];
    let state = start;
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

  abstract outerAreaPreimages(iterations: number): HyperGeodesic[];

  abstract outerLengthPreimages(iterations: number): HyperGeodesic[];

  preimages(generator: Generator, iterations: number): HyperGeodesic[] {
    switch (generator) {
    case Generator.AREA:
      return this.outerAreaPreimages(iterations);
    case Generator.LENGTH:
      return this.outerLengthPreimages(iterations);
    }
  }
}

function hyperbolicFourthCircle(x: HyperPoint,
                                g1: HyperGeodesic,
                                g2: HyperGeodesic,
                                tp: HyperPoint): HyperbolicCircle {
  const l = x.distance(tp);

  const perp1 = g1.perpendicular(tp);
  const perp2 = g2.perpendicular(x.translate(g2.start, -l));
  const c = perp1.intersect(perp2);
  // console.log(x, g1, g2, tp, perp1, perp2, c);
  if (!c) throw Error('no circle');
  const r = c.distance(tp);

  return new HyperbolicCircle(c, r);
}