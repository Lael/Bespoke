import {Shape} from "./shape";
import {VertexAttrib} from "../gl/vertex-attrib";
import {Color} from "./color";
import {Vector3} from "three";

export class Shape3D extends Shape {
    constructor(gl: WebGL2RenderingContext,
                vertices: Vertex3D[],
                drawMode: GLenum) {
        const vertexAttribs = [
            new VertexAttrib(0, 3, gl.FLOAT, 7*4, 0), // Position
            new VertexAttrib(1, 4, gl.FLOAT, 7*4, 3*4), // Color
        ];
        const data: number[] = [];
        for (let v of vertices) v.writeTo(data);
        super(gl, vertexAttribs, vertices.length, data, drawMode);
    }
}

export class Vertex3D {
    constructor(private readonly p: Vector3, private readonly c: Color) {}

    writeTo(data: number[]) {
        data.push(this.p.x);
        data.push(this.p.y);
        data.push(this.p.z);
        data.push(this.c.r);
        data.push(this.c.g);
        data.push(this.c.b);
        data.push(this.c.a);
    }
}