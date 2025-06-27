import {PolygonalTiling} from "./polygonal-tiling";
import {HyperbolicTile} from "./hyperbolic-tile";
import {HyperbolicPolygonRayCollision} from "./hyperbolic-polygon";
import {Tile} from "./tile";
import {CircleGeometry, Color, Mesh, MeshBasicMaterial, Path, Scene, Vector2} from "three";
import {HyperbolicRay} from "./hyperbolic-ray";
import {HyperbolicModel, HyperGeodesic, HyperPoint} from "../../../math/hyperbolic/hyperbolic";
import {Complex} from "../../../math/complex/complex";

class IdealTile extends Tile {
    constructor(tileIndex: number) {
        super(tileIndex);
    }

    override get id(): string {
        return `${this.tilesetIndex}`;
    }
}

class IdealPolygon {
    n = 2;
    sides: HyperGeodesic[];

    constructor(readonly alpha1: number, readonly alpha2: number) {
        this.sides = [
            new HyperGeodesic(HyperPoint.fromPoincare(new Complex()), HyperPoint.fromPoincare(Complex.polar(1, alpha1))),
            new HyperGeodesic(HyperPoint.fromPoincare(new Complex()), HyperPoint.fromPoincare(Complex.polar(1, alpha2))),
        ];
    }

    castRay(ray: HyperbolicRay): HyperbolicPolygonRayCollision {
        let rayGeo = HyperGeodesic.poincareRay(ray.src, ray.poincareDir);
        let rayGeoKlein = rayGeo.segment(HyperbolicModel.KLEIN);
        let bestT = Number.POSITIVE_INFINITY;
        let bestCollision: HyperbolicPolygonRayCollision | undefined = undefined;
        for (let i = 0; i < 2; i++) {
            let side = this.sides[i];
            let intersection = rayGeo.intersect(side);
            if (intersection == undefined) continue;
            if (!rayGeoKlein.containsPoint(intersection.klein) || !side.containsPoint(intersection)) continue;
            let t = intersection.distance(ray.src);
            if (t > 0 && t < bestT) {
                bestT = t;
                bestCollision = {
                    point: intersection,
                    sideIndex: i,
                }
            }
        }
        if (bestCollision == undefined) throw new Error('no collision');
        if (bestCollision.point.poincare.modulus() === 0) {
            throw new Error('hit a vertex');
        }
        return bestCollision;
    }
}

export class TwoLines extends PolygonalTiling<IdealTile, IdealPolygon> {
    constructor(readonly alpha: number) {
        super([
            {polygon: new IdealPolygon(0, alpha), color: new Color(0x444444)},
            {polygon: new IdealPolygon(alpha, Math.PI), color: new Color(0x999999)},
            {polygon: new IdealPolygon(Math.PI, Math.PI + alpha), color: new Color(0x444444)},
            {polygon: new IdealPolygon(Math.PI + alpha, 2 * Math.PI), color: new Color(0x999999)}
        ]);
    }

    adjacentTile(t: HyperbolicTile, sideIndex: number): IdealTile {
        let i = (t.tilesetIndex + (2 * sideIndex - 1) + 4) % 4;
        return new IdealTile(i);
    }

    firstTile(): IdealTile {
        return new IdealTile(0);
    }

    draw(scene: Scene) {
        for (let pt of this.tileset) {
            let p = pt.polygon;
            let a1 = p.alpha1;
            let a2 = p.alpha2;
            let s = Math.max(8, 60 * (a2 - a1));
            let sector = new Mesh(
                new CircleGeometry(1, s, a1, a2 - a1),
                new MeshBasicMaterial({color: pt.color})
            );
            scene.add(sector);
        }
    }


    override play(iterations: number, start: Vector2, direction: number) {
        if (start.angle() === 0
            || start.angle() === this.alpha
            || start.angle() === Math.PI
            || start.angle() === Math.PI + this.alpha
        ) return;

        let path = new Path();
        path.moveTo(start.x, start.y);
        let ray: HyperbolicRay = {
            src: HyperPoint.fromPoincare(start),
            poincareDir: direction,
        }
        for (let i = 0; i < iterations; i++) {
            let ti = this.findTile(ray.src);
            if (ti === -1) break;
            let collision = this.tileset[i].polygon.castRay(ray);
            if (collision === undefined) {

                break;
            } else {

            }
        }
    }

    findTile(p: HyperPoint): number {
        let a = p.poincare.argument();
        for (let i = 0; i < this.tileset.length; i++) {
            let pt = this.tileset[i];
            if (pt.polygon.alpha1 < a && a < pt.polygon.alpha2) {
                return i;
            }
        }
        return -1;
    }
}