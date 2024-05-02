import {Color, ColorRepresentation, Matrix4, Mesh, MeshBasicMaterial, SphereGeometry, Vector2, Vector3} from "three";
import {closeEnough} from "../math-helpers";

export class SpherePoint {
    mesh: Mesh | undefined;

    constructor(readonly coords: Vector3) {
        if (coords.length() === 0) throw Error('point not on sphericalSphere');
        this.coords.normalize();
    }

    get phi(): number {
        return Math.acos(this.z);
    }

    get theta(): number {
        if (new Vector2(this.x, this.y).length() === 0) return 0;
        return Math.atan2(this.y, this.x);
    }

    get x(): number {
        return this.coords.x;
    }

    get y(): number {
        return this.coords.y;
    }

    get z(): number {
        return this.coords.z;
    }

    distanceTo(other: SpherePoint): number {
        return Math.acos(this.coords.dot(other.coords));
    }

    reflectThrough(pivot: SpherePoint): SpherePoint {
        let mat = new Matrix4().makeRotationAxis(pivot.coords, Math.PI);
        return new SpherePoint(this.coords.clone().applyMatrix4(mat));
    }

    drawable(color: ColorRepresentation, radius = 0.05): Mesh {
        if (this.mesh === undefined) {
            this.mesh = new Mesh(
                new SphereGeometry(),
                new MeshBasicMaterial(),
            );
        }
        this.mesh.geometry = new SphereGeometry(radius);
        (this.mesh.material as MeshBasicMaterial).color = new Color(color);
        return this.mesh;
    }

    clone() {
        return new SpherePoint(this.coords.clone());
    }

    get antipode(): SpherePoint {
        return new SpherePoint(this.coords.clone().multiplyScalar(-1));
    }

    equals(other: SpherePoint) {
        return this.distanceTo(other) < 0.000_001;
    }
}

export function sphericalLerp(p1: SpherePoint, p2: SpherePoint, alpha: number): SpherePoint {
    const normal = p1.coords.clone().cross(p2.coords).normalize();
    let d = p1.distanceTo(p2);
    let angle = alpha * d;
    return new SpherePoint(
        p1.coords.clone().applyMatrix4(
            new Matrix4().makeRotationAxis(normal, angle)
        )
    );
}

export class GreatCircle {
    constructor(readonly normal: Vector3) {
        if (normal.length() === 0) {
            throw Error('zero vector is not a normal vector');
        }
    }

    static throughTwoPoints(p1: SpherePoint, p2: SpherePoint): GreatCircle {
        const normal = p1.coords.clone().cross(p2.coords);
        return new GreatCircle(normal);
    }

    intersectGreatCircle(other: GreatCircle): SpherePoint[] {
        let v = this.normal.clone().cross(other.normal);
        if (closeEnough(v.length(), 0)) {
            throw Error('great circles coincide');
        }
        return [new SpherePoint(v), new SpherePoint(v.clone().multiplyScalar(-1))];
    }

    containsPoint(point: SpherePoint) {
        return closeEnough(this.normal.clone().cross(point.coords).length(), 0);
    }

    points(n: number): Vector3[] {
        const phi = this.dual.phi;
        const theta = this.dual.theta;
        return arcPoints(phi, theta, 0, 2 * Math.PI, n);
    }

    get dual(): SpherePoint {
        return new SpherePoint(this.normal);
    }
}

export class SphericalArc {
    readonly greatCircle: GreatCircle;

    constructor(readonly p1: SpherePoint, readonly p2: SpherePoint) {
        this.greatCircle = GreatCircle.throughTwoPoints(p1, p2);
    }

    containsPoint(point: SpherePoint) {
        return closeEnough(
            point.distanceTo(this.p1) + point.distanceTo(this.p2),
            this.length
        );
    }

    get length(): number {
        return this.p1.distanceTo(this.p2);
    }

    pointOnLeft(point: SpherePoint) {
        return this.greatCircle.normal.dot(point.coords) > 0;
    }

    get t1(): Vector3 {
        return this.p1.coords.clone().cross(this.greatCircle.normal).normalize();
    }

    get t2(): Vector3 {
        return this.greatCircle.normal.clone().cross(this.p2.coords).normalize();
    }

    lerp(alpha: number): SpherePoint {
        return sphericalLerp(this.p1, this.p2, alpha);
    }

    points(scale: number) {
        const pts = [];
        let segments = Math.ceil(scale * this.length) + 1;
        for (let i = 0; i < segments + 1; i++) {
            pts.push(this.lerp(i / segments).coords.multiplyScalar(1.001));
        }
        return pts;
    }

    intersectArc(other: SphericalArc): SpherePoint | undefined {
        let candidates;
        try {
            candidates = this.greatCircle.intersectGreatCircle(other.greatCircle);
        } catch (e) {
            if ((this.p1.equals(other.p1) && this.t1.dot(other.t1) < 0) &&
                (this.p1.equals(other.p2) && this.t1.dot(other.t2) < 0)) {
                return this.p1.clone();
            }
            if ((this.p2.equals(other.p1) && this.t2.dot(other.t1) < 0) &&
                (this.p2.equals(other.p2) && this.t2.dot(other.t2) < 0)) {
                return this.p2.clone();
            }
            if (this.containsPoint(other.p1) || this.containsPoint(other.p2) ||
                this.containsPoint(other.p1) || this.containsPoint(other.p2)) {
                throw Error('arcs overlap');
            }
            return undefined;
        }
        for (let c of candidates) {
            if (this.containsPoint(c) && other.containsPoint(c)) return c;
        }
        return undefined;
    }
}

export class SphericalPolygon {
    n: number;
    arcs: SphericalArc[] = [];
    perimeter: number;

    constructor(readonly vertices: SpherePoint[]) {
        this.n = vertices.length;
        this.perimeter = 0;
        for (let i = 0; i < this.n; i++) {
            let a = new SphericalArc(vertices[i], vertices[(i + 1) % this.n]);
            this.arcs.push(a);
            this.perimeter += a.length;
        }
    }

    dual(): SphericalPolygon {
        const dualVertices = [];
        for (let i = 0; i < this.n; i++) {
            dualVertices.push(new SpherePoint(this.arcs[i].greatCircle.normal));
        }
        return new SphericalPolygon(dualVertices);
    }
}

export class SphericalCircle {
    constructor(readonly center: SpherePoint, readonly radius: number) {
    }
}

function arcPoints(phi: number, theta: number, start: number, end: number, n: number): Vector3[] {
    const r1 = new Matrix4().makeRotationY(phi);
    const r2 = new Matrix4().makeRotationZ(theta);
    const mat = r1.premultiply(r2);
    const pts = [];
    const dt = (end - start) / (n - 1);
    for (let i = 0; i < n; i++) {
        const t = start + i * dt;
        pts.push(new Vector3(
            Math.cos(t),
            Math.sin(t),
            0
        ).applyMatrix4(mat));
    }
    return pts;
}