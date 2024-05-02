import {Drawable} from "./drawable";
import {Complex} from "../../math/complex";
import {Color} from "./color";
import {Shape2D, Vertex2D} from "./shape2D";
import {normalizeAngle} from "../../math/math-helpers";
import {UniformType} from "../gl/shader";

export class Path extends Drawable {
    constructor(gl: WebGL2RenderingContext, spec: PathSpec, ordering: number = 0) {
        let path;
        if (spec.thickness === 0) {
            const vertices: Vertex2D[] = spec.vertices.map(v => new Vertex2D(v, spec.color));
            path = new Shape2D(gl, vertices, gl.LINE_STRIP)
        } else {
            const vertices = Path.thickPathVertices(spec.vertices, spec.thickness, spec.color)
            path = new Shape2D(gl, vertices, gl.TRIANGLES);
        }
        const uniforms = new Map<string, UniformType>();
        uniforms.set('uOrdering', ordering);
        super([path], uniforms);
    }

    static thickPathVertices(points: Complex[], thickness: number, color: Color): Vertex2D[] {
        // const filteredPoints = points.filter((v, i) => i === 0 || !v.equals(points[i - 1]));
        const n = points.length;
        const vertices: Vertex2D[] = [];
        for (let i = 0; i < n - 2; i++) {
            const v1 = points[i];
            const v2 = points[i + 1];
            const v3 = points[i + 2];
            vertices.push(...Path.quad(v1, v2, thickness, color));
            vertices.push(...Path.corner(v1, v2, v3, thickness, color));
        }
        const v1 = points[n - 2];
        const v2 = points[n - 1];
        vertices.push(...Path.quad(v1, v2, thickness, color));
        if (points[n - 1].equals(points[0])) {
            const v3 = points[1];
            vertices.push(...Path.corner(v1, v2, v3, thickness, color));
        } else {
        }
        return vertices;
    }

    static quad(v1: Complex, v2: Complex, thickness: number, color: Color): Vertex2D[] {
        const diff = Complex.polar(thickness / 2, v1.heading(v2) + Math.PI / 2);
        const a = new Vertex2D(v1.plus(diff), color);
        const b = new Vertex2D(v1.minus(diff), color);
        const c = new Vertex2D(v2.minus(diff), color);
        const d = new Vertex2D(v2.plus(diff), color);
        return [
            a, b, c,
            c, d, a,
        ];
    }

    static corner(v1: Complex, v2: Complex, v3: Complex, thickness: number, color: Color): Vertex2D[] {
        const h1 = v1.heading(v2);
        const h2 = normalizeAngle(v2.heading(v3), h1);
        const d1 = Complex.polar(thickness / 2, h1 + Math.PI / 2);
        const d2 = Complex.polar(thickness / 2, h2 + Math.PI / 2);
        if (h2 - h1 > Math.PI) {
            return [
                new Vertex2D(v2.plus(d1), color),
                new Vertex2D(v2, color),
                new Vertex2D(v2.plus(d2), color),
            ];
        } else {
            return [
                new Vertex2D(v2, color),
                new Vertex2D(v2.minus(d1), color),
                new Vertex2D(v2.minus(d2), color),
            ];
        }
    }

    // static fromHyperbolicGeodesic(gl: WebGL2RenderingContext, g: HyperbolicGeodesic, color: Color = Color.ONYX): Path {
    //     if (g.isDiameter) {
    //         return new Path(gl, new PathSpec(
    //             [g.ideal1, g.ideal2],
    //             color,
    //         ));
    //     }
    //     return new Arc(gl, new ArcSpec(
    //         g.circle!.center,
    //         g.circle!.radius,
    //         g.startAngle,
    //         g.endAngle,
    //         color,
    //     ));
    // }

    // static fromSegment(gl: WebGL2RenderingContext, s: Segment, color: Color = Color.ONYX): Path {
    //     if (s instanceof LineSegment) {
    //         return new Path(gl, new PathSpec([s.start, s.end], color));
    //     } else if (s instanceof ArcSegment) {
    //         return new ArcShape(gl, new ArcSpec(
    //             s.center,
    //             s.radius,
    //             s.startAngle,
    //             s.endAngle,
    //             color,
    //         ));
    //     } else {
    //         throw Error('Unknown segment type')
    //     }
    // }
}

export class PathSpec {
    constructor(readonly vertices: Complex[],
                readonly color: Color,
                readonly thickness: number = 0) {
        if (vertices.length < 2) throw Error('Degenerate path');
    }
}