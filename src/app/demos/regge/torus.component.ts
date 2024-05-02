import {Component, Input, OnChanges, SimpleChanges} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import * as THREE from "three";
import {
    BufferGeometry,
    ColorRepresentation,
    Light,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshPhongMaterial,
    TorusGeometry,
    Vector2,
    Vector3
} from "three";

@Component({
    selector: 'torus',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class TorusComponent extends ThreeDemoComponent implements OnChanges {
    orbitControls: OrbitControls;

    dirty = true;

    torusMesh: Mesh;
    lights: Light[] = [];
    paths: Line[] = [];

    @Input()
    tau1: number = 0;

    @Input()
    tau2: number = 1;

    constructor() {
        super();
        this.useOrthographic = false;
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enablePan = false;

        this.torusMesh = new Mesh(new TorusGeometry(3, 1, 36, 360), new MeshPhongMaterial({
            // transparent: true,
            // opacity: 0.9,
            color: 0xaaffff,
        }));

        const al = new THREE.AmbientLight(0xffffff, 0.2);
        const dl = new THREE.DirectionalLight(0xffffff, 0.5);
        dl.position.set(1, 1, 1);
        dl.target = this.torusMesh;

        this.lights.push(al, dl);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.dirty = true;
    }

    // Expect v in [0, 1] x [0, 1]
    h2toTorus(v: Vector2): Vector3 {
        const slopeInv = this.tau1 / this.tau2;
        const theta = 2 * Math.PI * (v.x - v.y * slopeInv);
        const phi = 2 * Math.PI * v.y;

        const rr = 3;
        const tr = this.tau2 + 0.02;

        return new Vector3(
            Math.cos(theta) * (rr + tr * Math.cos(phi)),
            Math.sin(theta) * (rr + tr * Math.cos(phi)),
            tr * Math.sin(phi),
        );
    }

    pathToMesh(p1: Vector2, p2: Vector2, thickness: number, color: ColorRepresentation): Line {
        let vertices = [];
        const d = p2.clone().sub(p1);
        const steps = 360;
        for (let i = 0; i <= steps; i++) {
            const v = p1.clone().addScaledVector(d, i / steps);
            const tv = this.h2toTorus(v);
            vertices.push(tv);
        }
        return new Line(new BufferGeometry().setFromPoints(vertices), new LineBasicMaterial({color}));
    }

    updatePaths() {
        this.paths = [];
        this.paths.push(this.pathToMesh(new Vector2(0, 0), new Vector2(0, 1), 0.025, 0xff0000));
        this.paths.push(this.pathToMesh(new Vector2(0, 0), new Vector2(1, 0), 0.025, 0x0000ff));
        for (let i = 1; i < 10; i++) {
            this.paths.push(this.pathToMesh(new Vector2(i / 10, 0), new Vector2(i / 10, 1), 0.01, 0xffffff));
            this.paths.push(this.pathToMesh(new Vector2(0, i / 10), new Vector2(1, i / 10), 0.01, 0xffffff));
        }
    }


    frame(dt: number): void {
        if (this.dirty) {
            this.dirty = false;
            this.updatePaths();
            this.torusMesh = new Mesh(
                new TorusGeometry(3, this.tau2, 36, 360),
                this.torusMesh.material,
            );
            this.scene.clear();
            this.scene.add(this.torusMesh);
            this.scene.add(...this.lights);
            this.scene.add(...this.paths);
        }
    }
}