import {Drawable} from "./drawable";
import {Triangle} from "three";
import {Color} from "./color";
import {Shape3D, Vertex3D} from "./shape3D";
import {LineSegment3D} from "../../math/geometry/line3D";

export class Mesh extends Drawable {
    constructor(gl: WebGL2RenderingContext,
                triangles: Triangle[],
                borders: LineSegment3D[],
                fillColor: Color|undefined,
                borderColor: Color|undefined) {
        if (!fillColor && !borderColor) throw Error('Invisible polygon');
        const shapes: Shape3D[] = [];
        if (fillColor) {
            const fill = new Shape3D(gl, Mesh.fillVertices(triangles, fillColor), gl.TRIANGLES);
            shapes.push(fill);
        }
        if (borderColor) {
            const border = new Shape3D(gl, Mesh.borderVertices(borders, borderColor), gl.LINES);
            shapes.push(border);
        }
        super(shapes);
    }

    private static fillVertices(triangles: Triangle[], fill: Color): Vertex3D[] {
        const vertices: Vertex3D[] = [];
        for (let t of triangles) {
            vertices.push(new Vertex3D(t.a, fill));
            vertices.push(new Vertex3D(t.b, fill));
            vertices.push(new Vertex3D(t.c, fill));
        }
        return vertices;
    }

    private static borderVertices(segments: LineSegment3D[], border: Color): Vertex3D[] {
        const vertices: Vertex3D[] = [];
        for (let s of segments) {
            vertices.push(new Vertex3D(s.start, border));
            vertices.push(new Vertex3D(s.end, border));
        }
        return vertices;
    }
}