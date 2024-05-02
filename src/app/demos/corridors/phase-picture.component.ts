import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {
    BoxGeometry,
    BufferGeometry,
    CircleGeometry,
    Color,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    Shape,
    ShapeGeometry,
    Vector2
} from "three";
import {PhaseTile, Polygon} from "./corridors.component";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {clamp} from "three/src/math/MathUtils";
import {LineSegment} from "../../../math/geometry/line-segment";
import {Complex} from "../../../math/complex";
import {Line} from "../../../math/geometry/line";
import {closeEnough} from "../../../math/math-helpers";
import {CommonModule} from "@angular/common";

const CLEAR_COLOR = new Color(0x123456);

@Component({
    selector: 'phase-picture',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class PhasePictureComponent extends ThreeDemoComponent implements OnChanges {
    @Input() polygon: Polygon | undefined = undefined;
    // @Input() length: number | undefined;
    @Input() state = new Vector2(0.123, 0.789);
    @Input() phaseTile: PhaseTile = {subCorridors: [], word: []};
    @Output() stateChange = new EventEmitter<Vector2>();
    dirty = false;

    orbitControls: OrbitControls;

    constructor() {
        super();
        this.useOrthographic = true;
        this.renderer.setClearColor(CLEAR_COLOR);
        this.orbitControls = new OrbitControls(this.orthographicCamera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;

        this.renderer.domElement.onmousedown = this.selectPhase.bind(this);
        this.renderer.domElement.onmousemove = this.selectPhase.bind(this);
    }

    selectPhase(event: MouseEvent) {
        if (!(event.buttons & 1)) return;
        const bb = this.renderer.domElement.getBoundingClientRect();

        const cpx = event.clientX - bb.x;
        const cpy = event.clientY - bb.y;
        const zox = cpx / this.renderer.domElement.clientWidth;
        const zoy = 1 - cpy / this.renderer.domElement.clientHeight;

        const cx = this.orthographicCamera.left * (1 - zox) + this.orthographicCamera.right * zox;
        const cy = this.orthographicCamera.bottom * (1 - zoy) + this.orthographicCamera.top * zoy;

        let wx = cx / this.orthographicCamera.zoom + this.orthographicCamera.position.x;
        let wy = cy / this.orthographicCamera.zoom + this.orthographicCamera.position.y;

        wx = Math.min(Math.max(wx, -0.5), 0.5);
        wy = Math.min(Math.max(wy, -0.5), 0.5);

        const rayStart = clamp(wx + 0.5, 0, 1);
        const rayEnd = clamp(wy + 0.5, 0, 1);
        this.updateState(rayStart, rayEnd)
    }

    updateState(rayStart: number, rayEnd: number) {
        if (rayStart >= 0 && rayStart <= 1 && rayEnd >= 0 && rayEnd <= rayEnd) {
            this.state = new Vector2(rayStart, rayEnd);
            this.stateChange.emit(this.state);
            this.dirty = true;
        }
    }

    processKeyboardInput(dt: number) {
        const diff = new Vector2();
        if (this.keysPressed.get('ArrowLeft')) diff.x -= dt * 0.1;
        if (this.keysPressed.get('ArrowRight')) diff.x += dt * 0.1;
        if (this.keysPressed.get('ArrowUp')) diff.y += dt * 0.1;
        if (this.keysPressed.get('ArrowDown')) diff.y -= dt * 0.1;
        if (diff.length() === 0) return;
        let slowdown = 1;
        if (this.keysPressed.get('ShiftLeft')) slowdown *= 0.1;
        if (this.keysPressed.get('AltLeft')) slowdown *= 0.01;
        let x = this.state.x + slowdown * diff.x;
        while (x <= 0) x++;
        while (x > 1) x--;
        let y = this.state.y + slowdown * diff.y;
        while (y <= 0) y++;
        while (y > 1) y--;
        this.updateState(x, y);
    }

    frame(dt: number): void {
        this.processKeyboardInput(dt);
        if (!this.dirty || this.polygon === undefined) return;
        this.dirty = false;
        this.scene.clear();
        const points = [];
        const boxMat = new MeshBasicMaterial({color: 0x000000});
        for (let i = 0; i <= this.polygon.n; i++) {
            points.push(new Vector2(this.polygon.vertexTimes[i], 0), new Vector2(this.polygon.vertexTimes[i], 1));
            points.push(new Vector2(0, this.polygon.vertexTimes[i]), new Vector2(1, this.polygon.vertexTimes[i]));
        }

        for (let i = 0; i < this.polygon.n; i++) {
            const t1 = this.polygon.vertexTimes[i];
            const t2 = this.polygon.vertexTimes[i + 1];
            const box = new Mesh(new BoxGeometry(t2 - t1, t2 - t1), boxMat);
            const o = (t2 + t1) / 2 - 0.5;
            box.translateX(o);
            box.translateY(o);
            box.translateZ(-2);
            this.scene.add(box);
        }

        const gridMaterial = new LineBasicMaterial({color: 0xffffff});
        const gridGeometry = new BufferGeometry().setFromPoints(points);
        const ls = new LineSegments(gridGeometry, gridMaterial);
        ls.translateX(-0.5);
        ls.translateY(-0.5);
        this.scene.add(ls);

        const tile = this.generatePhaseTile();
        if (tile) this.scene.add(tile);

        const disk = new Mesh(new CircleGeometry(0.01, 16), new MeshBasicMaterial({color: 0xffff00}));
        disk.position.x = this.state.x - 0.5;
        disk.position.y = this.state.y - 0.5;
        this.scene.add(disk);
    }

    phaseTileColor() {
        if (this.polygon === undefined || this.phaseTile.word.length === 0) return;
        const n = this.polygon.n || Math.max(...this.phaseTile.word);

        return 0x990033;
    }

    generatePhaseTile() {
        if (this.polygon === undefined ||
            this.phaseTile.word.length === 0 ||
            this.phaseTile.subCorridors.length === 0) {
            console.log('not generating');
            return;
        }
        console.log(this.phaseTile);

        const color = this.phaseTileColor();
        let minIn = Math.min(...this.phaseTile.subCorridors.map(sc => sc.startTime));
        let maxIn = Math.max(...this.phaseTile.subCorridors.map(sc => sc.endTime));
        if (closeEnough(minIn, 1)) maxIn = 0;
        if (closeEnough(maxIn, 0)) maxIn = 1;
        const dt = maxIn - minIn;
        const steps = Math.ceil(dt * 100);
        console.log(steps);
        const step = dt / steps;
        const los: Vector2[] = [];
        const his: Vector2[] = [];
        const side2 = new LineSegment(
            Complex.fromVector2(this.polygon.vertices[this.phaseTile.word[1]]),
            Complex.fromVector2(this.polygon.vertices[(this.phaseTile.word[1] + 1) % this.polygon.n]),
        );
        for (let t = minIn; t <= maxIn + step / 2; t += step) {
            let lo = Number.POSITIVE_INFINITY;
            let hi = Number.NEGATIVE_INFINITY;
            for (let sc of this.phaseTile.subCorridors) {
                if (t <= sc.startTime || t >= sc.endTime) continue;
                const p = this.polygon.parametrization(t);
                let intersection = side2.intersectLine(Line.throughTwoPoints(sc.rightBound, p));
                if (intersection === undefined) {
                    console.log('No intersection with left side');
                    continue;
                }
                const lot = this.polygon.timeOf(intersection.toVector2());
                lo = Math.min(lo, lot);

                intersection = side2.intersectLine(Line.throughTwoPoints(sc.leftBound, p));
                if (intersection === undefined) {
                    console.log('No intersection with right side');
                    continue;
                }
                const hit = this.polygon.timeOf(intersection.toVector2());
                hi = Math.max(hi, hit);
            }
            if (lo === Number.POSITIVE_INFINITY) lo = this.polygon?.vertexTimes[this.phaseTile.word[1]];
            if (hi === Number.NEGATIVE_INFINITY) hi = this.polygon?.vertexTimes[this.phaseTile.word[1] + 1];
            los.push(new Vector2(t, lo));
            his.push(new Vector2(t, hi));
        }
        const shape = new Shape(los.concat(his.reverse()));
        const mesh = new Mesh(new ShapeGeometry(shape), new MeshBasicMaterial({color}));
        mesh.translateX(-0.5);
        mesh.translateY(-0.5);
        return mesh;
    }

    ngOnChanges(changes: SimpleChanges) {
        this.dirty = true;
    }
}
