import {HyperbolicOuterBilliardTable} from "./hyperbolic-billiard-table";
import {
  HyperbolicCircle,
  HyperbolicModel,
  HyperCycle,
  HyperGeodesic,
  HyperIsometry,
  HyperPoint
} from "../hyperbolic/hyperbolic";
import {HyperbolicRay} from "../../app/demos/tile-billiards/hyperbolic-ray";
import {Shape, Vector2} from "three";
import {LineSegment} from "../geometry/line-segment";
import {HyperPolygon} from "../hyperbolic/hyper-polygon";
import {fixTime} from "./tables";
import {Complex} from "../complex/complex";
import {closeEnough} from "../math-helpers";
import {AffineCircle} from "../geometry/affine-circle";

export class HyperbolicPolygonTable extends HyperbolicOuterBilliardTable {
  readonly n: number;
  readonly polygon: HyperPolygon;
  readonly kleinSegments: LineSegment[] = [];
  readonly slicingRays: LineSegment[] = [];


  constructor(readonly vertices: HyperPoint[]) {
    super();
    this.n = vertices.length;
    this.polygon = HyperPolygon.fromVertices(...vertices);
    for (let i = 0; i < this.n; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % this.n];
      this.kleinSegments.push(new LineSegment(v1.klein, v2.klein));
      const g = this.polygon.geodesics[i];
      this.slicingRays.push(new LineSegment(g.p2.klein, g.iq.klein));
    }
  }

  boundary(point: HyperPoint): boolean {
    for (let s of this.kleinSegments) {
      if (s.containsPoint(point.klein)) return true;
    }
    return false;
  }

  circleTangentLine(circle: HyperbolicCircle, towardCircle: boolean): HyperGeodesic {
    for (let i = 0; i < this.n; i++) {
      const v = this.vertices[(i + 1) % this.n];
      if (closeEnough(circle.center.distance(v), circle.radius)) continue;

      const b = HyperIsometry.blaschkeTransform(v);
      const bi = b.inverse();
      const transformedCircle = new HyperbolicCircle(b.apply(circle.center), circle.radius);
      const affineCircle = transformedCircle.toPoincareCircle();
      const tp = towardCircle ? affineCircle.rightTangentPoint(Complex.ZERO) : affineCircle.leftTangentPoint(Complex.ZERO);
      const candidate = bi.apply(HyperPoint.fromPoincare(tp));

      const pk = candidate.klein;
      const vk = v.klein;
      const vpk = this.vertices[i].klein;
      const vnk = this.vertices[(i + 2) % this.n].klein;

      const s2 = vk.minus(vpk);
      const s3 = vnk.minus(vk);
      const d1 = pk.minus(vk);
      const d2 = pk.minus(vnk);
      if (s2.cross(d1) < 0 && s3.cross(d2) > 0) {
        return towardCircle ?
          new HyperGeodesic(v, candidate) :
          new HyperGeodesic(candidate, v);
      }
    }
    throw Error('no tangent line to circle');
  }

  interior(point: HyperPoint): boolean {
    return this.polygon.containsPoint(point, true);
  }

  intersect(ray: HyperbolicRay): number {
    const chord = HyperGeodesic.poincareRay(ray.src, ray.poincareDir);
    const affineCircle = AffineCircle.withTangent(ray.src.poincare, ray.poincareDir, AffineCircle.UNIT_CIRCLE.invert(ray.src.poincare));
    const chordKlein = new LineSegment(chord.p1.klein, chord.iq.klein);
    for (let kleinSegment of this.kleinSegments) {
      const intersection = kleinSegment.intersect(chordKlein);
      if (intersection.length !== 1) continue;
      if (intersection[0].equals(chord.p1.klein)) continue;
      return this.time(HyperPoint.fromKlein(intersection[0]));
    }
    debugger;
    throw Error('Chord does not intersect polygon again');
  }

  intersectHyperCycle(hc: HyperCycle): HyperPoint[] {
    const hyperSegment = hc.poincareSegment;
    const candidates: Complex[] = [];
    for (let g of this.polygon.geodesics) {
      const s = g.segment(HyperbolicModel.POINCARE);
      candidates.push(...s.intersect(hyperSegment));
    }
    return candidates.map(v => HyperPoint.fromPoincare(v));
  }

  outerAreaPreimages(iterations: number): HyperGeodesic[] {
    const singularities = [];
    let frontier: HyperGeodesic[] = [];
    for (let i = 0; i < this.n; i++) {
      // for (let i = 0; i < 1; i++) {
      const g = this.polygon.geodesics[i];
      frontier.push(new HyperGeodesic(g.p, g.ip));
    }
    for (let i = 0; i < iterations; i++) {
      singularities.push(...frontier);
      frontier = this.generatePreimages(frontier);
    }
    singularities.push(...frontier);
    return singularities;
  }

  generatePreimages(frontier: HyperGeodesic[]) {
    const newFrontier: HyperGeodesic[] = [];
    for (let preimage of frontier) {
      const pieces = this.slicePreimage(preimage);
      for (let piece of pieces) {
        const mid = piece.mid;
        let pivot: HyperPoint;
        try {
          pivot = this.tangentTowardsPoint(mid);
        } catch (e) {
          // console.log('issue pivoting:', e);
          continue;
        }
        try {
          const newP = this.reflect(piece.p1, pivot);
          const newQ = this.reflect(piece.p2, pivot);
          if (newP.poincare.distance(newQ.poincare) < 0.000_001) {
            // console.log('too short');
            continue;
          }

          newFrontier.push(new HyperGeodesic(newP, newQ));
        } catch (e) {
          // console.log('issue preimaging:', e);
        }
      }
    }
    return newFrontier;
  }

  private slicePreimage(preimage: HyperGeodesic): HyperGeodesic[] {
    const intersections: HyperPoint[] = [];
    for (let slicingRay of this.slicingRays) {
      const slicePoints = slicingRay.intersect(new LineSegment(preimage.p1.klein, preimage.p2.klein));
      if (slicePoints.length !== 1) continue;
      const intersection = slicePoints[0];
      const ip = HyperPoint.fromKlein(intersection);
      if (ip.equals(preimage.start) || ip.equals(preimage.end)) continue;
      intersections.push(ip);
    }

    if (intersections.length === 0) return [preimage];

    const pieces: HyperGeodesic[] = [];
    intersections.sort((a, b) => a.distance(preimage.start) - b.distance(preimage.start));
    pieces.push(new HyperGeodesic(preimage.start, intersections[0]));
    for (let i = 0; i < intersections.length - 1; i++) {
      try {
        pieces.push(new HyperGeodesic(
          intersections[i],
          intersections[i + 1]));
      } catch (e) {
      }
    }
    const lastIntersection = intersections[intersections.length - 1];
    try {
      pieces.push(new HyperGeodesic(lastIntersection, preimage.end));
    } catch (e) {
    }

    return pieces;
  }

  private reflect(point: HyperPoint, pivot: HyperPoint) {
    const hi = HyperIsometry.pointInversion(pivot);
    return hi.apply(point);
  }

  outerLengthPreimages(iterations: number): HyperGeodesic[] {
    return [];
  }

  point(time: number): HyperPoint {
    const t = fixTime(time);
    const nt = this.n * t
    const i = Math.floor(nt);
    const f = nt % 1;

    const v1 = this.vertices[i];
    const v2 = this.vertices[(i + 1) % this.n];

    return HyperPoint.fromKlein(Complex.lerp(v1.klein, v2.klein, f));
  }

  shape(model: HyperbolicModel): Shape {
    const shape = new Shape();
    shape.setFromPoints(this.polygon.interpolateVertices(model).map(v => v.toVector2()));
    shape.closePath();
    return shape;
  }

  points(model: HyperbolicModel) {
    return this.polygon.interpolateVertices(model).map(v => v.toVector2())
  }

  tangentFromPoint(point: HyperPoint): HyperPoint {
    const pk = point.klein;
    for (let i = 0; i < this.n; i++) {
      const v1 = this.vertices[i].klein;
      const v2 = this.vertices[(i + 1) % this.n].klein;
      const v3 = this.vertices[(i + 2) % this.n].klein;
      const s2 = v2.minus(v1);
      const s3 = v3.minus(v2);
      const d1 = pk.minus(v1);
      const d2 = pk.minus(v2);
      if (s2.cross(d1) < 0 && s3.cross(d2) > 0) return this.vertices[(i + 1) % this.n];
    }
    throw Error('Point is not in domain of forward map');
  }

  tangentTowardsPoint(point: HyperPoint): HyperPoint {
    const pk = point.klein;
    for (let i = 0; i < this.n; i++) {
      const v1 = this.vertices[i].klein;
      const v2 = this.vertices[(i + 1) % this.n].klein;
      const v3 = this.vertices[(i + 2) % this.n].klein;
      const s2 = v2.minus(v1);
      const s3 = v3.minus(v2);
      const d2 = pk.minus(v2);
      const d3 = pk.minus(v3);
      if (s2.cross(d2) > 0 && s3.cross(d3) < 0) return this.vertices[(i + 1) % this.n];
    }
    throw Error('Point is not in domain of backward map');
  }

  tangentVector(time: number, model: HyperbolicModel): Vector2 {
    const t = fixTime(time);
    const nt = this.n * t;
    const i = Math.floor(nt);

    const p = this.point(time);
    const v2 = this.vertices[(i + 1) % this.n];

    const h = new HyperGeodesic(p, v2).heading1(model);
    return new Vector2(Math.cos(h), Math.sin(h));
  }

  time(point: HyperPoint): number {
    for (let i = 0; i < this.n; i++) {
      if (!this.kleinSegments[i].containsPoint(point.klein)) continue;
      const sideLength = this.kleinSegments[i].length;
      const distToVi = this.vertices[i].klein.distance(point.klein);
      const f = distToVi / sideLength;
      return (i + f) / this.n;
    }
    throw Error('Point not on polygon');
  }

  width(angle: number): number {
    return 0;
  }

}