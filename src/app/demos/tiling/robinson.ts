import {polar, TilePosition} from "./tiling";
import {Vector2} from "three";
import {normalizeAngle} from "../../../math/math-helpers";
import {PenroseTiling, TileSpec, TileType} from "./penrose";
import {Penrose3} from "./penrose3";

type KiteBreakdown = {
    leftKite: TilePosition;
    rightKite: TilePosition;
    leftDart: TilePosition;
    rightDart: TilePosition;
}

type DartBreakdown = {
    kite: TilePosition;
    leftDart: TilePosition;
    rightDart: TilePosition;
}

export enum VertexStarP2 {
    DEMO = 'Demo',
    SUB = 'Substitution',
    CONVERT = 'P3 Derivation',
    SUN = 'Sun',
    STAR = 'Star',
    ACE = 'Ace',
    DEUCE = 'Deuce',
    JACK = 'Jack',
    QUEEN = 'Queen',
    KING = 'King',
}

const PI5 = Math.PI / 5;
const PHI = Math.sqrt(5) / 2 + 0.5;

export class Penrose2 extends PenroseTiling {
    constructor(readonly start?: VertexStarP2) {
        super();
        if (!start) return;
        switch (start) {
        case VertexStarP2.DEMO:
            this.setDemo();
            break;
        case VertexStarP2.SUB:
            this.setSub();
            break;
        case VertexStarP2.CONVERT:
            this.setConvert();
            break;
        case VertexStarP2.SUN:
            this.setSun();
            break;
        case VertexStarP2.STAR:
            this.setStar();
            break;
        case VertexStarP2.ACE:
            this.setAce();
            break;
        case VertexStarP2.DEUCE:
            this.setDeuce();
            break;
        case VertexStarP2.JACK:
            this.setJack();
            break;
        case VertexStarP2.QUEEN:
            this.setQueen();
            break;
        case VertexStarP2.KING:
            this.setKing();
            break;
        }
    }

    private setDemo() {
        this.graph.addNode({
            tileType: TileType.KITE,
            tilePosition: new TilePosition(new Vector2(0.1, 0), 0),
        });
        this.graph.addNode({
            tileType: TileType.DART,
            tilePosition: new TilePosition(new Vector2(-0.1, 0), Math.PI),
        });
    }

    private setSub() {
        this.addSubDemo([{
            tileType: TileType.KITE,
            tilePosition: new TilePosition(new Vector2(0, 0), -Math.PI / 2),
        }], new Vector2(2.5, 1 + PHI), new Vector2(2.5, 0));

        this.addSubDemo([{
            tileType: TileType.DART,
            tilePosition: new TilePosition(new Vector2(0, 0), Math.PI / 2),
        }], new Vector2(-2.5, PHI), new Vector2(-2.5, -PHI));

        // Red Edges
        this.addSubDemo([{
            tileType: TileType.KITE, tilePosition: new TilePosition(
                new Vector2(),
                3 * PI5,
            )
        }, {
            tileType: TileType.DART, tilePosition: new TilePosition(
                polar(1, PI5),
                -1 * PI5
            )
        }], new Vector2(9, 1), new Vector2(9, -1 - PHI));
        // const r2 = new Vector2(15, 2.5);
        this.addSubDemo([{
            tileType: TileType.KITE, tilePosition: new TilePosition(
                new Vector2(),
                -0.5 * PI5,
            )
        }, {
            tileType: TileType.KITE, tilePosition: new TilePosition(
                new Vector2(),
                -4.5 * PI5
            )
        }], new Vector2(15, PHI), new Vector2(15, -PHI));

        // Blue Edges
        this.addSubDemo([{
            tileType: TileType.DART, tilePosition: new TilePosition(
                polar(1, 3.5 * PI5),
                1.5 * PI5
            )
        }, {
            tileType: TileType.DART, tilePosition: new TilePosition(
                polar(1, 1.5 * PI5),
                3.5 * PI5
            )
        }], new Vector2(24, 1), new Vector2(24, -1 - PHI));

        this.addSubDemo([{
            tileType: TileType.DART, tilePosition: new TilePosition(
                polar(1, 3.5 * PI5),
                -1.5 * PI5
            )
        }, {
            tileType: TileType.KITE, tilePosition: new TilePosition(
                polar(1, 0.5 * PI5),
                3.5 * PI5
            )
        }], new Vector2(30, PHI), new Vector2(30, -1 - PHI));

        this.addSubDemo([{
            tileType: TileType.KITE, tilePosition: new TilePosition(
                polar(1, 4.5 * PI5),
                1.5 * PI5
            )
        }, {
            tileType: TileType.KITE, tilePosition: new TilePosition(
                polar(1, 0.5 * PI5),
                3.5 * PI5
            )
        }], new Vector2(36, 1), new Vector2(36, -1 - PHI));
    }

    private setConvert(): void {
        this.addConvertDemo([{
            tileType: TileType.KITE, tilePosition: new TilePosition(
                new Vector2(),
                -0.5 * PI5,
            )
        }, {
            tileType: TileType.KITE, tilePosition: new TilePosition(
                new Vector2(),
                -4.5 * PI5
            )
        }], new Vector2(2.5, PHI), new Vector2(2.5, -PHI));

        this.addConvertDemo([{
            tileType: TileType.DART,
            tilePosition: new TilePosition(new Vector2(0, 0), Math.PI / 2),
        }], new Vector2(-2.5, PHI), new Vector2(-2.5, -PHI));
    }

    private setSun() {
        this.graph.addNode({tileType: TileType.KITE, tilePosition: new TilePosition(polar(PHI, 0 * PI5), 5 * PI5)});
        this.graph.addNode({tileType: TileType.KITE, tilePosition: new TilePosition(polar(PHI, 2 * PI5), 7 * PI5)});
        this.graph.addNode({tileType: TileType.KITE, tilePosition: new TilePosition(polar(PHI, 4 * PI5), 9 * PI5)});
        this.graph.addNode({tileType: TileType.KITE, tilePosition: new TilePosition(polar(PHI, 6 * PI5), 1 * PI5)});
        this.graph.addNode({tileType: TileType.KITE, tilePosition: new TilePosition(polar(PHI, 8 * PI5), 3 * PI5)});
        for (let i = 0; i < 5; i++) {
            this.graph.addEdge(i + 1, (i + 1) % 5 + 1, {startSide: 2, endSide: 3});
        }
    }

    private setStar() {
        this.graph.addNode({tileType: TileType.DART, tilePosition: new TilePosition(polar(1, 1 * PI5), 6 * PI5)});
        this.graph.addNode({tileType: TileType.DART, tilePosition: new TilePosition(polar(1, 3 * PI5), 8 * PI5)});
        this.graph.addNode({tileType: TileType.DART, tilePosition: new TilePosition(polar(1, 5 * PI5), 0 * PI5)});
        this.graph.addNode({tileType: TileType.DART, tilePosition: new TilePosition(polar(1, 7 * PI5), 2 * PI5)});
        this.graph.addNode({tileType: TileType.DART, tilePosition: new TilePosition(polar(1, 9 * PI5), 4 * PI5)});
        for (let i = 0; i < 5; i++) {
            this.graph.addEdge(i + 1, (i + 1) % 5 + 1, {startSide: 2, endSide: 3});
        }
    }

    private setAce() {
        this.graph.addNode({tileType: TileType.DART, tilePosition: new TilePosition(new Vector2(), 2.5 * PI5)});
        this.graph.addNode({
            tileType: TileType.KITE,
            tilePosition: new TilePosition(polar(1, 5.5 * PI5), 8.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.KITE,
            tilePosition: new TilePosition(polar(1, 9.5 * PI5), 6.5 * PI5)
        });
    }

    private setDeuce() {
        this.graph.addNode({
            tileType: TileType.DART,
            tilePosition: new TilePosition(polar(1, 1.5 * PI5), 3.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.DART,
            tilePosition: new TilePosition(polar(1, 3.5 * PI5), 1.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.KITE,
            tilePosition: new TilePosition(new Vector2(), 5.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.KITE,
            tilePosition: new TilePosition(new Vector2(), 9.5 * PI5)
        });
    }

    private setJack() {
        this.graph.addNode({
            tileType: TileType.KITE,
            tilePosition: new TilePosition(new Vector2(), 2.5 * PI5)
        });

        this.graph.addNode({
            tileType: TileType.DART,
            tilePosition: new TilePosition(polar(1, 0.5 * PI5), 8.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.DART,
            tilePosition: new TilePosition(polar(1, 4.5 * PI5), 6.5 * PI5)
        });

        this.graph.addNode({
            tileType: TileType.KITE,
            tilePosition: new TilePosition(polar(PHI, 6.5 * PI5), 1.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.KITE,
            tilePosition: new TilePosition(polar(PHI, 8.5 * PI5), 3.5 * PI5)
        });
    }

    private setQueen() {
        this.graph.addNode({
            tileType: TileType.DART,
            tilePosition: new TilePosition(polar(1, 2.5 * PI5), 7.5 * PI5)
        });

        this.graph.addNode({
            tileType: TileType.KITE,
            tilePosition: new TilePosition(polar(1, 9.5 * PI5), 2.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.KITE,
            tilePosition: new TilePosition(polar(1, 5.5 * PI5), 2.5 * PI5)
        });

        this.graph.addNode({
            tileType: TileType.KITE,
            tilePosition: new TilePosition(polar(1, 9.5 * PI5), 6.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.KITE,
            tilePosition: new TilePosition(polar(1, 5.5 * PI5), 8.5 * PI5)
        });
    }

    private setKing() {
        this.graph.addNode({
            tileType: TileType.DART,
            tilePosition: new TilePosition(polar(1, 2.5 * PI5), 7.5 * PI5)
        });

        this.graph.addNode({
            tileType: TileType.DART,
            tilePosition: new TilePosition(polar(1, 0.5 * PI5), 5.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.DART,
            tilePosition: new TilePosition(polar(1, 4.5 * PI5), 9.5 * PI5)
        });

        this.graph.addNode({
            tileType: TileType.KITE,
            tilePosition: new TilePosition(polar(1, 7.5 * PI5), 0.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.KITE,
            tilePosition: new TilePosition(polar(1, 7.5 * PI5), 4.5 * PI5)
        });
    }

    // private addSubEdges(edge: GraphEdge<TileAdjacency>,
    //                     kiteBreakdownMap: Map<number, KiteBreakdown>,
    //                     ) {
    //     const startNode = this.graph.startNode(edge);
    //     const startType = startNode.data.tileType;
    //     const endNode = this.graph.endNode(edge);
    //     const endType = endNode.data.tileType;
    //     if (startType === TileType.KITE && endType === TileType.KITE) {
    //         this.addSubEdgesKK(startNode.data.tilePosition, endNode.data.tilePosition);
    //     }
    //
    //     if (startType === TileType.DART && endType === TileType.KITE) {
    //
    //     }
    //
    //     if (startType === TileType.KITE && endType === TileType.DART) {
    //
    //     }
    //
    //     if (startType === TileType.DART && endType === TileType.DART) {
    //
    //     }
    // }

    // private addSubEdgesKK(position1: TilePosition, position2: TilePosition) {
    //
    // }

    convertTiles(nodes: TileSpec[]): TileSpec[] {
        const wides: TilePosition[] = [];
        const thins: TilePosition[] = [];

        const wideSet = new Set<string>();
        const thinSet = new Set<string>();
        const leftThinSet = new Set<string>();
        const rightThinSet = new Set<string>();
        const bonusLeftWides = new Map<string, TilePosition>();
        const bonusRightWides = new Map<string, TilePosition>();

        for (let node of nodes) {
            const nodePosition = node.tilePosition;
            if (node.tileType !== TileType.DART) continue;
            const newPosition = new TilePosition(
                nodePosition.position.clone().sub(polar((PHI - 1) / 2, nodePosition.rotation)),
                normalizeAngle(nodePosition.rotation + Math.PI, 0)
            );
            wides.push(newPosition);
            wideSet.add(newPosition.stringKey);
        }

        for (let node of nodes) {
            const position = node.tilePosition.position;
            const rotation = node.tilePosition.rotation;
            if (node.tileType !== TileType.KITE) continue;

            const left = new TilePosition(position.clone().add(polar(0.5,
                    rotation + 2 * PI5)),
                normalizeAngle(rotation + 2 * PI5));
            const right = new TilePosition(position.clone().add(polar(0.5,
                    rotation - 2 * PI5)),
                normalizeAngle(rotation - 2 * PI5, 0));
            const leftCheck = new TilePosition(position.clone().add(polar(1, rotation + 2 * PI5))
                    .add(polar((PHI - 1) / 2, rotation - PI5)),
                normalizeAngle(rotation - PI5, 0));
            const rightCheck = new TilePosition(position.clone().add(polar(1, rotation - 2 * PI5))
                    .add(polar((PHI - 1) / 2, rotation + PI5)),
                normalizeAngle(rotation + PI5, 0));

            if (!wideSet.has(leftCheck.stringKey)) {
                if (rightThinSet.has(left.stringKey)) {
                    thins.push(left);
                    thinSet.add(left.stringKey);
                } else {
                    leftThinSet.add(left.stringKey);
                    bonusLeftWides.set(leftCheck.stringKey, leftCheck);
                }
            }

            if (!wideSet.has(rightCheck.stringKey)) {
                if (leftThinSet.has(right.stringKey)) {
                    thins.push(right);
                    thinSet.add(right.stringKey);
                } else {
                    rightThinSet.add(right.stringKey);
                    bonusRightWides.set(rightCheck.stringKey, rightCheck);
                }
            }
        }
        const newNodes: TileSpec[] = [];
        for (let wide of wides) {
            newNodes.push({tileType: TileType.WIDE, tilePosition: wide});
        }

        for (let thin of thins) {
            newNodes.push({tileType: TileType.THIN, tilePosition: thin});
        }
        return newNodes;
    }

    override convert(): Penrose3 {
        const p3 = new Penrose3();

        for (let newNode of this.convertTiles(Array.from(this.graph.nodes).map(n => n.data))) {
            p3.graph.addNode(newNode);
        }
        return p3;
    }

    override decomposeTiles(nodeData: TileSpec[]): TileSpec[] {
        const kites: TilePosition[] = [];

        const dartMap = new Map<string, TilePosition>();

        for (let node of nodeData) {
            const nodePosition = node.tilePosition;
            switch (node.tileType) {
            case TileType.KITE:
                const kb = decomposeKite(nodePosition.position, nodePosition.rotation);
                kites.push(kb.leftKite);
                kites.push(kb.rightKite);
                if (!dartMap.has(kb.leftDart.stringKey)) dartMap.set(kb.leftDart.stringKey, kb.leftDart);
                if (!dartMap.has(kb.rightDart.stringKey)) dartMap.set(kb.rightDart.stringKey, kb.rightDart);
                break;
            case TileType.DART:
                const db = decomposeDart(nodePosition.position, nodePosition.rotation)
                kites.push(db.kite);
                if (!dartMap.has(db.leftDart.stringKey)) dartMap.set(db.leftDart.stringKey, db.leftDart);
                if (!dartMap.has(db.rightDart.stringKey)) dartMap.set(db.rightDart.stringKey, db.rightDart);
            }
        }

        const newData: TileSpec[] = [];
        for (let kite of kites) {
            newData.push({
                    tileType: TileType.KITE,
                    tilePosition: kite,
                }
            );
        }
        for (let dart of dartMap.values()) {
            newData.push({
                    tileType: TileType.DART,
                    tilePosition: dart,
                }
            );
        }
        return newData;
    }
}


function decomposeDart(position: Vector2, rotation: number, rescale: boolean = true): DartBreakdown {
    const scale = rescale ? PHI : 1;
    const p = position.clone().multiplyScalar(scale);
    const kite = new TilePosition(
        p.clone(),
        rotation);
    const leftDart = new TilePosition(
        p.clone().add(polar(1, rotation + 2 * PI5)),
        normalizeAngle(rotation + 4 * PI5, 0)
    );
    const rightDart = new TilePosition(
        p.clone().add(polar(1, rotation - 2 * PI5)),
        normalizeAngle(rotation - 4 * PI5, 0)
    );
    return {
        kite,
        leftDart,
        rightDart,
    };
}

function decomposeKite(position: Vector2, rotation: number, rescale: boolean = true): KiteBreakdown {
    const scale = rescale ? PHI : 1;
    const mid = position.clone().multiplyScalar(scale).add(polar(1, rotation))
    const leftKite = new TilePosition(
        mid.clone(),
        normalizeAngle(rotation + 3 * PI5, 0));
    const rightKite = new TilePosition(
        mid.clone(),
        normalizeAngle(rotation - 3 * PI5, 0));
    const leftDart = new TilePosition(
        mid.clone().add(polar(1, rotation - PI5)),
        normalizeAngle(rotation + PI5, 0)
    );
    const rightDart = new TilePosition(
        mid.clone().add(polar(1, rotation + PI5)),
        normalizeAngle(rotation - PI5, 0)
    );
    return {
        leftKite,
        rightKite,
        leftDart,
        rightDart,
    };
}