import {Color, Shape, Vector2} from "three";
import {normalizeAngle} from "../../../math/math-helpers";

export class Polygon {
    constructor(readonly vertices: Vector2[]) {
        if (vertices.length < 3) throw Error('Need at least three vertices for a polygon');
    }

    static regular(n: number, sidelength: number): Polygon {
        if (n < 3) throw Error('Too few vertices');
        const offset = Math.PI / n - Math.PI / 2;
        const int = (n - 2) * Math.PI / n;
        const r = sidelength / (2 * Math.cos(int / 2));
        const dtheta = 2 * Math.PI / n;
        const vertices: Vector2[] = [];
        for (let i = 0; i < n; i++) {
            const theta = i * dtheta + offset;
            vertices.push(new Vector2(
                r * Math.cos(theta),
                r * Math.sin(theta)
            ));
        }
        return new Polygon(vertices);
    }

    containsPoint(pt: Vector2): boolean {
        let w = 0;
        for (let i = 0; i < this.vertices.length; i++) {
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.vertices.length];
            const h1 = v1.clone().sub(pt).angle();
            const h2 = v2.clone().sub(pt).angle();
            w += normalizeAngle(h2 - h1)
        }
        return Math.abs(w - 2 * Math.PI) < 0.1;
    }
}

export enum UniformTilingType {
    U6434 = '6.4.3.4',
    U8484 = '8.4.8.4',
    U3636 = '3.6.3.6',
}

export enum AnnotationType {
    BORDERS,
    MATCHING,
    SUBDIVISION,
    DUAL,
    ROBINSON,
}

export class TileAnnotation {
    constructor(readonly shape: Shape, readonly color: Color, readonly type: AnnotationType) {
    }
}

export class Tile {
    constructor(readonly polygon: Polygon,
                readonly color: Color,
                readonly annotations: TileAnnotation[] = []) {
        const thickness = 0.02;
        const borderColor = new Color(0x000000);
        for (let i = 0; i < polygon.vertices.length; i++) {
            this.annotations.push(diskAnnotation(polygon.vertices[i], thickness / 2, borderColor, AnnotationType.BORDERS));
            this.annotations.push(
                lineAnnotation(
                    polygon.vertices[i],
                    polygon.vertices[(i + 1) % polygon.vertices.length],
                    thickness,
                    borderColor,
                    AnnotationType.BORDERS,
                )
            );
        }
    }
}

export class TilePosition {
    readonly rotation: number;

    constructor(readonly position: Vector2, rotation: number) {
        this.rotation = normalizeAngle(rotation);
    }

    get stringKey(): string {
        const xThou = (Math.round(this.position.x * 1000) / 1000).toString();
        const yThou = (Math.round(this.position.y * 1000) / 1000).toString();
        const rThou = (Math.round(this.rotation * 1000) / 1000).toString()
        return `${xThou},${yThou},${rThou}`;
    }
}

export class Tiling {
    constructor(readonly tiles: Tile[],
                readonly positions: TilePosition[][]) {
        const t = tiles.length;
        if (t < 1) throw Error('Must have at least one tile.ts');
        if (positions.length !== t) throw Error('Must have positions for all tiles');
    }

    static lattice(bound: number,
                   e1: Vector2, e2: Vector2,
                   rotation: number = 0,
                   offset: Vector2 = new Vector2()): TilePosition[] {
        const positions: TilePosition[] = [];
        for (let i = -bound; i < bound + 1; i++) {
            for (let j = -bound; j < bound + 1; j++) {
                const v = offset.clone().addScaledVector(e1, i).addScaledVector(e2, j);
                positions.push(new TilePosition(v, rotation));
            }
        }
        return positions;
    }

    static regular(n: number, bound: number = 10) {
        let positions: TilePosition[];
        let e1, e2;
        switch (n) {
        case 3:
            e1 = polar(1, 0);
            e2 = polar(1, Math.PI / 3);
            const offset = e1.clone().add(e2.clone()).multiplyScalar(1 / 3);
            positions = this.lattice(bound, e1, e2).concat(this.lattice(bound, e1, e2, Math.PI, offset));
            break;
        case 4:
            e1 = new Vector2(1, 0);
            e2 = new Vector2(0, 1);
            positions = this.lattice(bound, e1, e2);
            break;
        case 6:
            const r = Math.sqrt(3);
            e1 = polar(r, Math.PI / 2);
            e2 = polar(r, Math.PI / 6);
            positions = this.lattice(bound, e1, e2);
            break;
        default:
            throw Error(`Cannot make regular (affine) tiling with ${n} vertices.`);
        }
        return new Tiling([regularTile(n)], [positions]);
    }

    static uniform(type: UniformTilingType, bound: number = 20) {
        let tiles = [];
        let positions: TilePosition[][] = [];
        const triangle = regularTile(3);
        const square = regularTile(4);
        const hexagon = regularTile(6);
        const octagon = regularTile(8);
        switch (type) {
        case UniformTilingType.U6434:
            tiles.push(triangle, square, hexagon);
            const l = Math.sqrt(3) + 1;
            positions.push(this.lattice(bound, polar(l, Math.PI / 2), polar(l, Math.PI / 6), Math.PI / 2, polar(1 + 1 / Math.sqrt(3), 0)));
            positions[0].push(...this.lattice(bound, polar(l, Math.PI / 2), polar(l, Math.PI / 6), -Math.PI / 2, polar(1 + 1 / Math.sqrt(3), Math.PI)));
            positions.push(this.lattice(bound, polar(l, Math.PI / 2), polar(l, Math.PI / 6), Math.PI / 2, polar(0.5 + Math.sqrt(3) / 2, Math.PI / 2)));
            positions[1].push(...this.lattice(bound, polar(l, Math.PI / 2 + Math.PI / 3), polar(l, Math.PI / 6 + Math.PI / 3), Math.PI / 2 + Math.PI / 3, polar(0.5 + Math.sqrt(3) / 2, Math.PI / 2 + Math.PI / 3)));
            positions[1].push(...this.lattice(bound, polar(l, Math.PI / 2 - Math.PI / 3), polar(l, Math.PI / 6 - Math.PI / 3), Math.PI / 2 - Math.PI / 3, polar(0.5 + Math.sqrt(3) / 2, Math.PI / 2 - Math.PI / 3)));
            positions.push(this.lattice(bound, polar(l, Math.PI / 2), polar(l, Math.PI / 6)));
            break;
        case UniformTilingType.U8484:
            tiles.push(square, octagon);
            const ost = 1 + Math.sqrt(2);
            positions.push(this.lattice(bound, polar(ost, Math.PI / 4), polar(ost, 3 * Math.PI / 4)));
            positions.push(this.lattice(bound, polar(ost, Math.PI / 4), polar(ost, 3 * Math.PI / 4), 0,
                new Vector2(0, ost / 2 + 0.5)));
            break;
        case UniformTilingType.U3636:
            tiles.push(triangle, hexagon);
            positions.push([])
            positions[0].push(...this.lattice(bound, polar(2, Math.PI / 3), polar(2, 0), Math.PI,
                polar(0.5 * Math.sqrt(3) + 0.5 / Math.sqrt(3), Math.PI / 6)));
            positions[0].push(...this.lattice(bound, polar(2, Math.PI / 3), polar(2, 0), 0,
                polar(0.5 * Math.sqrt(3) + 0.5 / Math.sqrt(3), -Math.PI / 6)));
            positions.push(this.lattice(bound, polar(2, Math.PI / 3), polar(2, 0)));
            break;
        }
        return new Tiling(tiles, positions);
    }

    static penrose2(): Tiling {
        const p5 = Math.PI / 5;

        const kiteColor = new Color(0x89B0AE);
        const dartColor = new Color(0xFCBF49);
        const phi = (Math.sqrt(5) + 1) / 2;
        const x = phi * phi / 2 - 1;
        const y = Math.sin(p5) * phi;
        const dart = new Polygon([
            new Vector2(),
            new Vector2(-x, -y),
            new Vector2(1, 0),
            new Vector2(-x, y),
            new Vector2(),
        ]);
        const kite = new Polygon([
            new Vector2(0, 0),
            new Vector2(x, -y),
            new Vector2(phi, 0),
            new Vector2(x, y),
            new Vector2(0, 0),
        ]);

        const annotationThickness = 0.01;
        const red = new Color(0xff0000);
        const green = new Color(0x00ff00);
        const blue = new Color(0x0000ff);

        const kiteAnnotations: TileAnnotation[] = [];
        kiteAnnotations.push(ringAnnotation(new Vector2(phi, 0), 1, annotationThickness, 4 * p5, 6 * p5, green, AnnotationType.MATCHING));
        kiteAnnotations.push(ringAnnotation(new Vector2(), phi - 1, annotationThickness, 8 * p5, 2 * p5, red, AnnotationType.MATCHING));
        kiteAnnotations.push(lineAnnotation(new Vector2(), new Vector2(phi, 0), annotationThickness, blue, AnnotationType.SUBDIVISION));

        const dartAnnotations: TileAnnotation[] = [];
        dartAnnotations.push(ringAnnotation(new Vector2(1, 0), phi - 1, annotationThickness, 4 * p5, 6 * p5, green, AnnotationType.MATCHING));
        dartAnnotations.push(ringAnnotation(new Vector2(), 2 - phi, annotationThickness, 7 * p5, 3 * p5, red, AnnotationType.MATCHING));
        dartAnnotations.push(lineAnnotation(new Vector2(), new Vector2(1, 0), annotationThickness, blue, AnnotationType.SUBDIVISION));

        const dartTile = new Tile(dart, dartColor, dartAnnotations);
        const kiteTile = new Tile(kite, kiteColor, kiteAnnotations);

        const kitePositions: TilePosition[] = [
            new TilePosition(polar(phi, 0 * p5), 2 * p5),
            new TilePosition(polar(phi, 2 * p5), 0 * p5),
            new TilePosition(polar(phi, 2 * p5), 4 * p5),
            new TilePosition(polar(phi, 4 * p5), 2 * p5),
            new TilePosition(polar(phi, 4 * p5), 6 * p5),
            new TilePosition(polar(phi, 6 * p5), 4 * p5),
            new TilePosition(polar(phi, 6 * p5), 8 * p5),
            new TilePosition(polar(phi, 8 * p5), 6 * p5),
            new TilePosition(polar(phi, 8 * p5), 0 * p5),
            new TilePosition(polar(phi, 0 * p5), 8 * p5),
        ];
        const dartPositions: TilePosition[] = [
            new TilePosition(polar(1, 1 * p5), 6 * p5),
            new TilePosition(polar(1, 3 * p5), 8 * p5),
            new TilePosition(polar(1, 5 * p5), 0 * p5),
            new TilePosition(polar(1, 7 * p5), 2 * p5),
            new TilePosition(polar(1, 9 * p5), 4 * p5),
        ];

        return new Tiling(
            [kiteTile, dartTile],
            [kitePositions, dartPositions]);
    }

    static penrose3(): Tiling {
        const p5 = Math.PI / 5;
        const phi = (Math.sqrt(5) + 1) / 2;

        const rhomb1Color = new Color(0xFCBF49);
        const rhomb2Color = new Color(0x89B0AE);

        // tiles
        const sidelength = phi;
        const rhomb1X = sidelength * Math.cos(p5);
        const rhomb1Y = sidelength * Math.sin(p5);
        const rhomb1 = new Polygon([
            new Vector2(rhomb1X, 0),
            new Vector2(0, rhomb1Y),
            new Vector2(-rhomb1X, 0),
            new Vector2(0, -rhomb1Y)
        ]);
        const rhomb2X = sidelength * Math.cos(2 * p5);
        const rhomb2Y = sidelength * Math.sin(2 * p5);
        const rhomb2 = new Polygon([
            new Vector2(rhomb2X, 0),
            new Vector2(0, rhomb2Y),
            new Vector2(-rhomb2X, 0),
            new Vector2(0, -rhomb2Y)
        ]);

        // annotations
        const annotationThickness = 0.01;
        const red = new Color(0xff0000);
        const green = new Color(0x00ff00);
        const blue = new Color(0x0000ff);

        const b = (phi + 1) / 2;
        const l = phi - b; // phi / 2 - 0.5

        const annotations1: TileAnnotation[] = [];
        annotations1.push(ringAnnotation(new Vector2(rhomb1X, 0), b, annotationThickness, 4 * p5, 6 * p5, red, AnnotationType.MATCHING));
        annotations1.push(ringAnnotation(new Vector2(-rhomb1X, 0), l, annotationThickness, 8 * p5, 2 * p5, green, AnnotationType.MATCHING));
        annotations1.push(lineAnnotation(new Vector2(-rhomb1X, 0), new Vector2(rhomb1X, 0), annotationThickness, blue, AnnotationType.SUBDIVISION));

        const annotations2: TileAnnotation[] = [];
        annotations2.push(ringAnnotation(new Vector2(-rhomb2X, 0), l, annotationThickness, 8 * p5, 2 * p5, red, AnnotationType.MATCHING));
        annotations2.push(ringAnnotation(new Vector2(rhomb2X, 0), l, annotationThickness, 3 * p5, 7 * p5, green, AnnotationType.MATCHING));
        annotations2.push(lineAnnotation(new Vector2(-rhomb2X, 0), new Vector2(rhomb2X, 0), annotationThickness, blue, AnnotationType.SUBDIVISION));


        const rhomb1Tile = new Tile(rhomb1, rhomb1Color, annotations1);
        const rhomb2Tile = new Tile(rhomb2, rhomb2Color, annotations2);

        // positions
        const positions1 = [
            new TilePosition(polar(rhomb1X, 1 * p5), 1 * p5),
            new TilePosition(polar(rhomb1X, 3 * p5), 3 * p5),
            new TilePosition(polar(rhomb1X, 5 * p5), 5 * p5),
            new TilePosition(polar(rhomb1X, 7 * p5), 7 * p5),
            new TilePosition(polar(rhomb1X, 9 * p5), 9 * p5),
        ];

        const r2 = sidelength + rhomb2X;
        const positions2 = [
            new TilePosition(polar(r2, 0 * p5), 0 * p5),
            new TilePosition(polar(r2, 2 * p5), 2 * p5),
            new TilePosition(polar(r2, 4 * p5), 4 * p5),
            new TilePosition(polar(r2, 6 * p5), 6 * p5),
            new TilePosition(polar(r2, 8 * p5), 8 * p5),
        ];


        return new Tiling([rhomb1Tile, rhomb2Tile], [positions1, positions2]);
    }
}

export function polar(r: number, theta: number): Vector2 {
    return new Vector2(
        r * Math.cos(theta),
        r * Math.sin(theta));
}

export function ringAnnotation(center: Vector2,
                               radius: number,
                               thickness: number,
                               start: number,
                               end: number,
                               color: Color,
                               type: AnnotationType): TileAnnotation {
    const shape = new Shape();
    shape.absarc(center.x, center.y, radius + thickness / 2, start, end, false);
    shape.absarc(center.x, center.y, radius - thickness / 2, end, start, true);
    return new TileAnnotation(shape, color, type);
}

export function lineAnnotation(p1: Vector2, p2: Vector2, thickness: number, color: Color, type: AnnotationType) {
    const shape = new Shape();
    const diff = p2.clone().sub(p1).normalize().multiplyScalar(thickness / 2).rotateAround(new Vector2(), -Math.PI / 2);
    shape.moveTo(p1.x + diff.x, p1.y + diff.y);
    shape.lineTo(p2.x + diff.x, p2.y + diff.y);
    shape.lineTo(p2.x - diff.x, p2.y - diff.y);
    shape.lineTo(p1.x - diff.x, p1.y - diff.y);
    shape.closePath();
    return new TileAnnotation(shape, color, type);
}

export function diskAnnotation(center: Vector2, radius: number, color: Color, type: AnnotationType) {
    const shape = new Shape();
    shape.absarc(center.x, center.y, radius, 0, Math.PI * 2, false);
    return new TileAnnotation(shape, color, type);
}

export function regularTile(n: number): Tile {
    const polygon = Polygon.regular(n, 1);
    const annotations: TileAnnotation[] = [];
    for (let i = 0; i < n; i++) {
        const v1 = polygon.vertices[i];
        const v2 = polygon.vertices[(i + 1) % n];
        annotations.push(
            lineAnnotation(new Vector2(), v1.clone().add(v2).multiplyScalar(0.5),
                0.01, new Color(0xFFFFFF), AnnotationType.DUAL)
        );
    }
    return new Tile(polygon, colorForNGon(n), annotations);
}

export function colorForNGon(n: number): Color {
    switch (n) {
    case 3:
        return new Color(0xF77F00);
    case 4:
        return new Color(0x6E0D25);
    case 6:
        return new Color(0x255F85);
    case 8:
        return new Color(0x548687);
    case 12:
        return new Color(0x008040);
    }
    return new Color(0xFFFFFF);
}
