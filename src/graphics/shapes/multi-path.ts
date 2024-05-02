import {Drawable} from "./drawable";
import {Complex} from "../../math/complex";
import {Color} from "./color";
import {Shape2D, Vertex2D} from "./shape2D";
import {Arc, ArcSpec} from "./arc";
import {ArcSegment as ArcSegment} from "../../math/geometry/arc-segment";
import {Segment} from "../../math/geometry/segment";
import {LineSegment} from "../../math/geometry/line-segment";
import {UniformType} from "../gl/shader";
import {Path} from "./path";

export class MultiArc extends Drawable {
    constructor(gl: WebGL2RenderingContext, spec: MultiArcSpec, ordering = 0) {
        const vertices: Vertex2D[] = [];
        let path;
        if (spec.thickness === 0) {
            let lastVertex: Complex | null = null;
            for (let i = 0; i < spec.segments.length; i++) {
                const s = spec.segments[i];
                if (s.length < 2) continue;
                if (lastVertex !== null) {
                    vertices.push(new Vertex2D(lastVertex, spec.skipColor));
                    vertices.push(new Vertex2D(s[0], spec.skipColor));
                }
                vertices.push(...s.map(v => new Vertex2D(v, spec.color)));
                lastVertex = s[s.length - 1];
            }
            path = new Shape2D(gl, vertices, gl.LINE_STRIP);
        } else {
            for (let i = 0; i < spec.segments.length; i++) {
                const s = spec.segments[i];
                if (s.length < 2) continue;
                vertices.push(...Path.thickPathVertices(s, spec.thickness, spec.color));
            }
            path = new Shape2D(gl, vertices, gl.TRIANGLES);
        }
        const uniforms = new Map<string, UniformType>();
        uniforms.set('uOrdering', ordering);
        super([path], uniforms);
    }

    static fromSegmentList(gl: WebGL2RenderingContext,
                           segments: Segment[],
                           color: Color = Color.ONYX,
                           skipColor: Color = Color.ZERO,
                           thickness: number = 0,
                           ordering = 0): MultiArc {
        const vertexArrays: Complex[][] = [];
        for (let s of segments) {
            if (s instanceof LineSegment) {
                vertexArrays.push([s.start, s.end]);
            } else if (s instanceof ArcSegment) {
                const vertices = Arc.interpolate(new ArcSpec(
                    s.center,
                    s.radius,
                    s.startAngle,
                    s.endAngle,
                    color,
                ));

                vertexArrays.push(vertices);
            } else {
                throw Error('Unknown segment type')
            }
        }
        return new MultiArc(gl, new MultiArcSpec(vertexArrays, color, skipColor, thickness), ordering);
    }
}

export class MultiArcSpec {
    constructor(readonly segments: Complex[][], readonly color: Color, readonly skipColor: Color = Color.ZERO, readonly thickness = 0) {
    }
}