import {Component, OnDestroy} from "@angular/core";
import {PolygonPickerComponent, PolygonRestriction} from "../../widgets/polygon-picker.component";
import * as dat from "dat.gui";
import {Vector2} from "three";
import {Line} from "../../../math/geometry/line";
import {LineSegment} from "../../../math/geometry/line-segment";
import {Complex} from "../../../math/complex";
import {reflectOver} from "../unfolding/unfolding.component";
import {PhasePictureComponent} from "./phase-picture.component";
import {CorridorUnfolderComponent} from "./corridor-unfolder.component";

export interface Ray {
    src: Vector2;
    dir: Vector2;
}

export interface Collision {
    point: Vector2;
    sideIndex: number;
    left: Vector2;
    right: Vector2;
}

export interface SubCorridor {
    startPoint: Vector2;
    startTime: number;
    endPoint: Vector2;
    endTime: number;
    leftBound: Vector2;
    rightBound: Vector2;
}

export interface PhaseTile {
    subCorridors: SubCorridor[];
    word: number[];
}

export class Polygon {
    sideLengths: number[] = [];
    vertexTimes: number[] = [0];
    sides: LineSegment[] = [];
    perimeter: number;

    constructor(readonly vertices: Vector2[]) {
        if (vertices.length < 3) throw Error('Bad polygon');
        let perimeter = 0;
        for (let i = 0; i < this.n; i++) {
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.n];
            const d = v1.distanceTo(v2);
            this.sideLengths.push(d);
            this.sides.push(new LineSegment(Complex.fromVector2(v1), Complex.fromVector2(v2)));
            perimeter += d;
        }
        let s = 0;
        for (let i = 0; i < vertices.length - 1; i++) {
            s = s + this.sideLengths[i] / perimeter;
            this.vertexTimes.push(s);
        }
        this.vertexTimes.push(1);
        this.perimeter = perimeter;
    }

    reflect(sideIndex: number) {
        if (sideIndex < 0 || sideIndex >= this.n) throw Error(`Bad side index: ${sideIndex}`);
        const v1 = this.vertices[sideIndex];
        const v2 = this.vertices[(sideIndex + 1) % this.n];
        const newVertices: Vector2[] = [];
        for (let i = 0; i < this.n; i++) {
            newVertices.push(reflectOver(v1, v2, this.vertices[i]));
        }
        return new Polygon(newVertices);
    }

    parametrization(t: number) {
        for (let i = 0; i < this.n; i++) {
            if (this.vertexTimes[i] <= t && this.vertexTimes[i + 1] >= t) {
                const dt = (t - this.vertexTimes[i]) / (this.vertexTimes[i + 1] - this.vertexTimes[i]);
                return this.vertices[i].clone().multiplyScalar(1 - dt)
                    .add(this.vertices[(i + 1) % this.n].clone().multiplyScalar(dt));
            }
        }
        throw Error(`Bad t: ${t}`);
    }

    sideIndex(t: number) {
        for (let i = 0; i < this.n; i++) {
            if (this.vertexTimes[i] <= t && this.vertexTimes[i + 1] >= t) {
                return i;
            }
        }
        throw Error(`Bad t: ${t}`);
    }

    timeOf(v: Vector2): number {
        const z = Complex.fromVector2(v);
        for (let [i, segment] of this.sides.entries()) {
            if (!segment.containsPoint(z)) continue;
            const f = z.distance(segment.start) / this.perimeter;
            return f + this.vertexTimes[i];
        }
        throw Error('Point not on polygon');
    }

    cast(ray: Ray): Collision {
        let bestT = Number.POSITIVE_INFINITY;
        let collision: Collision | undefined = undefined;
        const rayLine = Line.srcDir(Complex.fromVector2(ray.src), Complex.fromVector2(ray.dir));
        for (let i = 0; i < this.n; i++) {
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.n];
            let intersection: Vector2;
            try {
                intersection = rayLine.intersectLine(this.sides[i].line).toVector2();
            } catch (e) {
                continue;
            }
            if (intersection.distanceTo(v1) > this.sideLengths[i]) continue;
            const sideVector = v2.clone().sub(v1);
            if (intersection.clone().sub(v1).dot(sideVector) < 0) continue;
            if (intersection.distanceTo(ray.src) < bestT && intersection.clone().sub(ray.src).dot(ray.dir) > 0) {
                if (intersection.equals(v1) || intersection.equals(v2)) throw Error('Hit a vertex');

                // Otherwise, it is certain that one of v1, v2 is on the left and the other is on the right
                const orientation = ray.dir.clone().rotateAround(new Vector2(), Math.PI / 2).dot(sideVector) > 0;
                collision = {
                    point: intersection,
                    sideIndex: i,
                    left: orientation ? v2.clone() : v1.clone(),
                    right: orientation ? v1.clone() : v2.clone(),
                }
            }
        }
        if (collision === undefined) throw Error('No ray intersection');
        return collision;
    }

    get n() {
        return this.vertices.length;
    }
}

@Component({
    selector: 'corridors',
    templateUrl: './corridors.component.html',
    styleUrls: ['./corridors.component.sass'],
    imports: [PhasePictureComponent, CorridorUnfolderComponent, PolygonPickerComponent],
    standalone: true,
})
export class CorridorsComponent implements OnDestroy {
    Restriction = PolygonRestriction;
    gui: dat.GUI;
    length = 3;
    polygon: Polygon | undefined = undefined;
    state: Vector2 = new Vector2(0.123, 0.789);
    phaseTile: PhaseTile = {subCorridors: [], word: []};

    constructor() {
        this.gui = new dat.GUI();
        this.updateGUI();
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();

        this.gui.add(this, 'length').name('Length')
            .min(1).max(50).step(1);
    }

    onNewVertices(vertices: Vector2[]) {
        this.polygon = new Polygon(vertices);
    }

    onNewPhaseTile(tile: PhaseTile) {
        this.phaseTile = tile;
    }

    frame(): void {
        this.updateGUI();
    }

    ngOnDestroy() {
        this.gui.destroy();
    }
}
