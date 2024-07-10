import {Component, Input, OnChanges, SimpleChanges} from "@angular/core";
import {Color, Matrix3, Vector2, Vector3} from "three";
import {CommonModule} from "@angular/common";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial";
import {LineGeometry} from "three/examples/jsm/lines/LineGeometry";
import {Line2} from "three/examples/jsm/lines/Line2";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

const IMAGE_EDGE_WIDTH = 1;
const FINAL_EDGE_WIDTH = 2;
const ITERATE_COLOR = 0xaa44aa;
const FINAL_COLOR = 0x008800;

@Component({
    selector: 'affine-normalization',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class AffineNormalizationComponent extends ThreeDemoComponent implements OnChanges {

    @Input() iterates?: Vector2[][];
    @Input() normalize: boolean = true;
    orbitControls: OrbitControls;

    images: Line2[] = [];
    finalImage: Line2 | undefined = undefined;
    dirty = true;

    constructor() {
        super();
        this.useOrthographic = true;
        this.updateOrthographicCamera();
        this.renderer.setClearColor(new Color(0xfafafa));
        this.orbitControls = new OrbitControls(this.orthographicCamera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;
        this.orbitControls.zoomToCursor = true;
    }

    override frame(dt: number) {
        if (this.dirty) {
            this.scene.clear();
            this.images = [];
            if (this.iterates === undefined) return;
            for (let i = 0; i < this.iterates.length - 1; i++) {
                const loop = this.iterates[i].concat(this.iterates[i][0]);
                const points = normalizePolygon(loop, this.normalize);
                const line2 = new Line2(
                    new LineGeometry().setFromPoints(points),
                    new LineMaterial({
                        color: ITERATE_COLOR,
                        resolution: this.resolution,
                        linewidth: IMAGE_EDGE_WIDTH
                    })
                );
                this.images.push(line2);
                this.scene.add(line2);
            }
            if (this.iterates.length > 0) {
                const loop = this.iterates[this.iterates.length - 1].concat(this.iterates[this.iterates.length - 1][0]);
                const points = normalizePolygon(loop, this.normalize);
                this.finalImage = new Line2(
                    new LineGeometry().setFromPoints(points),
                    new LineMaterial({
                        color: FINAL_COLOR,
                        resolution: this.resolution,
                        linewidth: FINAL_EDGE_WIDTH
                    })
                );
                this.scene.add(this.finalImage);
            }
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.dirty = true;
    }
}

function normalizePolygon(vertices: Vector2[], normalize: boolean): Vector2[] {
    const mt = mapThree(vertices, normalize);
    return vertices.map(v => {
        const tv = new Vector3(v.x, v.y, 1).applyMatrix3(mt);
        return new Vector2(tv.x, tv.y);
    });
}

function mapThree(vertices: Vector2[], normalize: boolean): Matrix3 {
    // if (vertices.length === 6) {
    //     return new Matrix3().identity();
    // }
    let n = vertices.length;
    let v1 = vertices[3 % n].clone().sub(vertices[2]); // should be (1, 0)
    let v2 = vertices[1].clone().sub(vertices[2]); // should be (cos(pi - 2pi / n), sin(pi - 2pi / n))

    let d = vertices[2];

    let theta = normalize ? Math.PI * (1 - 2 / n) : Math.PI / 2;

    return new Matrix3().set(
        1, 0, -d.x,
        0, 1, -d.y,
        0, 0, 1,
    ).premultiply(
        new Matrix3().set(
            v1.x, v2.x, 0,
            v1.y, v2.y, 0,
            0, 0, 1,
        ).invert()
    ).premultiply(
        new Matrix3().set(
            1, Math.cos(theta), 0,
            0, Math.sin(theta), 0,
            0, 0, 1,
        )
    );
}