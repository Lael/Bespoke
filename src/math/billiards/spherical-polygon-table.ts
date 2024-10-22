import {SpherePoint, SphericalArc, sphericalLerp, SphericalPolygon} from "../geometry/spherical";
import {fixTime, SphericalOuterBilliardTable} from "./tables";
import {
    BufferAttribute,
    BufferGeometry,
    ColorRepresentation,
    DoubleSide,
    Mesh,
    MeshBasicMaterial,
    Vector3
} from "three";
import {Generator} from "./new-billiard";

export class SphericalPolygonTable extends SphericalOuterBilliardTable {
    polygon: SphericalPolygon;
    slicingArcs: SphericalArc[];

    constructor(readonly vertices: SpherePoint[]) {
        super();
        this.polygon = new SphericalPolygon(vertices);
        this.slicingArcs = [];
        for (let i = 0; i < this.n; i++) {
            this.slicingArcs.push(
                new SphericalArc(this.vertices[i], this.vertices[(i - 1 + this.n) % this.n].antipode))
        }
    }

    containsPoint(point: SpherePoint): boolean {
        for (let a of this.polygon.arcs) {
            if (!a.pointOnLeft(point)) return false;
        }
        return true;
    }

    leftTangentPoint(point: SpherePoint): SpherePoint {
        for (let i = 0; i < this.n; i++) {
            let v = this.vertices[i];
            let t1 = this.polygon.arcs[i].t1;
            let t2 = this.polygon.arcs[(i - 1 + this.n) % this.n].t2;
            let a = new SphericalArc(point, v);
            if (a.greatCircle.normal.dot(t1) > 0 && a.greatCircle.normal.dot(t2) > 0) return v.clone();
        }
        throw Error('no left tangent point');
    }

    point(time: number): SpherePoint {
        let l = fixTime(time) * this.polygon.perimeter;
        let t = 0;
        for (let i = 0; i < this.n; i++) {
            let a = this.polygon.arcs[i];
            let al = a.length;
            if (t + al > l) {
                let alpha = (l - t) / al;
                return sphericalLerp(a.p1, a.p2, alpha);
            }
            t += al;
        }
        return this.vertices[0].clone();
    }

    pointOnBoundary(point: SpherePoint): boolean {
        for (let arc of this.polygon.arcs) {
            if (arc.containsPoint(point)) {
                return true;
            }
        }
        return false;
    }

    rightTangentPoint(point: SpherePoint): SpherePoint {
        for (let i = 0; i < this.n; i++) {
            let v = this.vertices[i];
            let t1 = this.polygon.arcs[i].t1;
            let t2 = this.polygon.arcs[(i - 1 + this.n) % this.n].t2;
            let a = new SphericalArc(v, point);
            if (a.greatCircle.normal.dot(t1) > 0 && a.greatCircle.normal.dot(t2) > 0) return v.clone();
        }
        throw Error('no right tangent point');
    }

    tangentVector(time: number): Vector3 | undefined {
        let l = fixTime(time) * this.polygon.perimeter;
        let t = 0;
        for (let i = 0; i < this.n; i++) {
            if (t === l) return undefined;
            let a = this.polygon.arcs[i];
            let al = a.length
            if (t + al > l) {
                let alpha = (l - t) / al;
                let p = sphericalLerp(a.p1, a.p2, alpha);
                return a.greatCircle.normal.clone().cross(p.coords).normalize();
            }
            t += al;
        }
        return undefined;
    }

    time(point: SpherePoint): number {
        throw new Error('not yet implemented');
    }

    get n(): number {
        return this.polygon.n;
    }

    override mesh(scale: number, color: ColorRepresentation, stereograph: boolean): Mesh {
        const np = new SpherePoint(new Vector3(0, 0, 1));
        let vertices = [];
        for (let a of this.polygon.arcs) {
            const l = a.length;
            const hSegments = Math.ceil(l * scale);
            for (let i = 0; i < hSegments; i++) {
                let v1 = a.lerp(i / hSegments);
                let v2 = a.lerp((i + 1) / hSegments);
                let vSegments = Math.ceil(v1.distanceTo(np) * scale);
                let a1 = new SphericalArc(v1, np);
                let a2 = new SphericalArc(v2, np);
                for (let j = 0; j < vSegments; j++) {
                    let q1 = a1.lerp(j / vSegments);
                    let q2 = a2.lerp(j / vSegments);
                    let q3 = a2.lerp((j + 1) / vSegments);
                    let q4 = a1.lerp((j + 1) / vSegments);
                    let qv = [q1, q2, q3];
                    if (j !== vSegments) {
                        qv.push(q3, q4, q1);
                    }
                    for (let v of qv) {
                        if (stereograph) {
                            vertices.push(v.x / (1 + v.z), v.y / (1 + v.z), 0);
                        } else {
                            vertices.push(v.x * 1.001, v.y * 1.001, v.z * 1.001);
                        }
                    }
                }
            }
        }
        let g = new BufferGeometry();
        g.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
        return new Mesh(
            g,
            new MeshBasicMaterial({color, side: DoubleSide}),
        );
    }

    private slicePreimage(arc: SphericalArc): SphericalArc[] {
        const intersections = [arc.p1, arc.p2];
        for (let slicingArc of this.slicingArcs) {
            try {
                const intersection = slicingArc.intersectArc(arc);
                if (intersection !== undefined) intersections.push(intersection);
            } catch (e) {
                return [];
            }
        }
        intersections.sort((a, b) => arc.p1.distanceTo(a) - arc.p1.distanceTo(b));
        if (intersections.length === 2) return [arc];
        let pieces = [];
        for (let i = 0; i < intersections.length - 1; i++) {
            let p1 = intersections[i];
            let p2 = intersections[i + 1];
            if (p1.distanceTo(p2) < 0.000_000_1) continue;
            pieces.push(new SphericalArc(p1, p2));
        }
        return pieces;
    }

    override preimages(flavor: Generator, iterations: number): SphericalArc[] {
        if (flavor === Generator.LENGTH) return [];
        const preimages = [];
        for (let a of this.polygon.arcs) {
            preimages.push(new SphericalArc(a.p1.antipode, a.p2.antipode));
        }
        let frontier = [];
        for (let i = 0; i < this.n; i++) {
            frontier.push(new SphericalArc(this.vertices[i], this.vertices[(i + 1) % this.n].antipode))
        }
        for (let i = 0; i < iterations; i++) {
            preimages.push(...frontier);
            const newFrontier: SphericalArc[] = [];
            for (let f of frontier) {
                let pieces = this.slicePreimage(f);
                for (let piece of pieces) {
                    const l = piece.length;
                    if (l < 0.000_001) {
                        continue;
                    }
                    let mid = piece.lerp(0.5);
                    let pivot: SpherePoint;
                    try {
                        pivot = this.leftTangentPoint(mid);
                    } catch (e) {
                        console.log(e);
                        continue;
                    }
                    newFrontier.push(
                        new SphericalArc(piece.p1.reflectThrough(pivot), piece.p2.reflectThrough(pivot))
                    );
                }
            }
            frontier = newFrontier;
            if (newFrontier.length === 0) {
                break;
            }
        }
        preimages.push(...frontier);
        return preimages;
    }
}