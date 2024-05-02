import {Polygon2D, PolygonSpec} from "./polygon2D";
import {Complex} from "../../math/complex";
import {Color} from "./color";
import {Arc, ArcSpec} from "./arc";

export class Stadium extends Polygon2D {
    constructor(gl: WebGL2RenderingContext, spec: StadiumSpec, ordering = 0) {
        const a1 = new ArcSpec(new Complex(spec.length / 2, 0), spec.radius, -Math.PI / 2, Math.PI / 2, Color.BLACK);
        const a2 = new ArcSpec(new Complex(-spec.length / 2, 0), spec.radius, Math.PI / 2, 3 * Math.PI / 2, Color.BLACK);
        const vertices = Arc.interpolate(a1);
        vertices.push(...Arc.interpolate(a2));
        super(gl, new PolygonSpec(vertices, spec.fill, spec.border, spec.thickness), ordering);
        this.model.setPosition(spec.center.x, spec.center.y, 0);
    }
}

export class StadiumSpec {
    constructor(readonly center: Complex,
                readonly length: number,
                readonly radius: number,
                readonly fill: Color | undefined,
                readonly border: Color | undefined,
                readonly thickness: number = 0) {
    }
}