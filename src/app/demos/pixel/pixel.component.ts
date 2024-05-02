import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {
    ArrowHelper,
    BufferGeometry,
    Color,
    InstancedMesh,
    LineBasicMaterial,
    LineSegments,
    Matrix3,
    Matrix4,
    PlaneGeometry,
    Vector2,
    Vector3
} from "three";

const GRID_ROWS = 100;
const GRID_COLS = 100;
const CELL_SIZE = 0.1;

const TOP = +(GRID_ROWS / 2) * CELL_SIZE;
const BOTTOM = -(GRID_ROWS / 2) * CELL_SIZE;
const LEFT = -(GRID_COLS / 2) * CELL_SIZE;
const RIGHT = +(GRID_COLS / 2) * CELL_SIZE;

const GRID_LINE_COLOR = new Color(0x888888);
const WALL_COLOR = new Color(0x000000);
const TABLE_COLOR = new Color(0xffffff);
const ORBIT_COLOR = new Color(0x88bb88);
const ORBIT_STATE_COLOR = new Color(0xffffff);

enum DragState {
    NOT_DRAGGING,
    TABLE,
    TABLE_BLOCK,
    WALL,
}

enum PixelDirection {
    NORTHEAST,
    NORTHWEST,
    SOUTHWEST,
    SOUTHEAST
}

const NORTHEAST_DIFF = new Vector2(+1, +1);
const NORTHWEST_DIFF = new Vector2(-1, +1);
const SOUTHWEST_DIFF = new Vector2(-1, -1);
const SOUTHEAST_DIFF = new Vector2(+1, -1);

const LEFT_MAT = new Matrix3(
    +1, +1, 0,
    -1, +1, 0,
    0, 0, 1,
).invert();

const RIGHT_MAT = new Matrix3(
    +1, -1, 0,
    +1, +1, 0,
    0, 0, 1,
).invert();

const DIFF_MAP = new Map<PixelDirection, Vector2>([
    [PixelDirection.NORTHEAST, NORTHEAST_DIFF],
    [PixelDirection.NORTHWEST, NORTHWEST_DIFF],
    [PixelDirection.SOUTHWEST, SOUTHWEST_DIFF],
    [PixelDirection.SOUTHEAST, SOUTHEAST_DIFF],
]);

function diffForDirection(dir: PixelDirection): Vector2 {
    return DIFF_MAP.get(dir)!.clone().multiplyScalar(CELL_SIZE);
}

function invertDirection(dir: PixelDirection): PixelDirection {
    return (dir + 2) % 4;
}

function leftDirection(dir: PixelDirection): PixelDirection {
    return (dir + 1) % 4;
}

function rightDirection(dir: PixelDirection): PixelDirection {
    return (dir + 3) % 4;
}

interface PixelBilliardState {
    cellIndex: number;
    direction: PixelDirection;
}

@Component({
    selector: 'billiards',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class PixelComponent extends ThreeDemoComponent {
    orbitControls: OrbitControls;

    tableCells: Set<number> = new Set<number>();
    orbitCells: Set<number> = new Set<number>();
    grid: InstancedMesh;
    gridBorder: LineSegments;

    dirty = true;
    dragState: DragState = DragState.NOT_DRAGGING;

    orbitStates: PixelBilliardState[] = [];

    constructor() {
        super();

        this.useOrthographic = true;
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.zoomToCursor = true;
        this.orbitControls.enableRotate = false;

        this.grid = new InstancedMesh(new PlaneGeometry(CELL_SIZE, CELL_SIZE), undefined, GRID_ROWS * GRID_COLS);
        for (let i = 0; i < this.grid.count; i++) {
            const pos = cellIndexToPosition(i);
            this.grid.setMatrixAt(i, new Matrix4().makeTranslation(new Vector3(pos.x, pos.y, -0.01)));
        }
        this.grid.instanceMatrix.needsUpdate = true;
        const lsp: Vector2[] = [];
        for (let i = 0; i < GRID_COLS + 1; i++) {
            const x = LEFT + i * CELL_SIZE;
            lsp.push(new Vector2(x, TOP), new Vector2(x, BOTTOM));
        }
        for (let i = 0; i < GRID_ROWS + 1; i++) {
            const y = BOTTOM + i * CELL_SIZE;
            lsp.push(new Vector2(LEFT, y), new Vector2(RIGHT, y));
        }
        this.gridBorder = new LineSegments(new BufferGeometry().setFromPoints(lsp), new LineBasicMaterial({color: GRID_LINE_COLOR}));
        this.scene.add(this.grid, this.gridBorder);
    }

    frame(dt: number): void {
        if (this.dirty) {
            this.dirty = false;
            this.scene.clear();
            for (let i = 0; i < this.grid.count; i++) {
                this.grid.setColorAt(i, WALL_COLOR);
            }
            for (let ci of this.tableCells) {
                this.grid.setColorAt(ci, TABLE_COLOR);
            }
            for (let ci of this.orbitCells) {
                this.grid.setColorAt(ci, ORBIT_COLOR);
            }
            if (this.grid.instanceColor) this.grid.instanceColor.needsUpdate = true;
            this.scene.add(this.grid);
            this.scene.add(this.gridBorder);
            // const orbitMesh = new InstancedMesh(
            //     new PlaneGeometry(CELL_SIZE / 2, CELL_SIZE / 2),
            //     new MeshBasicMaterial({color: ORBIT_STATE_COLOR}),
            //     this.orbitStates.length);
            for (let [i, state] of this.orbitStates.entries()) {
                const position = cellIndexToPosition(state.cellIndex).add(diffForDirection(state.direction).multiplyScalar(0.25));
                // orbitMesh.setMatrixAt(i, new Matrix4().makeTranslation(position.x, position.y, 0.01));
                const p = cellIndexToPosition(state.cellIndex);
                const d = diffForDirection(state.direction).multiplyScalar(0.25);
                this.scene.add(new ArrowHelper(
                    new Vector3(d.x, d.y, 0).normalize(),
                    new Vector3(p.x + d.x, p.y + d.y, 0.01),
                    CELL_SIZE * 0.25,
                    ORBIT_STATE_COLOR,
                    CELL_SIZE * 0.25,
                    CELL_SIZE * 0.25,
                ));
            }
            // orbitMesh.instanceMatrix.needsUpdate = true;
            // this.scene.add(orbitMesh);
        }
    }

    mouseToWorld(e: MouseEvent): Vector2 {
        const v = new Vector3(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1,
            0,
        );
        v.unproject(this.camera);
        return new Vector2(v.x, v.y);
    }

    mouseCellIndex(e: MouseEvent): number | undefined {
        return positionToCellIndex(this.mouseToWorld(e));
    }

    computeOrbitFromMouseEvent(e: MouseEvent) {
        const cellIndex = this.mouseCellIndex(e);
        if (cellIndex === undefined) return;
        const diff = this.mouseToWorld(e).sub(cellIndexToPosition(cellIndex));
        let dir;
        if (diff.x >= 0 && diff.y >= 0) dir = PixelDirection.NORTHEAST;
        else if (diff.x < 0 && diff.y >= 0) dir = PixelDirection.NORTHWEST;
        else if (diff.x < 0 && diff.y < 0) dir = PixelDirection.SOUTHWEST;
        else dir = PixelDirection.SOUTHEAST;
        this.computeOrbit(cellIndex, dir);
    }

    computeOrbit(cellIndex: number, direction: PixelDirection) {
        this.orbitStates = [];
        this.orbitCells.clear();
        const initialState = {cellIndex, direction};
        let currentState = {cellIndex, direction};
        let safety = 0;
        do {
            safety++;
            if (!this.tableCells.has(currentState.cellIndex)) return;
            this.orbitStates.push({...currentState});
            this.orbitCells.add(currentState.cellIndex);
            this.dirty = true;
            const l = this.leftCellInTable(currentState);
            const f = this.frontCellInTable(currentState);
            const r = this.rightCellInTable(currentState);
            if (f && l && r) {
                currentState = stepForward(currentState);
            } else if (l === r) {
                currentState.direction = invertDirection(currentState.direction);
            } else if (l && !r) {
                currentState.direction = leftDirection(currentState.direction);
            } else if (r && !l) {
                currentState.direction = rightDirection(currentState.direction);
            } else {
                console.log('what?', l, f, r);
                break;
            }
        } while (safety < this.tableCells.size * 4 && statesDiffer(initialState, currentState));
    }

    leftCellInTable(state: PixelBilliardState): boolean {
        const diff = diffForDirection(state.direction);
        const leftDiff = new Vector3(diff.x, diff.y, 0).applyMatrix3(LEFT_MAT);
        const lci = positionToCellIndex(cellIndexToPosition(state.cellIndex).add(leftDiff));
        if (!lci) throw Error('left out of bounds');
        return this.tableCells.has(lci);
    }

    frontCellInTable(state: PixelBilliardState): boolean {
        const diff = diffForDirection(state.direction);
        const fci = positionToCellIndex(cellIndexToPosition(state.cellIndex).add(diff));
        if (!fci) throw Error('left out of bounds');
        return this.tableCells.has(fci);
    }

    rightCellInTable(state: PixelBilliardState): boolean {
        const diff = diffForDirection(state.direction);
        const rightDiff = new Vector3(diff.x, diff.y, 0).applyMatrix3(RIGHT_MAT);
        const rci = positionToCellIndex(cellIndexToPosition(state.cellIndex).add(rightDiff));
        if (!rci) throw Error('right out of bounds');
        return this.tableCells.has(rci);
    }

    override mousedown(e: MouseEvent) {
        const cellIndex = this.mouseCellIndex(e);
        if (cellIndex === undefined) return;

        if (this.keyHeld('AltLeft')) {
            this.dragState = DragState.WALL;
            if (this.tableCells.has(cellIndex)) {
                this.tableCells.delete(cellIndex);
                this.orbitCells.clear();
                this.orbitStates = [];
                this.dirty = true;
            }
        } else {
            this.dragState = DragState.TABLE;
            if (!this.tableCells.has(cellIndex)) {
                this.tableCells.add(cellIndex);
                this.orbitCells.clear();
                this.orbitStates = [];
                this.dirty = true;
            }
        }
    }

    override mousemove(e: MouseEvent) {
        const cellIndex = this.mouseCellIndex(e);
        if (cellIndex === undefined) return;

        if (this.dragState === DragState.NOT_DRAGGING) {
            this.computeOrbitFromMouseEvent(e)
            return;
        }
        if (this.keyHeld('AltLeft')) {
            this.dragState = DragState.WALL;
            if (this.tableCells.has(cellIndex)) {
                this.tableCells.delete(cellIndex);
                this.orbitCells.clear();
                this.orbitStates = [];
                this.dirty = true;
            }
        } else {
            this.dragState = DragState.TABLE;
            if (!this.tableCells.has(cellIndex)) {
                this.tableCells.add(cellIndex);
                this.orbitCells.clear();
                this.orbitStates = [];
                this.dirty = true;
            }
        }
    }

    override mouseup(e: MouseEvent) {
        this.dragState = DragState.NOT_DRAGGING;
        this.computeOrbitFromMouseEvent(e)
    }

    validateTable() {
    }

    setRectangleTable() {

    }

    setLTable() {

    }
}

function stepForward(state: PixelBilliardState): PixelBilliardState {
    const newCI = positionToCellIndex(cellIndexToPosition(state.cellIndex).add(diffForDirection(state.direction)));
    if (!newCI) throw Error('out of bounds');
    return {cellIndex: newCI, direction: state.direction};
}

function statesDiffer(s1: PixelBilliardState, s2: PixelBilliardState): boolean {
    return s1.cellIndex !== s2.cellIndex || s1.direction !== s2.direction;
}

function positionToCellIndex(pos: Vector2): number | undefined {
    if (pos.x < LEFT || pos.x > RIGHT || pos.y < BOTTOM || pos.y > TOP) return undefined;
    const col = Math.floor(
        (pos.x - LEFT) / (RIGHT - LEFT) * GRID_COLS
    );
    const row = Math.floor(
        (pos.y - BOTTOM) / (TOP - BOTTOM) * GRID_ROWS
    );
    return row * GRID_COLS + col;
}

function cellIndexToPosition(index: number): Vector2 {
    const [row, col] = cellIndexToRowCol(index);
    const y = (row - GRID_COLS / 2) * CELL_SIZE + 0.5 * CELL_SIZE;
    const x = (col - GRID_ROWS / 2) * CELL_SIZE + 0.5 * CELL_SIZE;
    return new Vector2(x, y);
}

function cellIndexToRowCol(index: number): number[] {
    const row = Math.floor(index / GRID_ROWS);
    const col = index % GRID_ROWS;
    return [row, col];
}