import {Complex} from "../../math/complex";
import {Color} from "./color";
import {Path, PathSpec} from "./path";

export class Arc extends Path {
    constructor(gl: WebGL2RenderingContext, spec: ArcSpec) {
        const points = Arc.interpolate(spec);
        super(gl, new PathSpec(points, spec.color));
    }

    static interpolate(spec: ArcSpec): Complex[] {
        const points: Complex[] = [];
        for (let i = 0; i <= spec.segments; i++) {
            const angle = spec.start + i / spec.segments * (spec.end - spec.start);
            const r = Complex.polar(spec.radius, angle);
            const p = spec.center.plus(r);
            points.push(p);
        }
        return points;
    }
}

export class ArcSpec {
    readonly segments: number;
    constructor(readonly center: Complex,
                readonly radius: number,
                readonly start: number,
                readonly end: number,
                readonly color: Color,
                segments: number = 0) {
        if (center.isInfinite()) throw Error('Cannot center an arc at infinity');
        if (radius <= 0) throw Error('Arc radius must be positive');
        if (start > end || end - start > 2 * Math.PI) throw Error('Nonsense angles');
        if (segments > 0) this.segments = segments;
        else this.segments = Math.round((end - start) * 180 / Math.PI) + 1;
    }
}