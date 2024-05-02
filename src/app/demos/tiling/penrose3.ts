import {polar, TilePosition} from "./tiling";
import {Vector2} from "three";
import {PenroseTiling, TileSpec, TileType} from "./penrose";
import {Penrose2} from "./penrose2";

type WideBreakdown = {
    centerWide: TilePosition;
    leftWide: TilePosition;
    rightWide: TilePosition;
    leftThin: TilePosition;
    rightThin: TilePosition;
}

type ThinBreakdown = {
    topWide: TilePosition;
    bottomWide: TilePosition;
    topThin: TilePosition;
    bottomThin: TilePosition;
}

export enum VertexStarP3 {
    DEMO = 'Demo',
    SUB = 'Substitution',
    CONVERT = 'P2 Derivation',
    SUN = 'Sun',
    STAR = 'Star',
    WATERFALL = 'Waterfall',
    CUBE = 'Cube',
    GEM = 'Gem',
    BOX = 'Box',
    FOLD = 'Fold',
    FLOWER = 'Flower',
    BAD = 'Bad',
}

const PI5 = Math.PI / 5;
const PHI = Math.sqrt(5) / 2 + 0.5;

const WX = PHI * Math.cos(PI5);
const WY = PHI * Math.sin(PI5);
const TX = PHI * Math.cos(2 * PI5);
const TY = PHI * Math.sin(2 * PI5);

export class Penrose3 extends PenroseTiling {
    constructor(readonly start?: VertexStarP3) {
        super();
        if (!start) return;
        switch (start) {
        case VertexStarP3.DEMO:
            this.setDemo();
            break;
        case VertexStarP3.SUB:
            this.setSub();
            break;
        case VertexStarP3.CONVERT:
            this.setConvert();
            break;
        case VertexStarP3.SUN:
            this.setSun();
            break;
        case VertexStarP3.STAR:
            this.setStar();
            break;
        case VertexStarP3.WATERFALL:
            this.setWaterfall();
            break;
        case VertexStarP3.CUBE:
            this.setCube();
            break;
        case VertexStarP3.GEM:
            this.setGem();
            break;
        case VertexStarP3.BOX:
            this.setBox();
            break;
        case VertexStarP3.FOLD:
            this.setFold();
            break;
        case VertexStarP3.FLOWER:
            this.setFlower();
            break;
        case VertexStarP3.BAD:
            this.setBad();
            break;
        }
    }

    private setDemo() {
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(new Vector2(1, 0), 0),
        });
        this.graph.addNode({
            tileType: TileType.THIN,
            tilePosition: new TilePosition(new Vector2(-1, 0), 0),
        });
    }

    private setSub() {
        // this.graph.addNode({
        //     tileType: TileType.WIDE,
        //     tilePosition: new TilePosition(new Vector2(2, 1), 0),
        // });
        // this.graph.addNode({
        //     tileType: TileType.THIN,
        //     tilePosition: new TilePosition(new Vector2(-2, 1), 0),
        // });

        this.addSubDemo([{
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(new Vector2(0, 0), -Math.PI / 2),
        }], new Vector2(2.5, 1 + PHI), new Vector2(2.5, -2));

        this.addSubDemo([{
            tileType: TileType.THIN,
            tilePosition: new TilePosition(new Vector2(0, 0), Math.PI / 2),
        }], new Vector2(-2.5, PHI), new Vector2(-2.5, -PHI));

        // const wb = decomposeWide(new Vector2(2, -2), 0);
        // const tb = decomposeThin(new Vector2(-2, -2), 0);
        //
        // this.graph.addNode({tileType: TileType.WIDE, tilePosition: wb.centerWide});
        // this.graph.addNode({tileType: TileType.WIDE, tilePosition: wb.leftWide});
        // this.graph.addNode({tileType: TileType.WIDE, tilePosition: wb.rightWide});
        // this.graph.addNode({tileType: TileType.THIN, tilePosition: wb.leftThin});
        // this.graph.addNode({tileType: TileType.THIN, tilePosition: wb.rightThin});
        //
        // this.graph.addNode({tileType: TileType.WIDE, tilePosition: tb.topWide});
        // this.graph.addNode({tileType: TileType.WIDE, tilePosition: tb.bottomWide});
        // this.graph.addNode({tileType: TileType.THIN, tilePosition: tb.topThin});
        // this.graph.addNode({tileType: TileType.THIN, tilePosition: tb.bottomThin});
    }


    private setConvert(): void {
        this.addConvertDemo([{
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(new Vector2(0, 0), 0),
        }], new Vector2(2, PHI), new Vector2(2, -PHI));

        this.addConvertDemo([{
            tileType: TileType.THIN,
            tilePosition: new TilePosition(new Vector2(0, 0), Math.PI / 2),
        }], new Vector2(-2, PHI), new Vector2(-2, -PHI));
    }

    private setSun() {
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(PHI * Math.cos(PI5), 0 * PI5), 5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(PHI * Math.cos(PI5), 2 * PI5), 7 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(PHI * Math.cos(PI5), 4 * PI5), 9 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(PHI * Math.cos(PI5), 6 * PI5), 1 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(PHI * Math.cos(PI5), 8 * PI5), 3 * PI5)
        });
        // for (let i = 0; i < 5; i++) {
        //     this.graph.addEdge(i + 1, (i + 1) % 5 + 1, {edgeType: EdgeType.SHORT, direction: 0});
        // }
    }

    private setStar() {
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(PHI * Math.cos(PI5), 0 * PI5), 0 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(PHI * Math.cos(PI5), 2 * PI5), 2 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(PHI * Math.cos(PI5), 4 * PI5), 4 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(PHI * Math.cos(PI5), 6 * PI5), 6 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(PHI * Math.cos(PI5), 8 * PI5), 8 * PI5)
        });
    }

    private setWaterfall() {
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WX, 9.5 * PI5), 4.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WX, 1.5 * PI5), 6.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WX, 3.5 * PI5), 8.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WX, 5.5 * PI5), 0.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.THIN,
            tilePosition: new TilePosition(polar(TY, 7 * PI5), -0.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.THIN,
            tilePosition: new TilePosition(polar(TY, 8 * PI5), 5.5 * PI5)
        });
    }

    private setCube() {
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WY, 6 * PI5), 3.5 * PI5),
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WY, 9 * PI5), 1.5 * PI5),
        });
        this.graph.addNode({
            tileType: TileType.THIN,
            tilePosition: new TilePosition(new Vector2(0, TX), Math.PI / 2),
        });
    }

    private setGem() {
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WX, Math.PI / 2), Math.PI / 2),
        });
        this.graph.addNode({
            tileType: TileType.THIN,
            tilePosition: new TilePosition(polar(TX, 9.5 * PI5), 4.5 * PI5),
        });
        this.graph.addNode({
            tileType: TileType.THIN,
            tilePosition: new TilePosition(polar(TX, 5.5 * PI5), 0.5 * PI5),
        });
    }

    private setBox() {
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WY, 6 * PI5), 8.5 * PI5),
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WY, 9 * PI5), 6.5 * PI5),
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WX, Math.PI / 2), -Math.PI / 2),
        });
        this.graph.addNode({
            tileType: TileType.THIN,
            tilePosition: new TilePosition(polar(TY, PI5), -1.5 * PI5),
        });
        this.graph.addNode({
            tileType: TileType.THIN,
            tilePosition: new TilePosition(polar(TY, 4 * PI5), -3.5 * PI5),
        });
    }

    private setFold() {
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WX, 0.5 * PI5), 0.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WX, 2.5 * PI5), 2.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WX, 4.5 * PI5), 4.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.THIN,
            tilePosition: new TilePosition(polar(TX, 7.5 * PI5), 2.5 * PI5)
        });
    }

    private setFlower() {
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WX, 1.5 * PI5), 6.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WX, 3.5 * PI5), 8.5 * PI5)
        });

        this.graph.addNode({
            tileType: TileType.WIDE,
            tilePosition: new TilePosition(polar(WX, 7.5 * PI5), 2.5 * PI5)
        });

        this.graph.addNode({
            tileType: TileType.THIN,
            tilePosition: new TilePosition(polar(TY, 5 * PI5), -2.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.THIN,
            tilePosition: new TilePosition(polar(TY, 6 * PI5), 3.5 * PI5)
        });

        this.graph.addNode({
            tileType: TileType.THIN,
            tilePosition: new TilePosition(polar(TY, 9 * PI5), 1.5 * PI5)
        });
        this.graph.addNode({
            tileType: TileType.THIN,
            tilePosition: new TilePosition(polar(TY, 0 * PI5), 7.5 * PI5)
        });
    }

    private setBad() {
        for (let i = 0; i < 5; i++) {
            this.graph.addNode({
                tileType: TileType.THIN,
                tilePosition: new TilePosition(polar(TY, 2 * i * PI5), (2.5 + 2 * i) * PI5)
            });
            this.graph.addNode({
                tileType: TileType.THIN,
                tilePosition: new TilePosition(polar(TY, (2 * i + 1) * PI5), (-2.5 + 2 * i + 1) * PI5)
            });
        }
    }

    override decomposeTiles(nodeData: TileSpec[]): TileSpec[] {
        const wideMap = new Map<string, TilePosition>();
        const thinMap = new Map<string, TilePosition>();

        for (let node of nodeData) {
            const nodePosition = node.tilePosition;
            switch (node.tileType) {
            case TileType.WIDE:
                const wb = decomposeWide(nodePosition.position, nodePosition.rotation);
                if (!wideMap.has(wb.centerWide.stringKey)) wideMap.set(wb.centerWide.stringKey, wb.centerWide);
                if (!wideMap.has(wb.leftWide.stringKey)) wideMap.set(wb.leftWide.stringKey, wb.leftWide);
                if (!wideMap.has(wb.rightWide.stringKey)) wideMap.set(wb.rightWide.stringKey, wb.rightWide);
                if (!thinMap.has(wb.leftThin.stringKey)) thinMap.set(wb.leftThin.stringKey, wb.leftThin);
                if (!thinMap.has(wb.rightThin.stringKey)) thinMap.set(wb.rightThin.stringKey, wb.rightThin);
                break;
            case TileType.THIN:
                const tb = decomposeThin(nodePosition.position, nodePosition.rotation);
                if (!wideMap.has(tb.topWide.stringKey)) wideMap.set(tb.topWide.stringKey, tb.topWide);
                if (!wideMap.has(tb.bottomWide.stringKey)) wideMap.set(tb.bottomWide.stringKey, tb.bottomWide);
                if (!thinMap.has(tb.topThin.stringKey)) thinMap.set(tb.topThin.stringKey, tb.topThin);
                if (!thinMap.has(tb.bottomThin.stringKey)) thinMap.set(tb.bottomThin.stringKey, tb.bottomThin);
            }
        }

        const newData: TileSpec[] = [];
        for (let wide of wideMap.values()) {
            newData.push({
                    tileType: TileType.WIDE,
                    tilePosition: wide,
                }
            );
        }
        for (let thin of thinMap.values()) {
            newData.push({
                tileType: TileType.THIN,
                tilePosition: thin,
            });
        }
        return newData;
    }

    override convertTiles(nodeData: TileSpec[]): TileSpec[] {
        const darts: TilePosition[] = [];
        const kiteMap = new Map<string, TilePosition>();

        for (let node of nodeData) {
            const position = node.tilePosition.position;
            const rotation = node.tilePosition.rotation;
            switch (node.tileType) {
            case TileType.WIDE:
                // make a dart
                darts.push(new TilePosition(
                    position.clone().sub(polar((PHI - 1) / 2, rotation)),
                    rotation + Math.PI,
                ));
                const leftKite = new TilePosition(position.clone()
                        .add(polar(PHI * Math.sin(PI5), rotation + Math.PI / 2)),
                    rotation - PI5);
                const rightKite = new TilePosition(position.clone()
                        .add(polar(PHI * Math.sin(PI5), rotation - Math.PI / 2)),
                    rotation + PI5);
                if (!kiteMap.has(leftKite.stringKey)) kiteMap.set(leftKite.stringKey, leftKite);
                if (!kiteMap.has(rightKite.stringKey)) kiteMap.set(rightKite.stringKey, rightKite);
                break;
            case TileType.THIN:
                // make two darts, with checks, around the red (negative x) point
                const point = position.clone().sub(polar(PHI * Math.cos(2 * PI5), rotation));
                const left = new TilePosition(point, rotation + 2 * PI5);
                const right = new TilePosition(point, rotation - 2 * PI5);
                if (!kiteMap.has(left.stringKey)) kiteMap.set(left.stringKey, left);
                if (!kiteMap.has(right.stringKey)) kiteMap.set(right.stringKey, right);
            }
        }

        const newNodes: TileSpec[] = [];

        for (let dart of darts) {
            newNodes.push({tileType: TileType.DART, tilePosition: dart});
        }

        for (let kite of kiteMap.values()) {
            newNodes.push({tileType: TileType.KITE, tilePosition: kite});
        }

        return newNodes;
    }

    override convert(): Penrose2 {
        const p2 = new Penrose2();

        for (let newNode of this.convertTiles(Array.from(this.graph.nodes).map(n => n.data))) {
            p2.graph.addNode(newNode);
        }

        return p2;
    }
}

function decomposeWide(position: Vector2, rotation: number): WideBreakdown {
    const cc = position.clone().multiplyScalar(PHI)
        .add(polar(WX * PHI - PHI * PHI * 0.5, rotation));
    const v = position.clone().multiplyScalar(PHI)
        .add(polar(PHI * PHI - WX * PHI, rotation + Math.PI));
    const lwc = v.clone()
        .add(polar(WY, rotation + PI5 * 3.5));
    const rwc = v.clone()
        .add(polar(WY, rotation - PI5 * 3.5));
    const ltc = v.clone()
        .add(polar(TY, rotation + PI5 * 1.5));
    const rtc = v.clone()
        .add(polar(TY, rotation - PI5 * 1.5));

    const centerWide = new TilePosition(cc, rotation + Math.PI);
    const leftWide = new TilePosition(lwc, rotation - 4 * PI5);
    const rightWide = new TilePosition(rwc, rotation + 4 * PI5);
    const leftThin = new TilePosition(ltc, rotation + 4 * PI5);
    const rightThin = new TilePosition(rtc, rotation - 4 * PI5);
    return {centerWide, leftWide, rightWide, leftThin, rightThin};
}

function decomposeThin(position: Vector2, rotation: number): ThinBreakdown {
    const v = position.clone().add(polar(TX, rotation)).multiplyScalar(PHI);
    const topWide = new TilePosition(
        v.clone().add(polar(WX, rotation + 3 * PI5)),
        rotation - 2 * PI5);
    const bottomWide = new TilePosition(
        v.clone().add(polar(WX, rotation - 3 * PI5)),
        rotation + 2 * PI5);
    const topThin = new TilePosition(
        v.clone().add(polar(TY, rotation + 4.5 * PI5)),
        rotation - 3 * PI5);
    const bottomThin = new TilePosition(
        v.clone().add(polar(TY, rotation - 4.5 * PI5)),
        rotation + 3 * PI5);
    return {topWide, bottomWide, topThin, bottomThin};
}