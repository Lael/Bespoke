import {Complex} from "../../math/complex";
import {Color} from "./color";
import {Shape} from "./shape";
import {VertexAttrib} from "../gl/vertex-attrib";

export class Shape2D extends Shape {
    constructor(gl: WebGL2RenderingContext,
                vertices: Vertex2D[],
                drawMode: GLenum) {
        const vertexAttribs = [
            new VertexAttrib(0, 2, gl.FLOAT, 6 * 4, 0), // Position
            new VertexAttrib(1, 4, gl.FLOAT, 6 * 4, 2 * 4), // Color
        ];
        const data: number[] = [];
        for (let v of vertices) v.writeTo(data);
        super(gl, vertexAttribs, vertices.length, data, drawMode);
    }
}

export class Vertex2D {
    constructor(readonly p: Complex, readonly c: Color) {
    }

    writeTo(data: number[]) {
        data.push(this.p.x);
        data.push(this.p.y);
        data.push(this.c.r);
        data.push(this.c.g);
        data.push(this.c.b);
        data.push(this.c.a);
    }
}

