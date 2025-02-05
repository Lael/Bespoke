import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {ThreeDemoComponent} from "./three-demo/three-demo.component";
import {ArrowHelper, AxesHelper, Color, Mesh, MeshBasicMaterial, SphereGeometry, Vector2, Vector3} from "three";
import {DragControls} from "three/examples/jsm/controls/DragControls.js";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {CommonModule} from "@angular/common";

const CLEAR_COLOR = new Color(0x123456);
const POINT_RADIUS = 0.05;

@Component({
    selector: 'vector-picker',
    templateUrl: './three-demo/three-demo.component.html',
    styleUrls: ['./three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class VectorPickerComponent extends ThreeDemoComponent implements OnChanges {

    @Input() projection: (v: Vector3) => Vector3 = (v) => v;

    @Output() vectorEvent = new EventEmitter<Vector3>();

    draggable: Mesh;
    dragControls: DragControls;
    orbitControls: OrbitControls;

    dirty = true;

    constructor() {
        super();
        this.renderer.setClearColor(CLEAR_COLOR);

        this.perspectiveCamera.position.set(5, 5, 5);
        this.perspectiveCamera.lookAt(new Vector3());
        this.perspectiveCamera.up.set(0, 0, 1);

        const mat = new MeshBasicMaterial({color: 0xffffff});
        const geo = new SphereGeometry(POINT_RADIUS);
        this.draggable = new Mesh(geo, mat);

        this.dragControls = new DragControls([this.draggable], this.camera, this.renderer.domElement);
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);

        this.dragControls.addEventListener('dragstart', this.dragStart.bind(this));
        this.dragControls.addEventListener('drag', this.drag.bind(this));
        this.dragControls.addEventListener('dragend', this.dragEnd.bind(this));
    }

    ngOnChanges(changes: SimpleChanges) {
        this.project();
    }

    private project() {
        const position = this.projection(this.draggable.position);
        this.draggable.position.set(position.x, position.y, position.z);
        this.markDirty();
    }

    private dragStart() {
        this.orbitControls.enabled = false;
    }

    private drag(event: any) {
        if (event.object !== this.draggable) return;
        this.project();
    }

    private dragEnd() {
        this.orbitControls.enabled = true;
    }

    markDirty() {
        this.dirty = true;
    }

    override frame(dt: number) {
        if (this.dirty) {
            this.dirty = false;

            this.scene.clear();
            this.scene.add(new AxesHelper(2));
            this.scene.add(this.draggable);

            const guide = new Mesh(new SphereGeometry(1),
                new MeshBasicMaterial({color: 0x888888, wireframe: true}));
            this.scene.add(guide);

            this.scene.add(new ArrowHelper(
                this.draggable.position,
                new Vector3(),
                this.draggable.position.length(),
                0xffffff));

            this.vectorEvent.emit(this.draggable.position);
        }
    }
}

function polar(radius: number, theta: number): Vector2 {
    return new Vector2(
        radius * Math.cos(theta),
        radius * Math.sin(theta),
    );
}
