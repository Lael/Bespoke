import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
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
    Vector3,
    Vector4
} from "three";
import {GUI} from "dat.gui";

const GRID_ROWS = 102;
const GRID_COLS = 102;
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

const DEDUPE_SCAN = true;

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
    SOUTHEAST,
}

enum TablePattern {
    RECTANGLE = "Rectangle",
    ELL = "Ell",
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
    imports: [CommonModule]
})
export class PixelComponent extends ThreeDemoComponent {
    orbitControls: OrbitControls;

    tableCells: Set<number> = new Set<number>();
    orbitCells: Set<number> = new Set<number>();
    grid: InstancedMesh;
    gridBorder: LineSegments;

    tableChanged = true;
    dirty = true;
    dragState: DragState = DragState.NOT_DRAGGING;

    orbitStates: PixelBilliardState[] = [];

    gui: GUI = new GUI();
    tablePattern: TablePattern = TablePattern.ELL;
    ellParams = new Vector4(6, 6, 3, 3);
    rectParams = new Vector2(5, 5);

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

        const max = 20;
        let s = '';
        let l = '';
        for (let i = 2; i <= max; i++) {
            for (let j = 2; j <= i; j++) {
                this.setEllTable(i, i, j, j);
                let scan = this.scan();
                s += `\t[${scan}]`;
                l += `\t${scan.length}`;
            }
            s += '\n';
            l += '\n';
        }
        console.log(s);
        console.log(l);

        this.setTableFromPattern();

        this.updateGUI();
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new GUI();
        this.gui.open();

        const tableFolder = this.gui.addFolder('Table');
        tableFolder.add(this, 'tablePattern', Object.values(TablePattern)).onFinishChange(() => {
            this.setTableFromPattern();
            this.updateGUI();
        });
        switch (this.tablePattern) {
        case TablePattern.RECTANGLE:
            tableFolder.add(this.rectParams, 'x').min(1).max(100).step(1)
                .name('Width').onChange(this.setTableFromPattern.bind(this));
            tableFolder.add(this.rectParams, 'y').min(1).max(100).step(1)
                .name('Height').onChange(this.setTableFromPattern.bind(this));
            break;
        case TablePattern.ELL:
            tableFolder.add(this.ellParams, 'x').min(this.ellParams.w).max(100).step(1)
                .name('Width')
                .onChange(this.setTableFromPattern.bind(this))
                .onFinishChange(this.updateGUI.bind(this));
            tableFolder.add(this.ellParams, 'y').min(this.ellParams.z).max(100).step(1)
                .name('Height')
                .onChange(this.setTableFromPattern.bind(this))
                .onFinishChange(this.updateGUI.bind(this));
            tableFolder.add(this.ellParams, 'z').min(1).max(this.ellParams.y).step(1)
                .name('Thickness (h)')
                .onChange(this.setTableFromPattern.bind(this))
                .onFinishChange(this.updateGUI.bind(this));
            tableFolder.add(this.ellParams, 'w').min(1).max(this.ellParams.x).step(1)
                .name('Thickness (v)')
                .onChange(this.setTableFromPattern.bind(this))
                .onFinishChange(this.updateGUI.bind(this));
            break;
        }

        tableFolder.open();
    }

    setTableFromPattern() {
        switch (this.tablePattern) {
        case TablePattern.RECTANGLE:
            this.setRectangleTable(this.rectParams.x, this.rectParams.y);
            break;
        case TablePattern.ELL:
            this.setEllTable(this.ellParams.x, this.ellParams.y, this.ellParams.z, this.ellParams.w);
            break;
        }
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    scan(): number[] {
        const orbits = [];
        const representatives = new Set<string>;
        const states = new Set<string>();
        for (let index of this.tableCells) {
            states.add(JSON.stringify({cellIndex: index, direction: PixelDirection.SOUTHWEST}));
            states.add(JSON.stringify({cellIndex: index, direction: PixelDirection.SOUTHEAST}));
            states.add(JSON.stringify({cellIndex: index, direction: PixelDirection.NORTHEAST}));
            states.add(JSON.stringify({cellIndex: index, direction: PixelDirection.NORTHWEST}));
        }

        while (states.size > 0) {
            let start;

            // I know, I know.
            for (const v of states) {
                start = JSON.parse(v) as PixelBilliardState;
                states.delete(v);
                break;
            }

            if (!start) throw Error('start undefined');

            const bounces = [];
            const orbitStates = [start];
            const orbitSet = new Set();
            let current = start;
            let safety = this.tableCells.size * 4;
            let i = 0;
            while (!orbitSet.has(JSON.stringify(current)) && safety > 0) {
                i++;
                safety--;
                orbitStates.push(current);
                orbitSet.add(JSON.stringify(current));
                const next = this.nextState(current);
                if (current.direction !== next.direction) {
                    bounces.push(i);
                }
                current = next;
                states.delete(JSON.stringify(current));
            }
            if (safety === 0) console.log('timeout!');
            // Find out which is the start of the loop
            const index = orbitStates.findIndex((v) => {
                return !statesDiffer(v, current);
            });
            const orbit = orbitStates.slice(index);
            // Choose a representative of the loop.

            let rep;
            if (DEDUPE_SCAN) {
                rep = {cellIndex: orbit[0].cellIndex, direction: orbit[0].direction % 2};
            } else {
                rep = {...orbit[0]};
            }
            for (let s of orbit) {
                if (DEDUPE_SCAN) {
                    if ((s.cellIndex === rep.cellIndex && s.direction % 2 < rep.direction % 2) || s.cellIndex < rep.cellIndex) {
                        rep = {cellIndex: s.cellIndex, direction: s.direction % 2};
                    }
                } else {
                    if ((s.cellIndex === rep.cellIndex && s.direction < rep.direction) || s.cellIndex < rep.cellIndex) {
                        rep = {...s};
                    }
                }
            }
            let bounceCount = 0;
            for (let bi of bounces) {
                if (bi >= index) bounceCount++;
            }

            const s = JSON.stringify(rep);
            if (!representatives.has(s)) {
                representatives.add(s);
                orbits.push(bounceCount);
            }
        }
        orbits.sort((a, b) => a - b);
        return orbits;
    }

    frame(dt: number): void {
        if (this.tableChanged) {
            this.tableChanged = false;
            console.log(this.scan());
            this.dirty = true;
        }
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

    nextState(state: PixelBilliardState): PixelBilliardState {
        if (!this.tableCells.has(state.cellIndex)) throw Error('outside the table');
        const l = this.leftCellInTable(state);
        const f = this.frontCellInTable(state);
        const r = this.rightCellInTable(state);
        let newState = {...state};
        if (f && l && r) {
            newState = stepForward(state);
        } else if (l === r) {
            newState.direction = invertDirection(state.direction);
        } else if (l && !r) {
            newState.direction = leftDirection(state.direction);
        } else if (r && !l) {
            newState.direction = rightDirection(state.direction);
        } else {
            throw Error(`what? ${l}, ${f}, ${r}`);
        }
        return newState;
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
            currentState = this.nextState(currentState);
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
                this.tableChanged = true;
            }
        } else {
            this.dragState = DragState.TABLE;
            if (!this.tableCells.has(cellIndex)) {
                this.tableCells.add(cellIndex);
                this.orbitCells.clear();
                this.orbitStates = [];
                this.tableChanged = true;
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
                this.tableChanged = true;
            }
        } else {
            this.dragState = DragState.TABLE;
            if (!this.tableCells.has(cellIndex)) {
                this.tableCells.add(cellIndex);
                this.orbitCells.clear();
                this.orbitStates = [];
                this.tableChanged = true;
            }
        }
    }

    override mouseup(e: MouseEvent) {
        this.dragState = DragState.NOT_DRAGGING;
        this.computeOrbitFromMouseEvent(e)
    }

    validateTable() {
    }

    setRectangleTable(w: number, h: number) {
        if (w <= 0 || h <= 0) throw Error('negative inputs');
        this.tableChanged = true;
        this.tableCells.clear();
        const lx = (GRID_COLS - GRID_COLS % 2) / 2 - (w - w % 2) / 2;
        const ly = (GRID_ROWS - GRID_ROWS % 2) / 2 - (h - h % 2) / 2;
        for (let i = lx; i < lx + w; i++) {
            for (let j = ly; j < ly + h; j++) {
                const index = rowColToCellIndex(j, i);
                if (index === undefined) console.error('bad index');
                else this.tableCells.add(index);
            }
        }
    }

    setEllTable(w: number, h: number, ht: number, vt: number) {
        if (w <= 0 || h <= 0 || ht <= 0 || vt <= 0) throw Error('negative inputs');
        if (ht > h || vt > w) throw Error('bad L');
        this.tableCells.clear();
        this.tableChanged = true;
        const lx = (GRID_COLS - GRID_COLS % 2) / 2 - (w - w % 2) / 2;
        const ly = (GRID_ROWS - GRID_ROWS % 2) / 2 - (h - h % 2) / 2;
        for (let i = lx; i < lx + vt; i++) {
            for (let j = ly; j < ly + h; j++) {
                const index = rowColToCellIndex(j, i);
                if (index === undefined) console.error('bad index');
                else this.tableCells.add(index);
            }
        }
        for (let i = lx; i < lx + w; i++) {
            for (let j = ly; j < ly + ht; j++) {
                const index = rowColToCellIndex(j, i);
                if (index === undefined) console.error('bad index');
                else this.tableCells.add(index);
            }
        }
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

function rowColToCellIndex(row: number, col: number): number | undefined {
    if (row < 0 || row >= GRID_ROWS) return undefined;
    if (col < 0 || col >= GRID_COLS) return undefined;
    return row * GRID_COLS + col;
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
    const row = Math.floor(index / GRID_COLS);
    const col = index % GRID_COLS;
    return [row, col];
}