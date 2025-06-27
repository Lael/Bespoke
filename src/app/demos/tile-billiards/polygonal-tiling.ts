import {ProtoTile, Tile} from "./tile";
import {Scene, Vector2} from "three";

interface Polygon {
    n: number;
}

export abstract class PolygonalTiling<
    T extends Tile,
    P extends Polygon> {
    tileset: ProtoTile<P>[];
    tiles: Set<T> = new Set<T>();
    tileIds: Set<String> = new Set<String>();
    tilesByType: T[][] = [];
    dirty: boolean = false;

    constructor(tileset: ProtoTile<P>[]) {
        this.tileset = tileset;
        for (let i = 0; i < tileset.length; i++) {
            this.tilesByType.push([]);
        }
    }

    generate(depth: number): void {
        let seen: Set<String> = new Set<String>();
        let current: Set<T> = new Set<T>();
        let first = this.firstTile();
        current.add(first);
        this.addTile(first);

        let full = false;
        for (let i = 0; i < depth; i++) {
            let frontier: Set<T> = new Set<T>();
            for (let tile of current.values()) {
                let p = this.tileset[tile.tilesetIndex].polygon;
                for (let sideIndex = 0; sideIndex < p.n; sideIndex++) {
                    let adj = this.adjacentTile(tile, sideIndex);
                    let id = adj.id;
                    if (!seen.has(id)) {
                        frontier.add(adj);
                        seen.add(id);
                        if (!this.addTile(adj)) full = true;
                    }
                }
            }
            current = frontier;
            if (full) break;
        }
    }

    addTile(t: T): boolean {
        if (this.tileIds.has(t.id)) return true;
        if (this.tiles.size > 1e4) return false;
        this.tileIds.add(t.id);
        this.tiles.add(t);
        this.tilesByType[t.tilesetIndex].push(t);
        this.dirty = true;
        return true;
    }

    abstract firstTile(): T;

    abstract adjacentTile(t: T, sideIndex: number): T;

    abstract draw(scene: Scene): void;

    abstract play(iterations: number, start: Vector2, direction: number): void;
}