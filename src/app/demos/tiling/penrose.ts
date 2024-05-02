import {Graph} from "./graph";
import {AnnotationType, lineAnnotation, polar, Polygon, ringAnnotation, Tile, TilePosition, Tiling} from "./tiling";
import {Color, Vector2} from "three";

export type TileSpec = {
    tileType: TileType;
    tilePosition: TilePosition;
};

export type TileAdjacency = {
    startSide: number;
    endSide: number;
};

export enum TileType {
    KITE,
    DART,
    WIDE,
    THIN,
}

const PI5 = Math.PI / 5;
const PHI = Math.sqrt(5) / 2 + 0.5;

// const C1 = new Color(0x9ac9e3);
// const C2 = new Color(0x499bb9);
// const C3 = new Color(0x2f6680);
// const C4 = new Color(0x113045);
// const C5 = new Color(0xf5b942);
// const C6 = new Color(0xf0a23b);
// const C7 = new Color(0xee8a33);

const KITE_COLOR = new Color(0x9ad9e3);
const DART_COLOR = new Color(0xf0a23b);
const WIDE_COLOR = new Color(0x89B0AE);
const THIN_COLOR = new Color(0xFCBF49);

// const KITE_COLOR = C1;
// const DART_COLOR = C5;

const MATCH_1 = new Color(0xcc0033);
const MATCH_2 = new Color(0x0033bb);
const SUB_COLOR = new Color(0x000000);

const THICKNESS = 0.06;

const KITE: Tile = new Tile(
    new Polygon([
        new Vector2(0, 0),
        new Vector2(PHI / 2 - 0.5, -Math.sin(PI5) * PHI),
        new Vector2(PHI, 0),
        new Vector2(PHI / 2 - 0.5, Math.sin(PI5) * PHI),
        new Vector2(0, 0),
    ]),
    KITE_COLOR,
    [
        ringAnnotation(new Vector2(PHI, 0),
            1, THICKNESS,
            4 * PI5, 6 * PI5,
            MATCH_2, AnnotationType.MATCHING),
        ringAnnotation(new Vector2(),
            PHI - 1, THICKNESS,
            8 * PI5, 2 * PI5,
            MATCH_1, AnnotationType.MATCHING),
        lineAnnotation(new Vector2(), new Vector2(PHI, 0), THICKNESS / 2, SUB_COLOR, AnnotationType.SUBDIVISION),
        lineAnnotation(
            new Vector2(PHI - 1, 0),
            new Vector2(Math.cos(PI5) / PHI + PHI - 1, Math.sin(PI5) / PHI),
            THICKNESS / 2, SUB_COLOR, AnnotationType.SUBDIVISION),
        lineAnnotation(
            new Vector2(PHI - 1, 0),
            new Vector2(Math.cos(PI5) / PHI + PHI - 1, -Math.sin(PI5) / PHI),
            THICKNESS / 2, SUB_COLOR, AnnotationType.SUBDIVISION),
        lineAnnotation(new Vector2(), new Vector2(PHI, 0), THICKNESS / 2, SUB_COLOR, AnnotationType.ROBINSON),
    ],
);

const DART: Tile = new Tile(
    new Polygon([
        new Vector2(0, 0),
        new Vector2(-(PHI / 2 - 0.5), -Math.sin(PI5) * PHI),
        new Vector2(1, 0),
        new Vector2(-(PHI / 2 - 0.5), Math.sin(PI5) * PHI),
        new Vector2(0, 0),
    ]),
    DART_COLOR,
    [
        ringAnnotation(new Vector2(1, 0), PHI - 1, THICKNESS, 4 * PI5, 6 * PI5, MATCH_2, AnnotationType.MATCHING),
        ringAnnotation(new Vector2(), 2 - PHI, THICKNESS, 7 * PI5, 3 * PI5, MATCH_1, AnnotationType.MATCHING),
        lineAnnotation(new Vector2(), polar(PHI - 1, 2 * PI5), THICKNESS / 2, SUB_COLOR, AnnotationType.SUBDIVISION),
        lineAnnotation(new Vector2(), polar(PHI - 1, -2 * PI5), THICKNESS / 2, SUB_COLOR, AnnotationType.SUBDIVISION),
        lineAnnotation(new Vector2(), new Vector2(1, 0), THICKNESS / 2, SUB_COLOR, AnnotationType.ROBINSON),
    ],
);

const WX = PHI * Math.cos(PI5);
const WY = PHI * Math.sin(PI5);
const TX = PHI * Math.cos(2 * PI5);
const TY = PHI * Math.sin(2 * PI5);

const WIDE: Tile = new Tile(
    new Polygon([
        new Vector2(WX, 0),
        new Vector2(0, WY),
        new Vector2(-WX, 0),
        new Vector2(0, -WY),
    ]),
    WIDE_COLOR,
    [
        ringAnnotation(new Vector2(WX, 0), PHI / 2 + 0.5, THICKNESS, 4 * PI5, 6 * PI5, MATCH_1, AnnotationType.MATCHING),
        ringAnnotation(new Vector2(-WX, 0), PHI / 2 - 0.5, THICKNESS, 9 * PI5, PI5, MATCH_2, AnnotationType.MATCHING),
        lineAnnotation(new Vector2(-WX, 0), new Vector2(WX - PHI, 0), THICKNESS / 2, SUB_COLOR, AnnotationType.SUBDIVISION),
        lineAnnotation(
            new Vector2(0, -WY),
            new Vector2(WX - PHI, 0),
            THICKNESS / 2, SUB_COLOR,
            AnnotationType.SUBDIVISION),
        lineAnnotation(
            new Vector2(0, WY),
            new Vector2(WX - PHI, 0),
            THICKNESS / 2, SUB_COLOR,
            AnnotationType.SUBDIVISION),
        lineAnnotation(
            new Vector2(WX - PHI, 0),
            new Vector2(WX - PHI / 2, -WY / PHI),
            THICKNESS / 2, SUB_COLOR,
            AnnotationType.SUBDIVISION),
        lineAnnotation(
            new Vector2(WX - PHI, 0),
            new Vector2(WX - PHI / 2, WY / PHI),
            THICKNESS / 2, SUB_COLOR,
            AnnotationType.SUBDIVISION),
        lineAnnotation(new Vector2(-WX, 0), new Vector2(WX, 0), THICKNESS / 2, SUB_COLOR, AnnotationType.ROBINSON),
    ],
);

const THIN: Tile = new Tile(
    new Polygon([
        new Vector2(TX, 0),
        new Vector2(0, TY),
        new Vector2(-TX, 0),
        new Vector2(0, -TY),
    ]),
    THIN_COLOR,
    [
        ringAnnotation(new Vector2(-TX, 0), PHI / 2 - 0.5, THICKNESS, 8 * PI5, 2 * PI5, MATCH_1, AnnotationType.MATCHING),
        ringAnnotation(new Vector2(TX, 0), PHI / 2 - 0.5, THICKNESS, 3 * PI5, 7 * PI5, MATCH_2, AnnotationType.MATCHING),
        lineAnnotation(new Vector2(TX, 0), new Vector2(TX - 2 * TX * Math.cos(PI5), 2 * TX * Math.sin(PI5)), THICKNESS / 2, SUB_COLOR, AnnotationType.SUBDIVISION),
        lineAnnotation(new Vector2(TX, 0), new Vector2(TX - 2 * TX * Math.cos(PI5), -2 * TX * Math.sin(PI5)), THICKNESS / 2, SUB_COLOR, AnnotationType.SUBDIVISION),
        lineAnnotation(new Vector2(-TX, 0), new Vector2(TX, 0), THICKNESS / 2, SUB_COLOR, AnnotationType.SUBDIVISION),
        lineAnnotation(new Vector2(-TX, 0), new Vector2(TX, 0), THICKNESS / 2, SUB_COLOR, AnnotationType.ROBINSON),
    ],
);

export enum PenroseTileset {
    P2 = 'P2',
    P3 = 'P3',
}

export abstract class PenroseTiling {
    readonly tiles: Tile[] = [KITE, DART, WIDE, THIN];
    graph: Graph<TileSpec, TileAdjacency> = new Graph();
    readonly levels: Graph<TileSpec, TileAdjacency>[] = [this.graph];
    currentLevel = 0;

    // private findNode(pt: Vector2) {
    //     const distances = [];
    //     for (let nodeId of this.graph.nodeIds) {
    //         const data = this.graph.getNodeData(nodeId);
    //         if (data) distances.push({nodeId, distance: pt.distanceTo(data.tilePosition.position)});
    //     }
    //     distances.sort((a, b) => a.distance - b.distance);
    //
    // }

    private nodeContainsPoint(pt: Vector2, nodeId: number): boolean {
        const nd = this.graph.getNodeData(nodeId);
        if (!nd) return false;
        const tp = pt.clone().sub(nd.tilePosition.position).rotateAround(new Vector2(), -nd.tilePosition.rotation);
        return this.tiles[nd.tileType].polygon.containsPoint(tp);
    }

    abstract convert(): PenroseTiling;

    abstract decomposeTiles(nodeData: TileSpec[]): TileSpec[];

    abstract convertTiles(nodeData: TileSpec[]): TileSpec[];

    private addBeforeAfter(before: TileSpec[], after: TileSpec[], beforeOffset: Vector2, afterOffset: Vector2) {
        for (let b of before) {
            this.graph.addNode({
                tileType: b.tileType,
                tilePosition: new TilePosition(
                    b.tilePosition.position.clone().add(beforeOffset),
                    b.tilePosition.rotation,
                )
            });
        }
        for (let a of after) {
            this.graph.addNode({
                tileType: a.tileType,
                tilePosition: new TilePosition(
                    a.tilePosition.position.clone().add(afterOffset),
                    a.tilePosition.rotation,
                )
            });
        }
    }

    addSubDemo(before: TileSpec[], beforeOffset: Vector2, afterOffset: Vector2): void {
        const after = this.decomposeTiles(before);
        this.addBeforeAfter(before, after, beforeOffset, afterOffset);
    }

    addConvertDemo(before: TileSpec[], beforeOffset: Vector2, afterOffset: Vector2): void {
        const after = this.convertTiles(before);
        this.addBeforeAfter(before, after, beforeOffset, afterOffset);
    }

    decompose() {
        this.currentLevel -= 1;
        if (this.levels.length > -this.currentLevel) {
            this.graph = this.levels[-this.currentLevel];
            return;
        }
        const nodes = this.decomposeTiles(Array.from(this.graph.nodes).map(n => n.data));
        const newLevel = new Graph<TileSpec, TileAdjacency>();

        for (let nodeData of nodes) {
            newLevel.addNode(nodeData);
        }

        this.graph = newLevel;
        this.levels.push(newLevel);
    }

    compose(): boolean {
        if (this.currentLevel === 0) return false;
        if (this.currentLevel < 0) {
            this.currentLevel += 1;
        }
        this.graph = this.levels[-this.currentLevel];
        return true;

        // Idea: look at the short edges out of each kite.
        // If they are both to darts, make a dart.
        // If one is to a kite and the other is to a dart, make a kite.
        // If either or both are missing, skip.
    }

    get tiling(): Tiling {
        const positions: TilePosition[][] = [];
        for (let tile of this.tiles) positions.push([]);
        for (let node of this.graph.nodes) {
            const spec: TileSpec = node.data;
            positions[spec.tileType].push(spec.tilePosition);
        }
        return new Tiling(this.tiles, positions);
    }
}