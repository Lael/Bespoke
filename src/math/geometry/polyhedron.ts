import {Plane} from "./plane";
import {Polygon3D} from "./polygon3D";
import {LineSegment3D} from "./line3D";
import {Triangle, Vector3} from "three";
import {Mesh} from "../../graphics/shapes/mesh";
import {Color} from "../../graphics/shapes/color";
import {closeEnough} from "../math-helpers";

// Assumed to be convex!
export class Polyhedron {
    constructor(readonly faces: Polygon3D[]) {
        // TODO: Check euler characteristic
        // TODO: Check convexity
        // const f = faces.length;
        // let e = 0;
        // for (let face of faces) {
        //
        // }
    }

    intersectPlane(plane: Plane): Polygon3D|null {
        const segments: LineSegment3D[] = [];
        for (let face of this.faces) {
            const s = face.intersectPlane(plane);
            if (s) segments.push(s);
        }
        if (segments.length < 3) {
            return null;
        }
        const orderedSegments: LineSegment3D[] = [segments[0]];
        for (let i = 1; i < segments.length; i++) {
            const os = orderedSegments[orderedSegments.length - 1];
            for (let s of segments) {
                if (closeEnough(s.start.distanceTo(os.end), 0) && !closeEnough(s.end.distanceTo(os.start), 0)) {
                    orderedSegments.push(s);
                    break;
                }
                if (closeEnough(s.end.distanceTo(os.end), 0) && !closeEnough(s.start.distanceTo(os.start), 0)) {
                    orderedSegments.push(new LineSegment3D(s.end, s.start));
                    break;
                }
            }
        }
        const vertices: Vector3[] = orderedSegments.map(os => os.start);
        return new Polygon3D(vertices);
    }

    toMesh(gl: WebGL2RenderingContext, fill: Color|undefined, border: Color|undefined): Mesh {
        const triangles: Triangle[] = [];
        const segments: LineSegment3D[] = [];
        for (let face of this.faces) {
            triangles.push(...face.fillTriangles());
            segments.push(...face.borderSegments());
        }
        return new Mesh(gl, triangles, segments, fill, border);
    }
}

