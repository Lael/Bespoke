import {Drawable} from "./drawable";
import {Complex} from "../../math/complex";
import {Color} from "./color";
import {Shape2D, Vertex2D} from "./shape2D";
import {UniformType} from "../gl/shader";

export class PointCloud extends Drawable {
    constructor(gl: WebGL2RenderingContext, spec: PointCloudSpec, ordering: number) {
        const vertices: Vertex2D[] = [];
        for (let center of spec.centers) {
            const cv = new Vertex2D(center, spec.color);
            if (spec.radius <= 0) vertices.push(cv);
            else {
                for (let i = 0; i < 8; i++) {
                    const v1 = center.plus(Complex.polar(spec.radius, Math.PI / 4 * i));
                    const v2 = center.plus(Complex.polar(spec.radius, Math.PI / 4 * (i + 1)));
                    vertices.push(cv);
                    vertices.push(new Vertex2D(v1, spec.color));
                    vertices.push(new Vertex2D(v2, spec.color));
                }
            }
        }

        const shape = new Shape2D(gl, vertices, spec.radius > 0 ? gl.TRIANGLES : gl.POINTS);

        const uniforms = new Map<string, UniformType>();
        uniforms.set('uOrdering', ordering);
        super([shape], uniforms);
    }
}

export class PointCloudSpec {
    constructor(readonly centers: Complex[],
                readonly radius: number,
                readonly color: Color) {
    }
}