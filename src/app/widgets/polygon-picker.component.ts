import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {ThreeDemoComponent} from "./three-demo/three-demo.component";
import {AxesHelper, Color, Matrix4, Mesh, MeshBasicMaterial, SphereGeometry, Vector2, Vector3} from "three";
import {DragControls} from "three/examples/jsm/controls/DragControls.js";
import {normalizeAngle} from "../../math/math-helpers";
import {reflectOver} from "../demos/unfolding/unfolding.component";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {CommonModule} from "@angular/common";
import {LineSegmentsGeometry} from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial.js";
import {LineSegments2} from "three/examples/jsm/lines/LineSegments2.js";

const CLEAR_COLOR = new Color(0xfafafa);
const POINT_RADIUS = 0.025;
const EDGE_WIDTH = 2;

export enum PolygonRestriction {
    NONE = 'None',
    CONVEX = 'Convex',
    KITE = 'Kite',
    CENTRAL = 'Central',
}

@Component({
    selector: 'polygon-picker',
    templateUrl: './three-demo/three-demo.component.html',
    styleUrls: ['./three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class PolygonPickerComponent extends ThreeDemoComponent implements OnChanges {

    @Input() restriction: PolygonRestriction = PolygonRestriction.CONVEX;
    @Input() arrowKeys: boolean = false;

    @Output() verticesEvent = new EventEmitter<Vector2[]>();

    draggables: Mesh[] = [];
    dragControls: DragControls;
    orbitControls: OrbitControls;

    private mat = new MeshBasicMaterial({color: 0x283845});
    private geo = new SphereGeometry(POINT_RADIUS);
    private com = new Vector2();

    dirty = true;

    constructor() {
        super();
        this.useOrthographic = true;
        this.updateOrthographicCamera();
        this.renderer.setClearColor(CLEAR_COLOR);
        this.orbitControls = new OrbitControls(this.orthographicCamera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;
        this.orbitControls.zoomToCursor = true;

        this.reset();

        this.dragControls = new DragControls(this.draggables, this.camera, this.renderer.domElement);

        this.dragControls.addEventListener('drag', this.drag.bind(this));
        this.dragControls.addEventListener('dragend', this.dragEnd.bind(this));

        document.addEventListener('pointerdown', this.pointerdown.bind(this), {capture: true});
    }

    ngOnChanges(changes: SimpleChanges) {
        this.reset();
    }

    private drag(event: any) {
        switch (this.restriction) {
        case PolygonRestriction.KITE:
            const v0 = new Vector2(this.draggables[0].position.x, this.draggables[0].position.y);
            const v1 = new Vector2(this.draggables[1].position.x, this.draggables[1].position.y);
            const v2 = new Vector2(this.draggables[2].position.x, this.draggables[2].position.y);
            const v3 = new Vector2(this.draggables[3].position.x, this.draggables[3].position.y);
            if (event.object === this.draggables[0]) {
                const ref = reflectOver(v1, v3, v0);
                this.draggables[2].position.x = ref.x;
                this.draggables[2].position.y = ref.y;
            } else if (event.object === this.draggables[2]) {
                const ref = reflectOver(v1, v3, v2);
                this.draggables[0].position.x = ref.x;
                this.draggables[0].position.y = ref.y;
            } else if (event.object === this.draggables[1]) {
                const d = v3.distanceTo(v2);
                const t0 = v0.clone().sub(v3).angle();
                const t2 = v2.clone().sub(v3).angle();
                const t1 = v1.clone().sub(v3).angle();
                let theta = (normalizeAngle(t2, t0) - t0) / 2;
                if (theta > Math.PI / 2) theta = Math.PI - theta;
                this.draggables[0].position.x = v3.x + d * Math.cos(t1 - theta);
                this.draggables[0].position.y = v3.y + d * Math.sin(t1 - theta);
                this.draggables[2].position.x = v3.x + d * Math.cos(t1 + theta);
                this.draggables[2].position.y = v3.y + d * Math.sin(t1 + theta);
            } else if (event.object === this.draggables[3]) {
                const d = v1.distanceTo(v2);
                const t0 = v0.clone().sub(v1).angle();
                const t2 = v2.clone().sub(v1).angle();
                const t3 = v3.clone().sub(v1).angle();
                let theta = (normalizeAngle(t2, t0) - t0) / 2;
                if (theta > Math.PI / 2) theta = Math.PI - theta;
                this.draggables[0].position.x = v1.x + d * Math.cos(t3 - theta);
                this.draggables[0].position.y = v1.y + d * Math.sin(t3 - theta);
                this.draggables[2].position.x = v1.x + d * Math.cos(t3 + theta);
                this.draggables[2].position.y = v1.y + d * Math.sin(t3 + theta);
            }
            break;
        case PolygonRestriction.CENTRAL:
            let found = -1;
            for (let i = 0; i < this.draggables.length; i++) {
                if (event.object === this.draggables[i]) {
                    found = i;
                    break;
                }
            }
            if (found === -1) return;

            let n = this.draggables.length / 2;
            const opp = this.com.clone().multiplyScalar(2).sub(
                new Vector2(
                    this.draggables[found].position.x,
                    this.draggables[found].position.y
                )
            );

            const oppObject = this.draggables[(n + found) % (2 * n)];
            oppObject.position.x = opp.x;
            oppObject.position.y = opp.y;

            break;
        }
        this.markDirty();
    }

    processKeyboardInput(dt: number) {
        let vDiff = 0;
        let aDiff = 0;
        if (this.keysPressed.get('ArrowLeft')) aDiff += dt * 0.1;
        if (this.keysPressed.get('ArrowRight')) aDiff -= dt * 0.1;
        if (this.keysPressed.get('ArrowUp')) vDiff += dt * 0.1;
        if (this.keysPressed.get('ArrowDown')) vDiff -= dt * 0.1;
        if (aDiff !== 0 || vDiff !== 0) {
            const r = new Matrix4().makeTranslation(-this.com.x, -this.com.y, 0)
                .premultiply(new Matrix4().makeRotationZ(aDiff))
                .premultiply(new Matrix4().makeTranslation(this.com.x, this.com.y, 0));
            this.com.y += vDiff;
            for (let d of this.draggables) {
                d.position.applyMatrix4(r);
                d.position.y += vDiff;
            }
            this.markDirty();
        }
    }

    reset(n: number = 3, skip: number = 0, offset: number = 0.1234) {
        while (this.draggables.length > 0) {
            this.draggables.pop();
        }
        switch (this.restriction) {
        case PolygonRestriction.NONE:
        case PolygonRestriction.CENTRAL:
        case PolygonRestriction.CONVEX:
            for (let i = 0; i < n; i++) {
                const v = polar(1, (1 + skip) * i * 2 * Math.PI / n + offset);
                this.draggables.push(this.dot(v));
            }
            break;
        case PolygonRestriction.KITE:
            this.draggables.push(this.dot(new Vector2(1, 1)));
            this.draggables.push(this.dot(new Vector2(0, 2)));
            this.draggables.push(this.dot(new Vector2(-1, 1)));
            this.draggables.push(this.dot(new Vector2(0, -2)));
            break;
        }
        this.markDirty();
    }

    private dot(v: Vector2): Mesh {
        const d = new Mesh(this.geo, this.mat);
        d.translateX(v.x);
        d.translateY(v.y);
        return d;
    }

    pointerdown(event: MouseEvent) {
        if (event.button !== 0) return;
        if (this.restriction === PolygonRestriction.KITE) return;
        // find location in world
        const screenX = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        const screenY = 1 - (event.clientY / this.renderer.domElement.clientHeight) * 2;
        // console.log(screenX, screenY);
        if (screenX < -1 || screenX > 1 || screenY < -1 || screenY > 1) {
            return;
        }

        const world = new Vector3(screenX, screenY).unproject(this.camera);
        const point = new Vector2(world.x, world.y);
        const objects = this.dragControls.getObjects();
        const vertices = objects.map(o => new Vector2(o.position.x, o.position.y));
        for (let v of vertices) {
            if (v.distanceTo(point) <= POINT_RADIUS) {
                return;
            }
        }

        const [hull, _] = convexHull(vertices);
        if (!hullContainsPoint(hull, point)) {
            return;
        }

        let bestI = 0;
        let bestD = Number.POSITIVE_INFINITY;
        const n = vertices.length;
        for (let i = 0; i < n; i++) {
            const v1 = vertices[i].clone();
            const v2 = vertices[(i + 1) % n].clone();
            const m = v1.add(v2).multiplyScalar(0.5);
            const d = point.distanceTo(m);
            if (d < bestD) {
                bestD = d;
                bestI = (i + 1) % n;
            }
        }

        const d = this.dot(point);
        this.scene.add(d);
        const dl = this.draggables.length;
        this.draggables.push(this.draggables[dl - 1]);
        for (let i = dl - 1; i >= bestI; i--) {
            this.draggables[i] = this.draggables[i - 1];
        }
        this.draggables[bestI] = d;

        if (this.restriction === PolygonRestriction.CENTRAL) {
            const opp = this.com.clone().multiplyScalar(2).sub(point);
            const od = this.dot(opp);
            this.draggables.push(od);
            this.scene.add(od);

            const a1 = hull[0].clone().sub(this.com).angle();
            this.draggables.sort(
                (a, b) => {
                    const at = new Vector2(a.position.x, a.position.y).sub(this.com).angle();
                    const bt = new Vector2(b.position.x, b.position.y).sub(this.com).angle();
                    return normalizeAngle(at, a1) - normalizeAngle(bt, a1);
                }
            );
        }


        this.renderer.render(this.scene, this.camera);
        this.markDirty();
    }

    dragEnd() {
        if (this.restriction === PolygonRestriction.KITE || this.restriction === PolygonRestriction.NONE) return;
        const objects = this.dragControls.getObjects();
        const vertices = objects.map(o => new Vector2(o.position.x, o.position.y));
        const [hull, _] = convexHull(vertices);
        while (this.draggables.length > 0) {
            this.draggables.pop();
        }
        for (let v of hull) {
            const d = new Mesh(this.geo, this.mat);
            d.translateX(v.x);
            d.translateY(v.y);
            this.draggables.push(d);
            this.scene.add(d);
        }
        this.markDirty();
    }

    markDirty() {
        this.dirty = true;
    }

    override frame(dt: number) {
        if (this.arrowKeys) this.processKeyboardInput(dt);
        if (this.dirty) {
            this.dirty = false;

            this.scene.clear();
            if (this.arrowKeys) {
                const axesHelper = new AxesHelper(1);
                this.scene.add(axesHelper);
            }
            const objects = this.dragControls.getObjects();
            this.scene.add(...objects);
            const vertices = objects.map(o => new Vector2(o.position.x, o.position.y));
            let hull = [...vertices];
            if (this.restriction === PolygonRestriction.CONVEX || this.restriction === PolygonRestriction.CENTRAL) hull = convexHull(vertices)[0];
            this.verticesEvent.emit(hull);

            const polyPoints = [];
            for (let i = 0; i < hull.length; i++) {
                polyPoints.push(hull[i], hull[(i + 1) % hull.length]);
            }

            const polyGeo = new LineSegmentsGeometry().setPositions(polyPoints.flatMap(v => [v.x, v.y, 0]));
            const polyMat = new LineMaterial({color: 0x283845, linewidth: EDGE_WIDTH, resolution: this.resolution});

            const poly = new LineSegments2(polyGeo, polyMat);
            this.scene.add(poly);
        }
    }
}

function polar(radius: number, theta: number): Vector2 {
    return new Vector2(
        radius * Math.cos(theta),
        radius * Math.sin(theta),
    );
}

export function convexHull(points: Vector2[]): Vector2[][] {
    if (points.length < 3) return [[...points], []];
    // leftmost point (in case of tie, choose bottommost):
    let bestX = Number.POSITIVE_INFINITY;
    let bestY = Number.POSITIVE_INFINITY;
    let startI = -1;
    for (let [i, point] of points.entries()) {
        if (point.x < bestX || (point.x === bestX && point.y < bestY)) {
            bestX = point.x;
            bestY = point.y;
            startI = i;
        }
    }

    const hull: Vector2[] = [];
    const start = points[startI];
    let current = start;
    let baseAngle = -Math.PI;
    let steps = 0;
    do {
        let bestAngle = Number.POSITIVE_INFINITY;
        let bestDistSq = Number.NEGATIVE_INFINITY;
        let bestJ = -1;
        for (let [i, point] of points.entries()) {
            const distSq = point.distanceToSquared(current);
            if (distSq === 0) continue;
            const angle = normalizeAngle(point.clone().sub(current).angle(), baseAngle);
            if (angle < bestAngle || (angle === bestAngle && distSq > bestDistSq)) {
                bestAngle = angle;
                bestDistSq = distSq;
                bestJ = i;
            }
        }
        baseAngle = bestAngle;
        current = points[bestJ];
        hull.push(current);
        steps++;
    } while (current.distanceToSquared(start) > 0 && steps < points.length);

    const antihull = points.filter(v => !!hull.find(h => h === v));
    let firstIndex = -1;
    for (let v of points) {
        for (let i = 0; i < hull.length; i++) {
            if (hull[i].equals(v)) {
                firstIndex = i;
                break;
            }
        }
        if (firstIndex !== -1) break;
    }
    const orderedHull = hull.slice(firstIndex, hull.length).concat(hull.slice(0, firstIndex));
    return [orderedHull, antihull];
}

function hullContainsPoint(hull: Vector2[], point: Vector2): boolean {
    const angles = hull.map(v => v.clone().sub(point).angle()); // in range [-π, π)
    for (let i = 0; i < angles.length; i++) {
        const a1 = angles[i];
        const a2 = angles[(i + 1) % angles.length];
        if (normalizeAngle(a2, a1) - a1 > Math.PI) return false;
    }
    return true;
}
