import {Complex} from "../complex/complex";
import {Mobius} from "../complex/mobius";
import {Line} from "../geometry/line";
import {AffineCircle} from "../geometry/affine-circle";
import {Segment} from "../geometry/segment";
import {fromThreePoints} from "../geometry/geometry-helpers";
import {LineSegment} from "../geometry/line-segment";
import {closeEnough, normalizeAngle} from "../math-helpers";
import {ArcSegment} from "../geometry/arc-segment";
import {GeodesicLike, PointLike} from "../geometry/geometry";
import {Vector2} from "three";

//new Mobius(new Complex(0, 1), new Complex(-1, 0), Complex.ONE, new Complex(0, -1));
const POINCARE_TO_HALF_PLANE = Mobius.mapThree(
  new Complex(0, -1), new Complex(0, 0), new Complex(0, 1),
  new Complex(0, 0), new Complex(0, 1), Complex.INFINITY);

export enum HyperbolicModel {
  POINCARE = 0,
  KLEIN = 1,
  HALF_PLANE = 2,
}

function validatePoincare(p: Complex): void {
  const m = p.modulusSquared();
  if (m > 1 && !closeEnough(m, 1)) {
    throw new Error(`${p} is not a valid point in the Poincaré model: its norm squared is ${m}`);
  }
}

function validateKlein(p: Complex): void {
  const m = p.modulusSquared();
  if (m > 1 && !closeEnough(m, 1)) {
    throw new Error(`${p} is not a valid point in the Klein model: its norm squared is ${m}`);
  }
}

function validateHalfPlane(p: Complex): void {
  if (p.imag < 0 && !closeEnough(p.imag, 0)) {
    throw new Error(`${p} is not a valid point in the half-plane model: its imaginary component is ${p.imag}`);
  }
}

export function poincareToKlein(p: Complex): Complex {
  validatePoincare(p);
  return p.scale(2 / (1 + p.modulusSquared()));
}

export function kleinToPoincare(p: Complex): Complex {
  validateKlein(p);
  return p.scale(1 / (1 + Math.sqrt(Math.max(1 - p.modulusSquared(), 0))));
}

export function poincareToHalfPlane(p: Complex): Complex {
  validatePoincare(p);
  return POINCARE_TO_HALF_PLANE.apply(p);
}

export function halfPlaneToPoincare(p: Complex): Complex {
  validateHalfPlane(p);
  return POINCARE_TO_HALF_PLANE.inverse().apply(p);
}

export function kleinToHalfPlane(p: Complex): Complex {
  return poincareToHalfPlane(kleinToPoincare(p));
}

export function halfPlaneToKlein(p: Complex): Complex {
  validateHalfPlane(p);
  return poincareToKlein(halfPlaneToPoincare(p));
}

export function trueToPoincareDistance(trueDistance: number) {
  return Math.tanh(trueDistance / 2);
}

export function poincareToTrueDistance(poincare: number) {
  return 2 * Math.atanh(poincare);
}

export function trueToKleinDistance(trueDistance: number) {
  const p = trueToPoincareDistance(trueDistance);
  return poincareToKleinDistance(p);
}

export function kleinToTrueDistance(klein: number) {
  const p = kleinToPoincareDistance(klein);
  return poincareToTrueDistance(p);
}

export function kleinToPoincareDistance(klein: number) {
  return klein / (1 + Math.sqrt(1 - klein * klein));
}

export function poincareToKleinDistance(poincare: number) {
  return poincare * (2 / (1 + poincare * poincare));
}

export class HyperPoint implements PointLike {
  readonly poincare: Complex;
  readonly klein: Complex;
  readonly halfPlane: Complex;

  constructor(p: Complex | Vector2, model: HyperbolicModel) {
    let c: Complex;
    if (p instanceof Vector2) c = Complex.fromVector2(p);
    else c = p;
    switch (model) {
    case HyperbolicModel.POINCARE:
      validatePoincare(c);
      this.poincare = c;
      this.klein = poincareToKlein(c);
      this.halfPlane = poincareToHalfPlane(c);
      break;
    case HyperbolicModel.KLEIN:
      validateKlein(c);
      this.poincare = kleinToPoincare(c);
      this.klein = c;
      this.halfPlane = kleinToHalfPlane(c);
      break;
    case HyperbolicModel.HALF_PLANE:
      validateHalfPlane(c);
      this.poincare = halfPlaneToPoincare(c);
      this.klein = halfPlaneToKlein(c);
      this.halfPlane = c;
      break;
    default:
      throw new Error('Unknown hyperbolic model');
    }
  }

  translate(p2: HyperPoint, distance: number): HyperPoint {
    if (distance === 0) return this;
    if (this.equals(p2)) throw Error('impossible translation');
    if (this.isIdeal()) return HyperPoint.fromKlein(this.klein);
    let hg = new HyperGeodesic(this, p2);
    let ap = hg.ip.klein.distance(this.klein);
    let pb = this.klein.distance(hg.iq.klein);
    let ed = ap / pb * Math.exp(2 * distance);
    let kd = (ed * pb - ap) / (ed + 1);
    let kp = this.klein.plus(hg.iq.klein.minus(this.klein).normalize(kd));
    return HyperPoint.fromKlein(kp);
  }

  resolve(model?: HyperbolicModel): Complex {
    switch (model) {
    case HyperbolicModel.POINCARE:
      return this.poincare;
    case HyperbolicModel.KLEIN:
      return this.klein;
    case HyperbolicModel.HALF_PLANE:
      return this.halfPlane;
    default:
      throw new Error('Unknown hyperbolic model');
    }
  }

  static fromPoincare(p: Complex | Vector2): HyperPoint {
    return new HyperPoint(p, HyperbolicModel.POINCARE);
  }

  static fromKlein(p: Complex | Vector2): HyperPoint {
    return new HyperPoint(p, HyperbolicModel.KLEIN);
  }

  static fromHalfPlane(p: Complex): HyperPoint {
    return new HyperPoint(p, HyperbolicModel.HALF_PLANE);
  }

  equals(other: HyperPoint): boolean {
    return this.poincare.equals(other.poincare) || this.klein.equals(other.klein);
  }

  isIdeal() {
    return closeEnough(this.klein.modulusSquared(), 1);
  }

  heading(other: HyperPoint, model: HyperbolicModel = HyperbolicModel.POINCARE) {
    if (this.equals(other)) throw new Error('Heading from point to itself');
    const g = new HyperGeodesic(this, other);
    const s = g.segment(model);
    if (s instanceof LineSegment) {
      return this.resolve(model).heading(other.resolve(model));
    } else if (s instanceof ArcSegment) {
      const c = s.center;
      if (s.start.equals(this.resolve(model))) {
        return normalizeAngle(c.heading(this.resolve(model)) + Math.PI * 0.5);
      } else {
        return normalizeAngle(c.heading(this.resolve(model)) - Math.PI * 0.5);
      }
    } else {
      throw new Error('Unknown segment type');
    }
  }

  distance(other: HyperPoint): number {
    if (this.equals(other)) return 0;
    const g = new HyperGeodesic(this, other);
    return g.length;
  }

  static lerp(a: HyperPoint, b: HyperPoint, f: number): HyperPoint {
    if (a.equals(b)) return a;
    if (a.isIdeal() && b.isIdeal()) throw Error('Cannot lerp two ideal points');
    if (a.isIdeal()) return a;
    if (b.isIdeal()) return b;
    if (f < 0) return HyperPoint.lerp(b, a, 1 - f);
    const g = new HyperGeodesic(a, b);
    const d = g.length * f;
    const xp = g.ip.klein.distance(g.p.klein);
    const py = g.p.klein.distance(g.iq.klein);
    const frac = Math.exp(2 * d) * xp / py;
    const t = frac / (frac + 1);
    const klein = Complex.lerp(g.ip.klein, g.iq.klein, t);
    return HyperPoint.fromKlein(klein);
  }
}

export class HyperGeodesic extends GeodesicLike<HyperPoint> {
  readonly ip: HyperPoint;
  readonly iq: HyperPoint;

  // This is the true midpoint for geodesics of finite length. Otherwise, it is the Euclidean midpoint in the Klein
  // model.
  private midpoint: HyperPoint | null = null;

  constructor(p1: HyperPoint, p2: HyperPoint) {
    super(p1, p2);
    if (p1.equals(p2)) throw new Error('Trivial geodesic');
    // This part is easiest in the Klein model, since geodesics are straight lines there.
    const kl = Line.throughTwoPoints(p1.klein, p2.klein);
    const ideals = AffineCircle.UNIT_CIRCLE.intersectLine(kl);
    if (ideals.length != 2) throw new Error('Unexpected number of intersections');
    const dp = ideals[0].distance(p1.klein);
    const dq = ideals[0].distance(p2.klein);
    if (dp < dq) {
      this.ip = HyperPoint.fromKlein(ideals[0]);
      this.iq = HyperPoint.fromKlein(ideals[1]);
    } else {
      this.ip = HyperPoint.fromKlein(ideals[1]);
      this.iq = HyperPoint.fromKlein(ideals[0]);
    }
  }

  reverse() {
    return new HyperGeodesic(this.iq, this.ip);
  }

  get p() {
    return this.p1;
  }

  get q() {
    return this.p2;
  }

  get start() {
    return this.p1;
  }

  get end() {
    return this.p2;
  }

  get mid() {
    if (!this.midpoint) {
      const l = this.length;
      if (!Number.isFinite(l)) {
        this.midpoint = HyperPoint.fromKlein(Complex.lerp(this.p.klein, this.q.klein, 0.5));
        return this.midpoint;
      }
      // const el = Math.exp(l);
      // const ap = this.ip.klein.distance(this.p.klein);
      // const pb = this.p.klein.distance(this.iq.klein);
      //
      // const x = (el * ap * pb) / (ap * el + pb);
      //
      // const diff = this.q.klein.minus(this.p.klein);
      // this.midpoint = HyperPoint.fromKlein(this.p.klein.plus(diff.normalize(x)));
      this.midpoint = HyperPoint.lerp(this.p, this.q, 0.5);
    }
    return this.midpoint;
  }

  segment(model: HyperbolicModel): Segment {
    if (model === HyperbolicModel.KLEIN) {
      return new LineSegment(this.p1.klein, this.p2.klein);
    }
    return fromThreePoints(
      this.p1.resolve(model),
      this.mid.resolve(model),
      this.p2.resolve(model),
    );
  }

  interpolate(model: HyperbolicModel, start: HyperPoint, includeLast: boolean = true): Complex[] {
    let s;
    try {
      s = this.segment(model);
    } catch (e) {
      console.log(e);
      return [start.resolve(model)];
    }
    let points = s.interpolate(1);
    if (!includeLast) points.pop();
    if (!points[0].equals(start.resolve(model))) points = points.reverse();
    return points;
  }

  get pTail() {
    return new HyperGeodesic(this.ip, this.p1);
  }

  get qTail() {
    return new HyperGeodesic(this.p2, this.iq);
  }

  intersect(other: HyperGeodesic): HyperPoint | undefined {
    const l1 = new LineSegment(this.p1.klein, this.p2.klein);
    const l2 = new LineSegment(other.p1.klein, other.p2.klein);
    const c = l1.intersect(l2);
    if (c.length === 0) return undefined;
    return HyperPoint.fromKlein(c[0]);
  }

  intersectIdeal(other: HyperGeodesic): HyperPoint | undefined {
    const l1 = new LineSegment(this.ip.klein, this.iq.klein);
    const l2 = new LineSegment(other.ip.klein, other.iq.klein);
    const c = l1.intersect(l2);
    if (c.length === 0) return undefined;
    return HyperPoint.fromKlein(c[0]);
  }

  split(splitPoints: HyperPoint[]): HyperGeodesic[] {
    const ls = new LineSegment(this.p1.klein, this.p2.klein);
    const segments = ls.split(splitPoints.map(p => p.klein));
    return segments.map(segment =>
      new HyperGeodesic(HyperPoint.fromKlein(segment.start), HyperPoint.fromKlein(segment.end)));
  }

  wind(p: HyperPoint): number {
    return normalizeAngle(p.klein.heading(this.p2.klein) - p.klein.heading(this.p1.klein));
  }

  containsPoint(p: HyperPoint): boolean {
    return this.segment(HyperbolicModel.KLEIN).containsPoint(p.klein);
  }

  heading1(model: HyperbolicModel = HyperbolicModel.POINCARE): number {
    return this.p1.heading(this.p2, model);
  }

  heading2(model: HyperbolicModel = HyperbolicModel.POINCARE): number {
    return this.p2.heading(this.p1, model);
  }

  get length() {
    if (this.p.isIdeal() || this.q.isIdeal()) return Number.POSITIVE_INFINITY;
    const xq = this.ip.klein.distance(this.p2.klein);
    const py = this.p1.klein.distance(this.iq.klein);
    const xp = this.ip.klein.distance(this.p1.klein);
    const qy = this.p2.klein.distance(this.iq.klein);
    return 0.5 * Math.log(xq * py / (xp * qy));
  }

  static poincareRay(point: HyperPoint, heading: number): HyperGeodesic {
    const poincare = point.poincare;
    const dir = Complex.polar(1, heading);
    if (closeEnough(poincare.cross(dir), 0)) {
      return new HyperGeodesic(point, HyperPoint.fromPoincare(Complex.polar(1, heading)));
    }
    // const perp = Line.srcDir(poincare, Complex.polar(1, heading + Math.PI / 2));
    // const pinvert = poincare.scale(1 / poincare.modulusSquared());
    //
    // const bisector = Line.bisector(poincare, pinvert);
    // const center = perp.intersectLine(bisector);
    // const r = center.distance(poincare);

    // const idealPoints = new AffineCircle(center, r).intersectCircle(new AffineCircle(new Complex(), 1));

    const affineCircle = AffineCircle.withTangent(poincare, heading, AffineCircle.UNIT_CIRCLE.invert(poincare));
    const idealPoints = affineCircle.intersectCircle(AffineCircle.UNIT_CIRCLE);
    if (idealPoints.length !== 2) throw Error('Unexpected number of circle intersection points');
    let ip: HyperPoint;
    if (idealPoints[0].minus(poincare).dot(dir) > 0) {
      ip = HyperPoint.fromPoincare(idealPoints[0].normalize());
    } else {
      ip = HyperPoint.fromPoincare(idealPoints[1].normalize());
    }

    return new HyperGeodesic(point, ip);
  }

  perpendicular(point: HyperPoint): HyperGeodesic {
    const blaschke = HyperIsometry.blaschkeTransform(point);
    const bi = blaschke.inverse();
    const h1 = blaschke.apply(this.iq).poincare.argument();
    const h2 = blaschke.apply(this.ip).poincare.argument();
    const s = (h1 + h2) / 2;
    const e = s + Math.PI;
    return new HyperGeodesic(
      bi.apply(HyperPoint.fromPoincare(Complex.polar(1, s))),
      bi.apply(HyperPoint.fromPoincare(Complex.polar(1, e)))
    );
  }
}

export class HyperIsometry {
  static IDENTITY = new HyperIsometry(Mobius.IDENTITY);

  private constructor(private readonly poincareMobius: Mobius) {
  }

  static pointInversion(point: HyperPoint): HyperIsometry {
    return new HyperIsometry(Mobius.pointInversion(point.poincare));
  }

  static rotation(r: number): HyperIsometry {
    return new HyperIsometry(Mobius.rotation(r));
  }

  //  z - a
  // ————————
  // -å*z + 1
  static blaschkeTransform(z: HyperPoint): HyperIsometry {
    const a = z.poincare.scale(-1);
    return new HyperIsometry(
      new Mobius(
        Complex.ONE, a,
        a.conjugate, Complex.ONE,
      )
    );
  }

  apply(point: HyperPoint): HyperPoint {
    const poincarePoint = this.poincareMobius.apply(point.poincare);
    if (closeEnough(point.poincare.modulusSquared(), 1)) poincarePoint.normalize();
    return HyperPoint.fromPoincare(poincarePoint);
  }

  compose(inner: HyperIsometry): HyperIsometry {
    return new HyperIsometry(this.poincareMobius.compose(inner.poincareMobius));
  }

  fixedPoints(): HyperPoint[] {
    return this.poincareMobius.fixedPoints().filter(p => {
      const m = p.modulusSquared();
      return closeEnough(m, 1) || m < 1
    }).map(p => HyperPoint.fromPoincare(p));
  }

  rotationAngle(): number {
    if (this.equals(HyperIsometry.IDENTITY)) return 0;
    const f = this.fixedPoints().find(p => !p.isIdeal());
    if (!f) throw new Error('Isometry has no interior fixed points');
    const one = HyperPoint.fromPoincare(Complex.ONE);
    const h1 = f.heading(one);
    const h2 = f.heading(this.apply(one));
    return normalizeAngle(h2, h1) - h1;
  }

  equals(other: HyperIsometry): boolean {
    return this.poincareMobius.equals(other.poincareMobius);
  }

  inverse() {
    return new HyperIsometry(this.poincareMobius.inverse());
  }
}

export class HyperbolicCircle {
  constructor(readonly center: HyperPoint, readonly radius: number) {
  }

  static fromThreePoints(p1: HyperPoint, p2: HyperPoint, p3: HyperPoint): HyperbolicCircle {
    return HyperbolicCircle.fromPoincareCircle(AffineCircle.fromThreePoints(p1.poincare, p2.poincare, p3.poincare));
  }

  static fromPoincareCircle(c: AffineCircle): HyperbolicCircle {
    const close = HyperPoint.fromPoincare(Complex.polar(c.center.modulus() - c.radius, c.center.argument()));
    const far = HyperPoint.fromPoincare(Complex.polar(c.center.modulus() + c.radius, c.center.argument()));
    const diameter = new HyperGeodesic(close, far);
    const center = diameter.mid;
    const radius = diameter.length / 2;
    return new HyperbolicCircle(center, radius);
  }

  toPoincareCircle(): AffineCircle {
    if (this.center.poincare.modulusSquared() === 0) {
      return new AffineCircle(new Complex(), trueToPoincareDistance(this.radius));
    }
    const or = HyperPoint.fromPoincare(new Complex());
    const ip = HyperPoint.fromPoincare(this.center.poincare.normalize());
    const p1 = this.center.translate(or, this.radius).poincare;
    const p2 = this.center.translate(ip, this.radius).poincare;
    const c = Complex.lerp(p1, p2, 0.5);
    return new AffineCircle(c, c.distance(p1));
  }

  interpolate(model: HyperbolicModel): Complex[] {
    const pts = [];
    const {center, radius} = this.toPoincareCircle();
    const steps = 180;
    for (let i = 0; i <= steps; i++) {
      const theta = i * 2 * Math.PI / steps;
      const p = center.plus(Complex.polar(radius, theta));
      pts.push(HyperPoint.fromPoincare(p).resolve(model));
    }
    return pts;
  }
}

export class HyperCycle {
  i1: HyperPoint;
  i2: HyperPoint;

  constructor(readonly poincareCircle: AffineCircle) {
    if (poincareCircle.radius + poincareCircle.center.modulus() <= 1 || poincareCircle.radius - poincareCircle.center.modulus() >= 1) {
      throw Error('not a hyperCycle');
    }
    const intersections = AffineCircle.UNIT_CIRCLE.intersectCircle(this.poincareCircle);
    if (intersections.length !== 2) throw Error('there should be two intersections');
    const h1 = this.poincareCircle.center.heading(intersections[0]);
    const h2 = this.poincareCircle.center.heading(intersections[1]);
    if (normalizeAngle(h2 - h1) - h1 < Math.PI) {
      this.i1 = HyperPoint.fromPoincare(intersections[0].normalize());
      this.i2 = HyperPoint.fromPoincare(intersections[1].normalize());
    } else {
      this.i1 = HyperPoint.fromPoincare(intersections[1].normalize());
      this.i2 = HyperPoint.fromPoincare(intersections[0].normalize());
    }
  }

  intersectGeodesic(g: HyperGeodesic): HyperPoint[] {
    return g.segment(HyperbolicModel.POINCARE).intersect(this.poincareSegment).map(c => HyperPoint.fromPoincare(c));
  }

  get poincareSegment(): Segment {
    const center = this.poincareCircle.center;
    const mid = center.minus(Complex.polar(this.poincareCircle.radius, center.argument()));
    // const h1 = center.heading(this.i1.poincare);
    // const h2 = normalizeAngle(center.heading(this.i2.poincare), h1);
    return fromThreePoints(this.i1.poincare, mid, this.i2.poincare);
    // return new ArcSegment(center, this.poincareCircle.radius, h1, h2);
  }

  interpolate(model: HyperbolicModel) {
    const pts = this.poincareSegment.interpolate(1);
    if (model === HyperbolicModel.POINCARE) return pts;
    return pts.map(c => HyperPoint.fromPoincare(c).resolve(model));
  }
}

export class Horocycle {
  constructor(readonly poincareCircle: AffineCircle) {
    if (!closeEnough(poincareCircle.radius + poincareCircle.center.modulus(), 1)) {
      throw Error('not a horocycle');
    }
  }
}