import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {Color, InstancedMesh, Matrix4, MeshBasicMaterial, Shape, ShapeGeometry, Vector3} from 'three';
import * as dat from 'dat.gui';
import {AnnotationType, Tiling, UniformTilingType} from "./tiling";
import {PenroseTileset, PenroseTiling} from "./penrose";
import {Penrose2, VertexStarP2} from "./penrose2";
import {Penrose3, VertexStarP3} from "./penrose3";
import {CommonModule} from "@angular/common";

// Colors
const CLEAR_COLOR = new Color(0x000000);

// Other constants
const CAMERA_SPEED_XY = 1; // world-space units/second at z=1
const CAMERA_SPEED_Z = 0.5; // world-space units/second at z=1

enum TilingCategory {
    REGULAR = 'Regular',
    UNIFORM = 'Uniform',
    PENROSE = 'Penrose',
}

enum RegularTilingType {
    TRIANGLE = 'Triangle',
    SQUARE = 'Square',
    HEXAGON = 'Hexagon',
}

type TilingParams = {
    tilingType: TilingCategory;
    regularTiling: RegularTilingType;
    uniformTiling: UniformTilingType;
    penroseTileset: PenroseTileset;
    vertexStarP2: VertexStarP2;
    vertexStarP3: VertexStarP3;
};

const DEFAULT_TILING_PARAMS: TilingParams = {
    tilingType: TilingCategory.PENROSE,
    regularTiling: RegularTilingType.TRIANGLE,
    uniformTiling: UniformTilingType.U6434,
    penroseTileset: PenroseTileset.P2,
    vertexStarP2: VertexStarP2.SUB,
    vertexStarP3: VertexStarP3.SUB,
}

const PHI = (Math.sqrt(5) + 1) / 2;

@Component({
    selector: 'tile',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class TilingComponent extends ThreeDemoComponent {
    gui: dat.GUI;

    private params: TilingParams = DEFAULT_TILING_PARAMS;
    private drawParams = {
        borders: true,
        matching: true,
        subdivision: true,
        dual: false,
        robinson: false,
        colors: true,
    }

    private penrose: PenroseTiling;
    private tiling: Tiling;
    private drawDirty = true;

    constructor() {
        super();
        this.useOrthographic = true;
        this.resetCamera();

        this.renderer.setClearColor(CLEAR_COLOR);

        this.penrose = this.createPenroseTiling();
        this.tiling = this.createTiling();

        this.gui = new dat.GUI();
        this.updateGUI();
    }

    resetCamera(): void {
        this.orthographicCamera.position.x = 0;
        this.orthographicCamera.position.y = 0;
        this.orthographicDiagonal = 3;
        this.updateOrthographicCamera();
    }

    private processKeyboardInput(dt: number): void {
        // Camera
        const cameraDiff = new Vector3();
        if (this.keysPressed.get('KeyW')) cameraDiff.y += 1;
        if (this.keysPressed.get('KeyA')) cameraDiff.x -= 1;
        if (this.keysPressed.get('KeyS')) cameraDiff.y -= 1;
        if (this.keysPressed.get('KeyD')) cameraDiff.x += 1;
        if (cameraDiff.length() !== 0) cameraDiff.normalize();
        cameraDiff.multiplyScalar(this.orthographicDiagonal * CAMERA_SPEED_XY * dt);
        this.orthographicCamera.position.add(cameraDiff);
        let zoomDiff = 1;
        if (this.keysPressed.get('Space')) zoomDiff += CAMERA_SPEED_Z * dt;
        if (this.keysPressed.get('ShiftLeft')) zoomDiff -= CAMERA_SPEED_Z * dt;
        this.orthographicDiagonal *= zoomDiff;
        this.updateOrthographicCamera();
    }

    override keydown(e: KeyboardEvent) {
        super.keydown(e);

        if (e.code === 'ArrowDown' && this.params.tilingType === TilingCategory.PENROSE) {
            this.penrose.decompose();
            this.orthographicDiagonal *= PHI;
            this.orthographicCamera.position.x *= PHI;
            this.orthographicCamera.position.y *= PHI;
            this.tiling = this.createTiling();
        }

        if (e.code === 'ArrowUp' && this.params.tilingType === TilingCategory.PENROSE) {
            if (this.penrose.compose()) {
                this.orthographicDiagonal /= PHI;
                this.orthographicCamera.position.x /= PHI;
                this.orthographicCamera.position.y /= PHI;
                this.tiling = this.createTiling();
            }
        }

        if (e.code === 'KeyM' && this.params.tilingType === TilingCategory.PENROSE) {
            this.penrose = this.penrose.convert();
            if (this.params.penroseTileset === PenroseTileset.P2) {
                this.params.penroseTileset = PenroseTileset.P3;
            } else if (this.params.penroseTileset === PenroseTileset.P3) {
                this.params.penroseTileset = PenroseTileset.P2;
            }
            this.updateGUI();
            this.tiling = this.createTiling();
        }

        if (e.code === 'KeyP') {
            this.printScreen();
        }
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    override frame(dt: number) {
        this.processKeyboardInput(dt);
        if (this.drawDirty) {
            this.drawTiling();
            this.drawDirty = false;
        }
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();

        const tilingFolder = this.gui.addFolder('Tiling');
        tilingFolder.add(this.params, 'tilingType', Object.values(TilingCategory))
            .name('Type')
            .onFinishChange(this.updateTiling.bind(this));
        switch (this.params.tilingType) {
        case TilingCategory.REGULAR:
            tilingFolder.add(this.params, 'regularTiling', Object.values(RegularTilingType))
                .name('Which one?')
                .onFinishChange(this.updateTiling.bind(this));
            break;
        case TilingCategory.UNIFORM:
            tilingFolder.add(this.params, 'uniformTiling', Object.values(UniformTilingType))
                .name('Which one?')
                .onFinishChange(this.updateTiling.bind(this));
            break;
        case TilingCategory.PENROSE:
            tilingFolder.add(this.params, 'penroseTileset', Object.values(PenroseTileset))
                .name('Which tileset?')
                .onFinishChange(this.updateConfiguration.bind(this));
            switch (this.params.penroseTileset) {
            case PenroseTileset.P2:
                tilingFolder.add(this.params, 'vertexStarP2', Object.values(VertexStarP2))
                    .name('Vertex Star')
                    .onFinishChange(this.updateConfiguration.bind(this));
                break;
            case PenroseTileset.P3:
                tilingFolder.add(this.params, 'vertexStarP3', Object.values(VertexStarP3))
                    .name('Vertex Star')
                    .onFinishChange(this.updateConfiguration.bind(this));
                break;
            }
        }
        tilingFolder.open();

        const drawFolder = this.gui.addFolder('Draw');
        drawFolder.add(this.drawParams, 'borders').name('Tile edges')
            .onFinishChange(this.updateDraw.bind(this));
        if (this.params.tilingType === TilingCategory.PENROSE) {
            drawFolder.add(this.drawParams, 'matching').name('Matching rules')
                .onFinishChange(this.updateDraw.bind(this));
            drawFolder.add(this.drawParams, 'subdivision').name('Subdivisions')
                .onFinishChange(this.updateDraw.bind(this));
            drawFolder.add(this.drawParams, 'robinson').name('Robinson')
                .onFinishChange(this.updateDraw.bind(this));
            drawFolder.add(this.drawParams, 'colors').name('Colors')
                .onFinishChange(this.updateDraw.bind(this));
        } else {
            drawFolder.add(this.drawParams, 'dual').name('Dual')
                .onFinishChange(this.updateDraw.bind(this));
        }
        drawFolder.open();

        this.gui.open();
    }

    updateTiling() {
        this.resetCamera();
        this.updateGUI();
        this.tiling = this.createTiling();
    }

    createPenroseTiling() {
        if (this.params.penroseTileset === PenroseTileset.P2) {
            this.penrose = new Penrose2(this.params.vertexStarP2);
        } else if (this.params.penroseTileset === PenroseTileset.P3) {
            this.penrose = new Penrose3(this.params.vertexStarP3);
        }
        return this.penrose;
    }

    updateConfiguration() {
        this.createPenroseTiling();
        this.perspectiveCamera.position.set(0, 0, 10);
        this.updateTiling();
    }

    updateDraw() {
        this.drawDirty = true;
    }

    createTiling() {
        this.drawDirty = true;
        switch (this.params.tilingType) {
        case TilingCategory.REGULAR:
            switch (this.params.regularTiling) {
            case RegularTilingType.TRIANGLE:
                return Tiling.regular(3);
            case RegularTilingType.SQUARE:
                return Tiling.regular(4);
            case RegularTilingType.HEXAGON:
                return Tiling.regular(6);
            }
        case TilingCategory.UNIFORM:
            return Tiling.uniform(this.params.uniformTiling);
        case TilingCategory.PENROSE:
            return this.penrose.tiling;
        }
    }

    private shouldDrawAnnotation(type: AnnotationType): boolean {
        switch (type) {
        case AnnotationType.BORDERS:
            return this.drawParams.borders;
        case AnnotationType.MATCHING:
            return this.drawParams.matching;
        case AnnotationType.SUBDIVISION:
            return this.drawParams.subdivision;
        case AnnotationType.DUAL:
            return this.drawParams.dual;
        case AnnotationType.ROBINSON:
            return this.drawParams.robinson;
        }
        return true;
    }

    drawTiling() {
        this.scene.clear();

        const meshes: InstancedMesh[] = [];
        const annotations: InstancedMesh[] = [];

        for (let i = 0; i < this.tiling.tiles.length; i++) {
            const tile = this.tiling.tiles[i];

            const shape = new Shape().setFromPoints(tile.polygon.vertices);
            const tileGeometry = new ShapeGeometry(shape);
            const tileMaterial = new MeshBasicMaterial({color: this.drawParams.colors ? tile.color : 0xFFFFFF});
            const positions = this.tiling.positions[i];
            const tileMesh = new InstancedMesh(tileGeometry, tileMaterial, positions.length);

            const annotationMeshes = [];
            for (let annotation of tile.annotations) {
                if (!this.shouldDrawAnnotation(annotation.type)) continue;
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
        }
        for (let mesh of meshes) {
            this.scene.add(mesh);
        }

        for (let annotation of annotations) {
            this.scene.add(annotation);
        }
    }
}