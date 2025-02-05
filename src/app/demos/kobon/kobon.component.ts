import {Component, OnDestroy} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import Stats from "three/examples/jsm/libs/stats.module.js"
import {
    BufferAttribute,
    BufferGeometry,
    DoubleSide,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    Vector2
} from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "dat.gui";
import {CommonModule} from "@angular/common";
import {Line} from "../../../math/geometry/line";
import {AffineCircle} from "../../../math/geometry/affine-circle";
import {Complex} from "../../../math/complex";
import {randFloat} from "three/src/math/MathUtils.js";

// Colors
const CLEAR_COLOR = 0x0a2933;
// const FILL_COLOR = 0xf9f4e9;
// const CHORDS_COLOR = 0x000000;
// const OUTER_ORBIT_COLOR = 0x3adecb;
// const SINGULARITY_COLOR = 0xff7f5e;
// const START_POINT_COLOR = 0x51e76f;
// const END_POINT_COLOR = 0x6f51e7;
// const SCAFFOLD_COLOR = 0xffbbff;
// const HANDLE_COLOR = 0x990044;
// const CIRCLE_CENTER_COLOR = 0xf5dd90;

interface Intersection {
    vi: number;
    l1: number;
    l2: number;
}

interface Segment {
    i1: Intersection;
    i2: Intersection;
    l: number;
}

interface SegmentV {
    v1: number;
    v2: number;
}

interface ITriangle {
    vi1: number;
    vi2: number;
    vi3: number;
    i: number;
    j: number;
    k: number;
}

interface VTriangle {
    v1: Vector2;
    v2: Vector2;
    v3: Vector2;
}

interface TriangleBundle {
    vertices: Vector2[];
    iTriangles: ITriangle[];
    vTriangles: VTriangle[];
}

@Component({
    selector: 'kobon',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class KobonComponent extends ThreeDemoComponent implements OnDestroy {
    orbitControls: OrbitControls;
    // dragControls: DragControls;
    // dragging = false;

    private lines: Line[] = [];
    private triangles: VTriangle[] = [];
    private triangle: Mesh | undefined = undefined;
    // private intersections: InstancedMesh | undefined;
    private trianglesDirty = true;

    params = {
        n: 3
    }

    private bestTriangleCount = 0;

    private gui: dat.GUI;

    private panel: Stats.Panel;

    constructor() {
        super();
        this.useOrthographic = true;
        this.updateOrthographicCamera();
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;
        this.orbitControls.enablePan = true;
        this.orbitControls.zoomToCursor = true;

        // this.dragControls = new DragControls(this.vertices, this.camera, this.renderer.domElement);
        // this.dragControls.addEventListener('dragstart', this.vertexDragStart.bind(this));
        // this.dragControls.addEventListener('drag', this.vertexDrag.bind(this));
        // this.dragControls.addEventListener('dragend', this.vertexDragEnd.bind(this));

        this.renderer.setClearColor(CLEAR_COLOR);

        this.gui = new dat.GUI();
        this.updateGUI();

        this.panel = new Stats.Panel('Searches', 'bbbbbb', '666666');

        this.stats.addPanel(this.panel);

        this.helpTitle = 'Kobon Triangle Problem';

        this.lines = generateLines(this.params.n);
        const {iTriangles, vTriangles, vertices} = findTriangles(this.lines);
        console.log(iTriangles, vTriangles, vertices);
        this.triangles = vTriangles;
        this.bestTriangleCount = this.triangles.length;
        console.log(this.params.n, this.bestTriangleCount, this.lines.map(l => `${l.a}x + ${l.b}y + ${l.c} = 0`));
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    override frame(dt: number) {
        this.processKeyboardInput(dt);

        const start = Date.now();

        let i = 0;
        do {
            i++;
            const lines = generateLines(this.params.n);
            const {
                iTriangles,
                vTriangles,
                vertices,
            } = findTriangles(lines);

            if (vTriangles.length > this.bestTriangleCount) {
                this.lines = lines;
                this.triangles = vTriangles;
                this.bestTriangleCount = vTriangles.length;
                console.log(this.params.n, this.bestTriangleCount, this.lines.map(l => `${l.a}x + ${l.b}y + ${l.c} = 0`));
            }
        } while (Date.now() - start < 16);

        const searchesPerSecond = 1000 * i / (Date.now() - start);

        this.panel.update(searchesPerSecond, searchesPerSecond);

        this.updateDraw();
    }

    reset() {
        this.lines = [];
        this.triangles = [];
        this.triangle = undefined;
        this.bestTriangleCount = 0;
    }

    processKeyboardInput(_: number) {
        this.showHelp = !!this.keysPressed.get('KeyH');
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();
        this.gui.add(this.params, 'n', 3, 20, 1).onChange(this.reset.bind(this));

        this.gui.open();
    }

    updateDraw() {
        this.scene.clear();

        const data: number[] = [];
        for (let t of this.triangles) {
            data.push(t.v1.x, t.v1.y, 0);
            data.push(t.v2.x, t.v2.y, 0);
            data.push(t.v3.x, t.v3.y, 0);
        }
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(data), 3));
        this.triangle = new Mesh(geometry, new MeshBasicMaterial({color: 0x888888, side: DoubleSide}));
        this.scene.add(this.triangle);

        let ls = [];
        let c = new AffineCircle(Complex.fromVector2(new Vector2(this.camera.position.x, this.camera.position.y)), 10 / this.camera.zoom);
        for (let l of this.lines) {
            let intersections = c.intersectLine(l);
            if (intersections.length === 2) {
                ls.push(intersections[0].toVector2(), intersections[1].toVector2());
            }
        }
        this.scene.add(new LineSegments(new BufferGeometry().setFromPoints(ls), new LineBasicMaterial({color: 0xffffff})));
    }
}

function stringify(v: Vector2): string {
    const precision: number = 5;
    return `${v.x.toPrecision(precision)}:${v.y.toPrecision(precision)}`;
}

function findTriangles(lines: Line[]): TriangleBundle {
    let lineIntersections: Intersection[][] = [];
    let lineVertexSets: Set<number>[] = [];
    for (let i = 0; i < lines.length; i++) {
        lineIntersections.push([]);
        lineVertexSets.push(new Set());
    }

    let vertexMap: Map<string, number> = new Map();
    let vertices: Vector2[] = [];

    let intersections: Intersection[] = [];

    for (let l1 = 0; l1 < lines.length - 1; l1++) {
        for (let l2 = l1 + 1; l2 < lines.length; l2++) {
            let v;
            try {
                v = lines[l1].intersectLine(lines[l2]).toVector2();
            } catch (_) {
                continue;
            }
            let key = stringify(v);
            let vi;
            if (vertexMap.has(key)) {
                vi = vertexMap.get(key);
                if (vi === undefined) {
                    throw new Error('Weird hashmap thing happened');
                }
            } else {
                vi = vertices.push(v) - 1;
                vertexMap.set(key, vi);
            }
            let intersection: Intersection = {vi, l1, l2};

            intersections.push(intersection);
            lineIntersections[l1].push(intersection);
            lineIntersections[l2].push(intersection);
            lineVertexSets[l1].add(vi);
            lineVertexSets[l2].add(vi);
        }
    }

    // let segments: Segment[] = [];
    let segments: SegmentV[] = [];
    let segmentSet = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
        let p = lines[i].project(new Complex()).toVector2();
        let dir = new Vector2(lines[i].b, -lines[i].a);
        lineIntersections[i].sort((a, b) =>
            dir.dot(vertices[a.vi].clone().sub(p)) - dir.dot(vertices[b.vi].clone().sub(p))
        );
        let lineVertices = Array.from(lineVertexSets[i].values()).sort((a, b) =>
            dir.dot(vertices[a].clone().sub(p)) - dir.dot(vertices[b].clone().sub(p))
        );

        // for (let j = 0; j < lineIntersections[i].length - 1; j++) {
        //     let i1 = lineIntersections[i][j];
        //     let i2 = lineIntersections[i][j + 1];
        //     if (i1.vi === i2.vi) continue;
        //     segments.push({
        //         i1: i1.vi > i2.vi ? i2 : i1,
        //         i2: i1.vi > i2.vi ? i1 : i2,
        //         l: i,
        //     });
        // }
        for (let j = 0; j < lineVertices.length - 1; j++) {
            let v1 = lineVertices[j];
            let v2 = lineVertices[j + 1];
            if (v1 === v2) {
                console.log("duplicate vertices?")
            }
            let segmentV = {v1: Math.min(v1, v2), v2: Math.max(v1, v2)};
            let key = `${segmentV.v1}:${segmentV.v2}`;
            if (!segmentSet.has(key)) {
                segments.push(segmentV);
                segmentSet.add(key);
            }
        }
    }

    // console.log(segments.map(s => `${s.i1.vi}:${s.i2.vi}`));

    let vertexSegments: number[][] = [];
    for (let i = 0; i < intersections.length; i++) {
        vertexSegments.push([]);
    }

    for (let i = 0; i < segments.length; i++) {
        let segment = segments[i];
        vertexSegments[segment.v1].push(i);
        vertexSegments[segment.v2].push(i);
    }

    // Now, find all the triangles!
    let iTriangles: ITriangle[] = findThreeCycles(segments, vertexSegments);

    const vTriangles = iTriangles.map((t) => {
        return {
            v1: vertices[t.vi1],
            v2: vertices[t.vi2],
            v3: vertices[t.vi3],
        };
    });

    return {vertices, iTriangles, vTriangles};
}

function findThreeCycles(segments: SegmentV[], vertexSegments: number[][]): ITriangle[] {
    let iTriangles = [];
    for (let i = 0; i < segments.length - 2; i++) {
        // look for higher-index segments at either endpoint
        let secondCandidates: number[] = []; // full of intersection indices
        let firstSegment = segments[i];
        let si = firstSegment.v1;
        let ei = firstSegment.v2;
        for (let j of vertexSegments[si]) {
            if (j > i) secondCandidates.push(j);
        }
        for (let j of vertexSegments[ei]) {
            if (j > i) secondCandidates.push(j);
        }

        for (let j of secondCandidates) {
            let secondSegment = segments[j];
            si = secondSegment.v1;
            ei = secondSegment.v2;
            let vi = si === firstSegment.v1 || si === firstSegment.v2 ? ei : si;
            for (let k of vertexSegments[vi]) {
                if (k <= j) continue;
                let thirdSegment = segments[k];
                if (thirdSegment.v1 === firstSegment.v1 ||
                    thirdSegment.v1 === firstSegment.v2) {
                    let vi1 = firstSegment.v1;
                    let vi2 = firstSegment.v2;
                    let vi3 = thirdSegment.v2;
                    iTriangles.push({vi1, vi2, vi3, i, j, k});
                } else if (thirdSegment.v2 === firstSegment.v1 ||
                    thirdSegment.v2 === firstSegment.v2) {
                    let vi1 = firstSegment.v1;
                    let vi2 = firstSegment.v2;
                    let vi3 = thirdSegment.v1;
                    iTriangles.push({vi1, vi2, vi3, i, j, k});
                }
            }
        }
    }

    return iTriangles;
}

function generateLines(n: number): Line[] {
    const lines = [];
    for (let i = 0; i < n; i++) {
        lines.push(Line.throughTwoPoints(
            Complex.polar(randFloat(0, 2), randFloat(0, 2 * Math.PI)),
            Complex.polar(randFloat(0, 2), randFloat(0, 2 * Math.PI)),
        ));
    }
    return lines;
}