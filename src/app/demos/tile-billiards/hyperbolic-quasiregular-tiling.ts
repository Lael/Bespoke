import {HyperbolicPolygonalTiling} from "./hyperbolic-polygonal-tiling";
import {HyperbolicTile} from "./hyperbolic-tile";
import {Mobius} from "../../../math/complex/mobius";
import {HyperbolicPolygon} from "./hyperbolic-polygon";
import {Color} from "three";
import {Complex} from "../../../math/complex/complex";

export class HyperbolicQuasiregularTiling extends HyperbolicPolygonalTiling {
    centerToCenter: number;

    constructor(n: number, m: number) {
        let sl = sidelength(n, m);
        super([
            {polygon: HyperbolicPolygon.regular(n, sl), color: new Color(0x444444)},
            {polygon: HyperbolicPolygon.regular(m, sl), color: new Color(0x999999)},
        ]);
        this.centerToCenter = Math.acosh(1.0 / (Math.tan(Math.PI / n) * Math.tan(Math.PI / m)));
    }

    adjacentTile(t: HyperbolicTile, sideIndex: number): HyperbolicTile {
        let adj = t.neighbors.get(sideIndex);
        if (!!adj) return adj;
        const index = (t.tilesetIndex + 1) % 2;
        const theta = (sideIndex + 0.5) * 2 * Math.PI / this.tileset[t.tilesetIndex].polygon.n;
        const m = t.mobius.compose(
                Mobius.blaschke(Complex.polar(Math.tanh(this.centerToCenter / 2), theta)).inverse())
            .compose(Mobius.rotation(theta + Math.PI * (1 - 1.0 / this.tileset[index].polygon.n)));
        adj = new HyperbolicTile(index, m);
        t.neighbors.set(sideIndex, adj);
        return adj;
    }

    firstTile(): HyperbolicTile {
        return new HyperbolicTile(0, Mobius.IDENTITY);
    }
}

function sidelength(n: number, m: number): number {
    const cn = Math.cos(Math.PI / n);
    const cm = Math.cos(Math.PI / m);
    return 2 * Math.acosh(Math.sqrt(cn * cn + cm * cm));
}