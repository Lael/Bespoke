import {Component, OnDestroy} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {
    AxesHelper,
    BufferGeometry, CircleGeometry, Color,
    Line, LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    Vector2
} from "three";
import {GUI} from "dat.gui";
import {CommonModule} from "@angular/common";
import {clamp} from "three/src/math/MathUtils.js";
import {AffineCircle} from "../../../math/geometry/affine-circle";
import {Complex} from "../../../math/complex";
import {Line as GeoLine} from "../../../math/geometry/line";

const SPEED: number = 1.0;
const CLEAR_COLOR: number = 0x123456;
const T_MAX: number = 10000.0;

interface Ray {
    point: Vector2,
    direction: Vector2,
    time: number;
}

@Component({
    selector: 'scattering',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule]
})
export class ScatteringComponent extends ThreeDemoComponent implements OnDestroy {
    orbitControls: OrbitControls;
    gui: GUI;
    radius = 0.25;
    position = 0.0;
    angle = 0;
    ndisks = 20;
    dirty = true;
    nbounces = 100;
    disks: Mesh[] = [];
    illumination: Mesh[] = [];
    nregions = 360;
    regions: number[] = [];

    constructor() {
        super();
        this.useOrthographic = true;
        this.renderer.setClearColor(CLEAR_COLOR);
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);

        this.recomputeDisks();
        this.gui = new GUI();
        this.updateGUI();
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new GUI();

        this.gui.add(this, 'radius').min(0.01).max(0.49).onChange(() => {
            this.recomputeDisks();
        });
        this.gui.add(this, 'nbounces').min(1).max(1000).step(1).onChange(() => {
            this.dirty = true;
        });
        this.gui.open();
    }

    override ngOnDestroy() {
        this.gui.destroy();
        super.ngOnDestroy();
    }

    processKeyboardInput(dt: number) {
        let multiplier = 1;
        multiplier *= (this.keysPressed.get('ShiftLeft') || this.keysPressed.get('ShiftRight') ? 0.1 : 1);
        multiplier *= (this.keysPressed.get('AltLeft') || this.keysPressed.get('AltRight') ? 0.001 : 1);

        this.showHelp = !!this.keysPressed.get('KeyH');

        let dv = new Vector2();
        if (this.keysPressed.get('ArrowUp')) dv.y += 1;
        if (this.keysPressed.get('ArrowDown')) dv.y -= 1;
        if (this.keysPressed.get('ArrowLeft')) dv.x += 1;
        if (this.keysPressed.get('ArrowRight')) dv.x -= 1;

        if (this.keyJustPressed('KeyR')) this.resetIllumination();

        if (dv.length() != 0) {
            dv.normalize().multiplyScalar(multiplier * SPEED * dt);
            this.position += dv.x;
            this.angle += dv.y;
            this.angle = clamp(this.angle, -Math.PI / 2, Math.PI / 2);
            this.dirty = true;
        }
    }

    recomputeDisks() {
        this.dirty = true;
        this.disks = [];
        for (let i = -this.ndisks; i <= this.ndisks; i++) {
            for (let j = -this.ndisks; j <= this.ndisks; j++) {
                let disk = new Mesh(
                    new CircleGeometry(this.radius, 120),
                    new MeshBasicMaterial({color: 0x888888}));
                disk.translateX(i);
                disk.translateY(j);
                this.disks.push(disk);
            }
        }
        this.illumination = [];
        for (let i = 0; i < this.nregions; i++) {
            let disk =
                new Mesh(new CircleGeometry(1), new MeshBasicMaterial({color: 0x000000}));
            this.illumination.push(disk);
        }
        this.resetIllumination();
    }

    resetIllumination() {
        this.dirty = true;
        this.regions = [];
        for (let i = 0; i < this.nregions; i++) {
            this.regions.push(Number.POSITIVE_INFINITY);
            this.illumination[i].scale.set(
                this.radius * Math.PI / this.nregions,
                this.radius * Math.PI / this.nregions,
                this.radius * Math.PI / this.nregions);
            this.illumination[i].position.x = (0.01 + this.radius) * Math.cos(i / this.nregions * Math.PI * 2);
            this.illumination[i].position.y = (0.01 + this.radius) * Math.sin(i / this.nregions * Math.PI * 2);
        }
    }

    updateColors() {
        let bright = new Color('gold');
        let dark = new Color('black');
        for (let i = 0; i < this.nregions; i++) {
            let m = 2 * (0.5 - this.radius)
            // let t = Math.exp((m - this.regions[i]));
            let t = 1.0 / (1.0 + this.regions[i] * this.regions[i]);
            let color = new Color().lerpColors(dark, bright, t);
            (this.illumination[i].material as MeshBasicMaterial).color.set(color);
        }
    }

    frame(dt: number): void {
        this.processKeyboardInput(dt);
        if (this.dirty) {
            this.scene.clear();
            this.scene.add(...this.disks);
            let orbit = this.computeOrbit();
            let path =
                new Line(new BufferGeometry().setFromPoints(orbit), new LineBasicMaterial({color: 0xffffff}));
            this.updateColors();
            this.scene.add(...this.illumination);
            this.scene.add(path);
            this.dirty = false;
        }
    }

    castRay(ray: Ray): Ray {
        // check for future intersection with disk in this cell
        // if so, return
        // otherwise, move to next cell
        while (ray.time < T_MAX) {
            let circle = new AffineCircle(
                new Complex(
                    Math.round(ray.point.x),
                    Math.round(ray.point.y),
                ),
                this.radius
            );
            let intersections = circle.intersectLine(
                GeoLine.throughTwoPoints(ray.point, ray.point.clone().add(ray.direction))
            ).map(c => c.toVector2());
            let collision = undefined;
            for (let intersection of intersections) {
                if (intersection.clone().sub(ray.point).dot(ray.direction) > (0.5 - this.radius) / 20) {
                    if (collision === undefined) {
                        collision = intersection;
                    } else if (intersection.distanceToSquared(ray.point) < collision.distanceToSquared(ray.point)) {
                        collision = intersection;
                    }
                }
            }
            if (!!collision) {
                let time = ray.time + ray.point.distanceTo(collision);
                let direction = reflect(ray.direction, collision.clone().sub(circle.center.toVector2()).normalize());
                return {
                    point: collision,
                    direction,
                    time,
                }
            } else {
                const dt = (0.5 - this.radius) / 2;
                ray.time += dt;
                ray.point.addScaledVector(ray.direction, dt);
            }
        }
        return ray;
    }

    computeOrbit(): Vector2[] {
        let orbit = [];
        let point = new Vector2(
            Math.cos(this.position),
            Math.sin(this.position),
        ).multiplyScalar(this.radius);
        let direction = new Vector2(
            Math.cos(this.position + this.angle),
            Math.sin(this.position + this.angle),
        );
        orbit.push(point.clone());
        let ray: Ray = {point, direction, time: 0};
        for (let i = 0; i < this.nbounces; i++) {
            // cast ray
            ray = this.castRay(ray);
            orbit.push(ray.point.clone());
            if (ray.point.lengthSq() < 0.25) {
                // we are on the central disk
                let region = Math.round((ray.point.angle() / (2 * Math.PI)) * this.nregions);
                if (ray.time < this.regions[region]) {
                    this.regions[region] = ray.time;
                }
            }
        }
        return orbit;
    }
}

function reflect(incident: Vector2, normal: Vector2): Vector2 {
    let proj = normal.clone().multiplyScalar(incident.dot(normal));
    return incident.clone().addScaledVector(proj, -2).normalize();
}