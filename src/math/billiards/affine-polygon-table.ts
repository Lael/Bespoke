import {Shape, Vector2} from "three";
import {LineSegment} from "../geometry/line-segment";
import {Complex} from "../complex/complex";
import {fixTime} from "./tables";
import {Line} from "../geometry/line";
import {closeEnough, normalizeAngle} from "../math-helpers";
import {AffineCircle} from "../geometry/affine-circle";
import {AffineOuterBilliardTable, Straight} from "./affine-billiard-table";
import {EuclideanRay} from "../geometry/euclidean-ray";

const LENGTH_PREIMAGE_PIECES: number = 3000;
const LENGTH_PREIMAGE_LENGTH: number = 20;
const DL = LENGTH_PREIMAGE_LENGTH / LENGTH_PREIMAGE_PIECES;
const DLI = LENGTH_PREIMAGE_PIECES / LENGTH_PREIMAGE_LENGTH;

export class AffinePolygonTable extends AffineOuterBilliardTable {
  readonly n: number;
  readonly sides: LineSegment[] = [];
  readonly lengths: number[] = [];
  readonly perimeter: number;
  readonly slicingRays: Straight[] = [];

  constructor(readonly vertices: Vector2[]) {
    super();
    this.n = vertices.length;
    let p = 0;
    for (let i = 0; i < this.n; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % this.n];
      const ls = new LineSegment(Complex.fromVector2(v1), Complex.fromVector2(v2))
      this.sides.push(ls);
      const l = ls.length;
      this.lengths.push(l);
      p += l;
      this.slicingRays.push(
        new Straight(
          v2,
          v2.clone().add(v2.clone().sub(v1).normalize()),
          true)
      );
      this.slicingRays.push(
        new Straight(
          v1,
          v1.clone().add(v1.clone().sub(v2).normalize()),
          true)
      );
    }
    this.perimeter = p;
  }

  point(time: number): Vector2 {
    const t = fixTime(time);
    const al = this.perimeter * t

    let p = 0;
    for (let i = 0; i < this.n; i++) {
      if (p + this.lengths[i] > al) {
        return this.vertices[i].clone().lerp(this.vertices[(i + 1) % this.n],
          (al - p) / this.lengths[i],
        );
      }
      p += this.lengths[i];
    }
    throw Error('point not found');
  }

  private angle(startTime: number, endTime: number): number {
    const p1 = Complex.fromVector2(this.point(startTime));
    const p2 = Complex.fromVector2(this.point(endTime));
    const heading = this.tangentHeading(startTime);
    return normalizeAngle(p1.heading(p2) - heading, 0) % Math.PI;
  }

  time(point: Vector2): number {
    const z = Complex.fromVector2(point);
    let p = 0;
    for (let [i, segment] of this.sides.entries()) {
      const l = segment.length;
      if (!segment.containsPoint(z)) {
        p += l;
        continue;
      }
      const f = z.distance(segment.start);
      return (p + f) / this.perimeter;
    }
    throw Error('Point not on polygon');
  }

  tangentHeading(time: number): number {
    const t = fixTime(time);
    const nt = this.n * t
    const i = Math.floor(nt);

    const v1 = this.vertices[i];
    const v2 = this.vertices[(i + 1) % this.n];

    return Complex.fromVector2(v1).heading(Complex.fromVector2(v2));
  }

  override interior(point: Vector2): boolean {
    const c = Complex.fromVector2(point);
    for (let s of this.sides) {
      if (s.end.minus(s.start).cross(c.minus(s.start)) < 0) return false;
    }
    return true;
  }

  override boundary(point: Vector2): boolean {
    const c = Complex.fromVector2(point);
    for (let s of this.sides) {
      if (s.containsPoint(c)) {
        return true;
      }
    }
    return false;
  }

  circleTangentLine(circle: AffineCircle, left: boolean = false): Line {
    for (let i = 0; i < this.n; i++) {
      const v1 = this.vertices[i % this.n];
      const v2 = this.vertices[(i + 1) % this.n];
      if (circle.pointOnBoundary(v2)) continue;
      const v3 = this.vertices[(i + 2) % this.n];
      const s2 = v1.clone().sub(v2);
      const s3 = v3.clone().sub(v2);
      let cp, d;
      if (left) {
        cp = circle.rightTangentPoint(Complex.fromVector2(v2));
        d = cp.toVector2().sub(v2);
      } else {
        cp = circle.leftTangentPoint(Complex.fromVector2(v2));
        d = v2.clone().sub(cp.toVector2());
      }
      if (d.cross(s2) >= 0 && d.cross(s3) >= 0) return Line.throughTwoPoints(cp, v2.clone());
    }
    throw Error(`no ${left ? 'left' : 'right'} tangent line`);
  }

  private reflectRegular(pivot: Vector2, point: Vector2) {
    const diff = pivot.clone().sub(point);
    return point.clone().add(diff.multiplyScalar(2));
  }

  rightTangentPoint(point: Vector2): Vector2 {
    for (let i = 0; i < this.n; i++) {
      const v1 = this.vertices[i];
      const v2 = this.vertices[(i + 1) % this.n];
      const v3 = this.vertices[(i + 2) % this.n];
      const s2 = v2.clone().sub(v1);
      const s3 = v3.clone().sub(v2);
      const d1 = point.clone().sub(v1);
      const d2 = point.clone().sub(v2);
      if (s2.cross(d1) <= 0 && s3.cross(d2) >= 0) return v2;
    }
    throw Error('Point is not in domain of forward map');
  }

  leftTangentPoint(point: Vector2): Vector2 {
    for (let i = 0; i < this.n; i++) {
      const v1 = this.vertices[i];
      const v2 = this.vertices[(i + 1) % this.n];
      const v3 = this.vertices[(i + 2) % this.n];
      const s2 = v2.clone().sub(v1);
      const s3 = v3.clone().sub(v2);
      const d2 = point.clone().sub(v2);
      const d3 = point.clone().sub(v3);
      if (s2.cross(d2) >= 0 && s3.cross(d3) <= 0) return v2;
    }
    throw Error('Point is not in domain of backward map');
  }

  tangentTowardsPoint(point: Vector2): number {
    return this.time(this.leftTangentPoint(point));
  }

  tangentFromPoint(point: Vector2): number {
    return this.time(this.rightTangentPoint(point));
  }

  outerAreaPreimages(iterations: number) {
    const preimages: Straight[] = [];
    let frontier: Straight[] = [];
    for (let i = 0; i < this.n; i++) {
      const v1 = this.vertices[i];
      const v2 = this.vertices[(i + 1) % this.n];
      const diff = v1.clone().sub(v2).normalize();
      frontier.push(new Straight(v1, v1.clone().add(diff), true));
      preimages.push(new Straight(v1.clone(), v2.clone(), false));
    }
    for (let i = 0; i < iterations; i++) {
      console.clear();
      // console.log(frontier);
      preimages.push(...frontier);
      const newFrontier: Straight[] = [];
      for (let preimage of frontier) {
        const pieces = this.slicePreimage(preimage);
        for (let piece of pieces) {
          let mid: Vector2;
          if (piece.infinite) {
            mid = piece.end;
            // If far away and pointing away, skip
            if (piece.start.lengthSq() > 10_000 &&
              piece.end.clone().sub(piece.start).dot(piece.start) > 0) continue;
          } else {
            mid = piece.start.clone().add(piece.end).multiplyScalar(0.5);
            // If far away, skip
            if (mid.lengthSq() > 10_000) continue;
            // If tiny, skip
            if (piece.start.distanceToSquared(piece.end) < 0.000_000_01) continue;
          }
          let pivot: Vector2;
          try {
            pivot = this.leftTangentPoint(mid);
          } catch (e) {
            continue;
          }
          newFrontier.push(
            new Straight(
              this.reflectRegular(pivot, piece.start),
              this.reflectRegular(pivot, piece.end),
              piece.infinite)
          );
        }
      }
      frontier = newFrontier;
    }
    return preimages;
  }

  private slicePreimage(preimage: Straight, buffer: boolean = false): Straight[] {
    const intersections = [];
    for (let slicingRay of this.slicingRays) {
      const intersection = slicingRay.intersect(preimage);
      if (intersection === null) continue;
      if (closeEnough(intersection.distanceTo(preimage.start), 0) && !buffer) continue;
      if (!preimage.infinite && closeEnough(intersection.distanceTo(preimage.end), 0) && !buffer) continue;
      intersections.push(intersection);
    }

    if (intersections.length === 0) return [preimage];
    let bufferDiff = new Vector2();
    if (buffer) {
      bufferDiff = preimage.end.clone().sub(preimage.start).normalize().multiplyScalar(0.000_000_001);
    }

    const pieces = [];
    intersections.sort((a, b) => a.distanceToSquared(preimage.start) - b.distanceToSquared(preimage.start));
    if (!closeEnough(preimage.start.distanceTo(intersections[0]), 0)) {
      pieces.push(new Straight(preimage.start, intersections[0].clone().sub(bufferDiff), false));
    }
    for (let i = 0; i < intersections.length - 1; i++) {
      try {
        pieces.push(new Straight(
          intersections[i].clone().add(bufferDiff),
          intersections[i + 1].clone().sub(bufferDiff), false));
      } catch (e) {
      }
    }
    const lastIntersection = intersections[intersections.length - 1];
    const end = lastIntersection.clone().add(preimage.end.clone().sub(preimage.start).normalize());
    try {
      if (preimage.infinite) pieces.push(new Straight(lastIntersection, end, true));
      else if (!closeEnough(preimage.start.distanceTo(intersections[0]), 0)) {
        pieces.push(new Straight(lastIntersection.clone().add(bufferDiff), preimage.end, false));
      }
    } catch (e) {
    }

    return pieces;
  }

  outerLengthPreimages(iterations: number): Straight[] {
    console.clear();
    const start = Date.now();

    const preimages: Straight[] = [];
    let frontier: Straight[] = [];
    // console.log(DL);
    for (let i = 0; i < this.n; i++) {
      const v1 = this.vertices[i];
      const v2 = this.vertices[(i + 1) % this.n];
      const line = Line.throughTwoPoints(v1, v2);
      const diff = v1.clone().sub(v2).normalize();
      for (let j = 0.000_001; j < LENGTH_PREIMAGE_PIECES; j++) {
        frontier.push(new Straight(
          v1.clone().add(diff.clone().multiplyScalar(j * DL)),
          v1.clone().add(diff.clone().multiplyScalar((j + 1) * DL)),
          false,
          line));
        // preimages.push(new Straight(
        //   v2.clone().sub(diff.clone().multiplyScalar(j * dl)),
        //   v2.clone().sub(diff.clone().multiplyScalar((j + 1) * dl)),
        //   false));
      }
    }
    // console.log(`Set up initial frontier: ${Date.now() - start}ms`);

    let total = 0;
    let tiny = 0;
    let split = 0;
    let pieceCount = 0;

    for (let i = 0; i < iterations; i++) {
      for (let f of frontier) {
        preimages.push(f);
      }
      const newFrontier: Straight[] = [];
      for (let segment of frontier) {
        total++;
        let pieces: Straight[];
        try {
          pieces = this.slicePreimage(segment, true);
        } catch (e) {
          console.warn(e);
          continue;
        }
        const extraPieces = [];
        pieceCount += pieces.length;
        for (let piece of pieces) {
          try {
            // const mid = piece.start.clone().add(piece.end).multiplyScalar(0.5);
            // If far away, skip
            // if (mid.lengthSq() > LENGTH_PREIMAGE_LENGTH * LENGTH_PREIMAGE_LENGTH) continue;
            // If tiny, skip
            const l = piece.start.distanceToSquared(piece.end);
            // If tiny, skip
            if (l < 0.000_000_1) {
              tiny++;
              continue;
            }
            // if giant, break apart
            if (l > 0.05) {
              split++;
              const n = Math.ceil(l * DLI);
              const dd = l / n;
              const dv = piece.end.clone().sub(piece.start).normalize();
              for (let q = 0; q < n; q++) {
                extraPieces.push(
                  new Straight(piece.start.clone().addScaledVector(dv, q * dd),
                    piece.start.clone().addScaledVector(dv, (q + 1) * dd), false)
                );
              }
              continue;
            }
            newFrontier.push(
              new Straight(
                this.outerLength(piece.start, true).point,
                this.outerLength(piece.end, true).point, false));

          } catch (e) {
          }
        }
        // for (let piece of extraPieces) {
        //     try {
        //         newFrontier.push(
        //             new EuclideanRay(
        //                 this.outerLength(piece.start, true),
        //                 this.outerLength(piece.end, true), false));
        //     } catch (e) {
        //     }
        // }
      }
      frontier = newFrontier;
    }
    // console.log(`Iterations: ${iterations}`);
    // console.log(`Preimage segments: ${preimages.length}`);
    // console.log(`Time: ${Date.now() - start}ms`);
    // console.log(`Tiny: ${tiny}/${pieceCount}`);
    // console.log(`Split: ${split}/${pieceCount}`);
    return preimages;
  }

  override shape(_: number): Shape {
    return new Shape(this.vertices);
  }

  override width(theta: number): number {
    let w = 0;
    const perp = new Vector2(-Math.sin(theta), Math.cos(theta));
    for (let i = 0; i < this.n - 1; i++) {
      for (let j = i + 1; j < this.n; j++) {
        const v1 = this.vertices[i].clone();
        const v2 = this.vertices[j].clone();
        const diff = v2.sub(v1);
        const nw = Math.abs(diff.dot(perp));
        if (nw > w) w = nw;
      }
    }
    return w;
  }

  tangentVector(time: number): Vector2 {
    const al = fixTime(time) * this.perimeter;
    let p = 0;
    for (let i = 0; i < this.n; i++) {
      if (p + this.lengths[i] > al) {
        return this.sides[i].end.toVector2().clone().sub(this.sides[i].start).normalize();
      }
      p += this.lengths[i];
    }
    throw Error('no tangent vector found');
  }

  intersect(ray: EuclideanRay): number {
    const rl = Line.srcDir(ray.src, ray.dir);
    let bestT = Number.POSITIVE_INFINITY;
    let bestPT = ray.src.clone();
    for (let side of this.sides) {
      const int = side.intersectLine(rl);
      if (int === undefined) continue;
      const pt = int.toVector2();
      const t = pt.clone().sub(ray.src).dot(ray.dir);
      if (t > 0 && t < bestT) {
        bestT = t;
        bestPT = pt;
      }
    }
    return this.time(bestPT);
  }


  sequence(p: Vector2, depth: number): number[][] {
    if (this.interior(p)) return [];
    const result = this.iterateOuterLength(p, depth);
    const seq = [];
    for (let p of result.orbit) {
      const towards = this.tangentTowardsPoint(p);
      const from = this.tangentFromPoint(p);
      seq.push([
        towards, from
      ]);
    }
    return seq;
  }

  outerLengthSingularDF(window: number, scale: number, depth: number) {
    const maxCells = 2 << scale;
    const corners: Vector2[][] = [];
    for (let i = 0; i <= maxCells; i++) {
      const y = window / 2 + i * window / maxCells;
      const row = [];
      for (let j = 0; j <= maxCells; j++) {
        const x = window / 2 + j * window / maxCells;
        row.push(new Vector2(x, y));
      }
      corners.push(row);
    }

    const layers: boolean[][][] = [];
    for (let n = maxCells; n >= 1; n /= 2) {
      const layer: boolean[][] = [];
      for (let i = 0; i < n; i++) layer.push(Array(n).fill(false))
      layers.push(layer);
    }

    function fillRow(i: number, row: number[][][], table: AffinePolygonTable) {
      for (let j = 0; j <= maxCells; j++) {
        row[j] = table.sequence(corners[i][j], depth);
      }
    }

    let row1: number[][][] = [];
    fillRow(0, row1, this);
    let row2: number[][][] = [];
    for (let i = 0; i < maxCells; i++) {
      fillRow(i + 1, row2, this);
      for (let j = 0; j < maxCells; j++) {
        if (checkSequences(row1[j], row1[j + 1]) &&
          checkSequences(row1[j], row2[j]) &&
          checkSequences(row2[j], row2[j + 1])) {
          continue;
        }
        let x = i;
        let y = j;
        for (let layer of layers) {
          layer[x][y] = true;
          x >>= 1;
          y >>= 1;
        }
      }
      row1 = row2;
      console.log(`Row ${i + 1} / ${maxCells} done...`);
    }

    for (let layer of layers) {
      let hits = 0;
      let total = layer.length * layer.length;
      for (let row of layer) {
        for (let entry of row) {
          if (entry) hits++;
        }
      }
      console.log(`${layer.length}x${layer.length}: ${hits}/${total}`);
    }
  }
}

// return true if sequences agree and false if they differ
function checkSequences(s1: number[][], s2: number[][]): boolean {
  if (s1.length !== s2.length) return false;
  for (let i = 0; i < s1.length; i++) {
    if (s1[i].length !== s2[i].length) return false;
    for (let j = 0; j < s1[i].length; j++) {
      if (!closeEnough(s1[i][j], s2[i][j])) return false;
    }
  }
  return true;
}