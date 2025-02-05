import {AffineTile} from "./affine-tile";
import {Color, Vector2} from "three";
import {AffinePolygon} from "./affine-polygon";
import {AffinePolygonalTiling} from "./affine-polygonal-tiling";

export class AffineQuasiregularTiling extends AffinePolygonalTiling {
    centerToCenter: number;

    constructor(n: number, m: number) {
        super([
            {polygon: AffinePolygon.regular(n, 1), color: new Color(0x444444)},
            {polygon: AffinePolygon.regular(m, 1), color: new Color(0x999999)},
        ]);
        this.centerToCenter =
            0.5 / Math.tan(Math.PI / n) +
            0.5 / Math.tan(Math.PI / m);
    }


    adjacentTile(t: AffineTile, sideIndex: number): AffineTile {
        let theta = t.rotation + (sideIndex + 0.5) * 2 * Math.PI / this.tileset[t.tilesetIndex].polygon.n;
        let index = (t.tilesetIndex + 1) % 2;
        // every edge has an n-gon on one side and an m-gon on the other, so we simply toggle the tileset index
        return new AffineTile(index,
            t.position.clone().add(new Vector2(
                this.centerToCenter * Math.cos(theta),
                this.centerToCenter * Math.sin(theta)
            )),
            theta + Math.PI * (1 - 1.0 / this.tileset[index].polygon.n)
        );
    }

    firstTile(): AffineTile {
        return new AffineTile(0, new Vector2(), 0);
    }
}