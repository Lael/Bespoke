import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {
    ArrowHelper,
    AxesHelper,
    BufferGeometry,
    Color,
    Float32BufferAttribute,
    InstancedMesh,
    Line,
    LineBasicMaterial,
    Matrix4,
    MeshBasicMaterial,
    Ray,
    Vector2,
    Vector3
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {CommonModule} from "@angular/common";

const CLEAR_COLOR = new Color(0x123456);

type Triangle = Vector3[];

export type Data = {
    iteration: number;
    aCount: number;
};

@Component({
    selector: 'unfolder-3d',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class Unfolder3DComponent extends ThreeDemoComponent implements OnChanges {
    private dirty = true;

    @Input() height: number = 1;
    @Input() vertices: Vector2[] = [
        new Vector2(1, 0),
        new Vector2(0, 1),
        new Vector2(-1, 0),
        new Vector2(0, -1),
    ];
    @Input() ray: Ray = new Ray(new Vector3(), new Vector3(1, 1, 1).normalize());
    @Input() iterations: number = 1000;

    @Output('data') dataEvent = new EventEmitter<Data[]>();

    controls: OrbitControls;

    ngOnChanges(_: SimpleChanges) {
        this.dirty = true;
    }

    constructor() {
        super();

        this.perspectiveCamera.position.set(5, -5, 5);
        this.perspectiveCamera.lookAt(new Vector3());
        this.perspectiveCamera.up.set(0, 0, 1);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.renderer.setClearColor(CLEAR_COLOR);
    }

    override frame(dt: number) {
        if (this.dirty) {
            this.dirty = false;
            this.unfold();
        }
    }

    unfold() {
        this.scene.clear();
        const polyMat = new MeshBasicMaterial({color: 0xffffff, wireframe: true});
        const geometry = new BufferGeometry();

        const up = new Vector3(0, 0, this.height);
        const dn = new Vector3(0, 0, -this.height);

        let triangles: Triangle[] = [];
        const positions: number[] = [];
        for (let i = 0; i < this.vertices.length; i++) {
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.vertices.length];
            const p1 = new Vector3(v1.x, v1.y, 0);
            const p2 = new Vector3(v2.x, v2.y, 0);
            positions.push(p1.x, p1.y, p1.z);
            positions.push(p2.x, p2.y, p2.z);
            positions.push(up.x, up.y, up.z);
            positions.push(p2.x, p2.y, p2.z);
            positions.push(p1.x, p1.y, p1.z);
            positions.push(dn.x, dn.y, dn.z);
            triangles.push([p1.clone(), p2.clone(), up.clone()]);
            triangles.push([p2.clone(), p1.clone(), dn.clone()]);
        }

        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

        this.scene.add(new ArrowHelper(
            this.ray.direction,
            this.ray.origin,
            1,
            0xff0000,
        ));

        this.scene.add(new Line(
            new BufferGeometry().setFromPoints([
                this.ray.origin,
                this.ray.origin.clone().add(this.ray.direction.clone().multiplyScalar(1000))
            ]), new LineBasicMaterial({color: 0xff0000})
        ));

        const epsilon = 0.000_000_001;
        let dist = 0;

        const drawIterations = Math.min(this.iterations + 1, 1001)
        const im = new InstancedMesh(geometry, polyMat, drawIterations);
        let m = new Matrix4().identity();
        im.setMatrixAt(0, m.clone());
        const data: Data[] = [];
        let aCount = 0;
        const tn = triangles.length;
        let graphRes = Math.pow(10,
            Math.max(0, Math.floor(Math.log10(this.iterations) - 1)));

        for (let i = 0; i < this.iterations; i++) {
            let d = Number.POSITIVE_INFINITY;
            let tri = undefined;
            let hitIndex = -1;
            for (let j = 0; j < triangles.length; j++) {
                const t = triangles[j];
                let intersect = this.ray.intersectTriangle(t[0], t[1], t[2], false, new Vector3());
                if (!intersect) continue;
                const id = intersect.clone().sub(this.ray.origin).dot(this.ray.direction);
                if (id < d && id > dist + epsilon) {
                    d = id;
                    tri = t;
                    hitIndex = j;
                }
            }
            if (!tri) {
                console.error('crud. no good intersections.');
                return;
            }
            const tm = reflectThroughThreePoints(tri[0], tri[1], tri[2]);
            triangles.map(t => [
                t[1].applyMatrix4(tm),
                t[0].applyMatrix4(tm),
                t[2].applyMatrix4(tm),
            ]);
            dist = d;
            m.premultiply(tm);
            if (i + 1 < drawIterations) {
                im.setMatrixAt(i + 1, m.clone());
            }

            if (hitIndex === 0) aCount += (i % 2) * 2 - 1;
            if ((i + 1) % graphRes === 0) {
                data.push({iteration: i + 1, aCount});
            }
        }
        im.instanceMatrix.needsUpdate = true;
        this.dataEvent.emit(data);

        this.scene.add(im);
        this.scene.add(new AxesHelper());
    }
}

function reflectThroughThreePoints(p1: Vector3, p2: Vector3, p3: Vector3): Matrix4 {
    const normal = p2.clone().sub(p1).cross(p3.clone().sub(p1)).normalize();
    const a = normal.x;
    const b = normal.y;
    const c = normal.z;
    const translation = new Matrix4().makeTranslation(p1.x, p1.y, p1.z);
    const untranslation = new Matrix4().makeTranslation(-p1.x, -p1.y, -p1.z);
    const reflection = new Matrix4().set(
        1 - 2 * a * a, -2 * a * b, -2 * a * c, 0,
        -2 * a * b, 1 - 2 * b * b, -2 * b * c, 0,
        -2 * a * c, -2 * b * c, 1 - 2 * c * c, 0,
        0, 0, 0, 1,
    );
    return untranslation.premultiply(reflection).premultiply(translation);
}
