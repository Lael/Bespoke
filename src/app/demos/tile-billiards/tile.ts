import {Color} from "three";

export abstract class Tile {
    tilesetIndex: number;

    constructor(tileIndex: number) {
        this.tilesetIndex = tileIndex;
    }

    abstract get id(): string;
}

export interface ProtoTile<P> {
    polygon: P,
    color: Color,
}