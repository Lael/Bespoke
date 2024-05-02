import {Polygon2D, PolygonSpec} from "./polygon2D";
import {Complex} from "../../math/complex";
import {Color} from "./color";
import {Arc, ArcSpec} from "./arc";

export class Disk extends Polygon2D {
    constructor(gl: WebGL2RenderingContext, spec: DiskSpec, ordering = 0) {
        const arcSpec = new ArcSpec(Complex.ZERO, spec.radius, 0, 2 * Math.PI, Color.BLACK);
        const vertices = Arc.interpolate(arcSpec);
        super(gl, new PolygonSpec(vertices, spec.fill, spec.border, spec.thickness), ordering);
        this.model.setPosition(spec.center.x, spec.center.y, 0);
    }
}

export class DiskSpec {
    constructor(readonly center: Complex,
                readonly radius: number,
                readonly fill: Color | undefined,
                readonly border: Color | undefined,
                readonly thickness: number = 0) {
    }
}