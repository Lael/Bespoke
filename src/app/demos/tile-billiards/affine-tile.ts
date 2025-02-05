import {Tile} from "./tile";
import {Vector2} from "three";

export class AffineTile extends Tile {
    position: Vector2;
    rotation: number;

    constructor(tileIndex: number, position: Vector2, rotation: number) {
        super(tileIndex);
        this.position = position;
        this.rotation = rotation;
    }

    get id(): string {
        let x = Math.round(this.position.x * 1000.0);
        let y = Math.round(this.position.y * 1000.0);
        return `${this.tilesetIndex}: (${x}, ${y})`;
    }
}