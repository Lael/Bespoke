import {Complex} from "../complex/complex";
import {Vector2} from "three";
import {LineSegment} from "../geometry/line-segment";
import {AffineCircle} from "../geometry/affine-circle";
import {Line} from "../geometry/line";

export function fixTime(time: number): number {
  let t = time % 1;
  if (t < 0) t += 1;
  return t;
}

// Arguments:
// ip, g1, g2, tp
// ip is intersection, tp lies on g1, circle should be between positive directions of g1 and g2
// export function affineFourthCircle(ip: AffinePoint,
//                                    g1: AffineGeodesic,
//                                    g2: AffineGeodesic,
//                                    tp: AffinePoint): Circle<AffinePoint> {
//     const v1 = g1.p2.resolve().minus(g1.p1.resolve()).normalize();
//     const v2 = g2.p2.resolve().minus(g2.p1.resolve()).normalize();
//     const bv = v1.plus(v2).normalize();
//     const ab = new AffineGeodesic(ip, new AffinePoint(ip.resolve().plus(bv)), true, true);
//     const pv = v1.times(new Complex(0, 1));
//     const pl = new AffineGeodesic(tp, new AffinePoint(tp.resolve().plus(pv)), true, true);
//     const c = ab.intersect(pl);
//     if (c === undefined) throw Error('No circle intersection');
//     return new Circle<AffinePoint>(
//         c, c.distance(tp)
//     );
// }

// Arguments:
// ip, g1, g2, tp
// ip is intersection, tp lies on g1, circle should be between positive directions of g1 and g2
export function affineFourthCircle(ip: Vector2,
                                   g1: LineSegment,
                                   g2: LineSegment,
                                   tp: Vector2): AffineCircle {
  const v1 = g1.end.minus(g1.start).toVector2().normalize();
  const v2 = g2.end.minus(g2.start).toVector2().normalize();
  const bv = v1.clone().add(v2).normalize();
  const ab = Line.throughTwoPoints(ip, ip.clone().add(bv));
  const pv = new Vector2(-v1.y, v1.x);
  const pl = Line.throughTwoPoints(tp, tp.clone().add(pv));
  const c = ab.intersectLine(pl);
  if (c === undefined) throw Error('No circle intersection');
  return new AffineCircle(
    c, c.distance(Complex.fromVector2(tp))
  );
}
