import {Tile} from "./tile";
import {Mobius} from "../../../math/mobius";
import {Complex} from "../../../math/complex";
import {HyperPoint} from "../../../math/hyperbolic/hyperbolic";

export class HyperbolicTile extends Tile {
    mobius: Mobius;

    constructor(tileIndex: number, mobius: Mobius) {
        super(tileIndex);
        this.mobius = mobius;
    }

    get id(): string {
        let z = this.mobius.apply(new Complex());
        let d = HyperPoint.fromKlein(z).distance(HyperPoint.fromKlein(new Complex()));
        let x = Math.round(z.x * d * 100.0);
        let y = Math.round(z.y * d * 100.0);
        return `${this.tilesetIndex}: (${x}, ${y})`;
    }
}