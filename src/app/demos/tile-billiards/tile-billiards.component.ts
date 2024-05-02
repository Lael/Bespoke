import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {Penrose3, VertexStarP3} from "../tiling/penrose3";
import {InstancedMesh, Matrix4, MeshBasicMaterial, Shape, ShapeGeometry, Vector2} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {AnnotationType} from "../tiling/tiling";
import {CommonModule} from "@angular/common";

@Component({
    selector: 'tile-billiards',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class TileBilliardsComponent extends ThreeDemoComponent {

    penrose: Penrose3;
    cameraControls: OrbitControls;
    point = new Vector2(1.234, 5.678);

    constructor() {
        super();

        this.cameraControls = new OrbitControls(this.camera, this.renderer.domElement);

        this.penrose = new Penrose3(VertexStarP3.BOX);
        this.penrose.decompose();
        this.penrose.decompose();
        this.penrose.decompose();
        this.penrose.decompose();
        this.drawTiling();
    }

    frame(dt: number): void {
    }

    drawTiling() {
        this.scene.clear();
        const tiling = this.penrose.tiling;

        const meshes: InstancedMesh[] = [];
        const annotations: InstancedMesh[] = [];

        for (let i = 0; i < tiling.tiles.length; i++) {
            const tile = tiling.tiles[i];

            const shape = new Shape().setFromPoints(tile.polygon.vertices);
            const tileGeometry = new ShapeGeometry(shape);
            const tileMaterial = new MeshBasicMaterial({color: tile.color});
            const positions = tiling.positions[i];
            const tileMesh = new InstancedMesh(tileGeometry, tileMaterial, positions.length);

            const annotationMeshes = [];
            for (let annotation of tile.annotations) {
                if (annotation.type !== AnnotationType.BORDERS) continue;
                const annotationGeometry = new ShapeGeometry(annotation.shape);
                const annotationMaterial = new MeshBasicMaterial({color: annotation.color});
                annotationMeshes.push(new InstancedMesh(annotationGeometry, annotationMaterial, positions.length));
            }

            for (let j = 0; j < positions.length; j++) {
                const rotation = new Matrix4().makeRotationZ(positions[j].rotation);
                const translation = new Matrix4().makeTranslation(positions[j].position.x, positions[j].position.y, 0);
                const matrix = rotation.premultiply(translation);
                tileMesh.setMatrixAt(j, matrix);
                for (let a of annotationMeshes) {
                    a.setMatrixAt(j, matrix);
                }
            }
            tileMesh.instanceMatrix.needsUpdate = true;
            for (let a of annotationMeshes) {
                a.instanceMatrix.needsUpdate = true;
                a.renderOrder = 2;
            }

            meshes.push(tileMesh);
            annotations.push(...annotationMeshes);

            tileMesh.instanceMatrix.needsUpdate = true;
            meshes.push(tileMesh);
        }
        for (let mesh of meshes) {
            this.scene.add(mesh);
        }

        for (let annotation of annotations) {
            this.scene.add(annotation);
        }
    }
}
