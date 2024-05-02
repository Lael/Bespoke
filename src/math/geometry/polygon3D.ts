import {Plane} from "./plane";
import {Triangle, Vector3} from "three";
import {LineSegment3D} from "./line3D";
import {Mesh} from "../../graphics/shapes/mesh";
import {Color} from "../../graphics/shapes/color";

// Assumed to be convex
export class Polygon3D {
    readonly plane: Plane;

    constructor(readonly vertices: Vector3[]) {
        if (vertices.length < 3) throw Error('Face must have at least 3 vertices');
        this.plane = Plane.fromThreePoints(vertices[0], vertices[1], vertices[2]);
        for (let i = 3; i < vertices.length; i++) {
            if (!this.plane.containsPoint(vertices[i])) throw Error('All face vertices must be coplanar');
        }
    }

    intersectPlane(other: Plane): LineSegment3D | null {
        if (this.plane.equals(other)) {
            return null;
        }
        const intersectionPoints: Vector3[] = [];
        for (let v of this.vertices) {
            if (other.containsPoint(v)) {
                intersectionPoints.push(v);
            }
        }
        for (let i = 0; i < this.vertices.length; i++) {
            const intersection = new LineSegment3D(
                this.vertices[i],
                this.vertices[(i + 1) % this.vertices.length]
            ).intersectPlane(other);
            if (intersection) intersectionPoints.push(intersection);
        }
        if (intersectionPoints.length === 2) return new LineSegment3D(intersectionPoints[0], intersectionPoints[1]);
        return null;
    }

    fillTriangles(): Triangle[] {
        const triangles: Triangle[] = [];
        for (let i = 0; i < this.vertices.length - 2; i++) {
            triangles.push(new Triangle(
                this.vertices[0],
                this.vertices[i + 1],
                this.vertices[i + 2],
            ));
            triangles.push(new Triangle(
                this.vertices[0],
                this.vertices[i + 2],
                this.vertices[i + 1],
            ));
        }
        return triangles;
    }

    borderSegments(): LineSegment3D[] {
        const segments: LineSegment3D[] = [];
        for (let i = 0; i < this.vertices.length; i++) {
            segments.push(new LineSegment3D(
                this.vertices[i],
                this.vertices[(i + 1) % this.vertices.length],
            ));
        }
        return segments;
    }

    toMesh(gl: WebGL2RenderingContext, fill: Color|undefined, border: Color|undefined): Mesh {
        return new Mesh(gl, this.fillTriangles(), this.borderSegments(), fill, border);
    }
}