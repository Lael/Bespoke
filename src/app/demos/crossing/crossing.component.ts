import {Component, OnDestroy} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {
    BufferGeometry,
    Color,
    InstancedMesh,
    LineBasicMaterial,
    LineSegments,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    SphereGeometry,
    Vector2
} from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {DragControls} from "three/examples/jsm/controls/DragControls.js";
import * as dat from "dat.gui";
import {LineSegment} from "../../../math/geometry/line-segment";
import {CommonModule} from "@angular/common";

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

interface Vertex {
    color: Color,
    position: Vector2,
}

interface Edge {
    startIndex: number,
    endIndex: number,
    // intermediateNodes: Vector2[],
}

class Graph {
    n: number;
    vertices: Vertex[];
    edges: Edge[];

    constructor(vertices: Vertex[], edges: Edge[]) {
        this.n = vertices.length;
        this.vertices = vertices;
        this.edges = edges;
        if (this.n === 0) {
            throw Error('Empty graph');
        }
        for (let e of edges) {
            if (e.startIndex < 0 || e.startIndex >= this.n || e.endIndex < 0 || e.endIndex >= this.n || e.startIndex === e.endIndex) {
                throw Error('Bad edge indexing');
            }
        }
    }

    static complete(n: number): Graph {
        let vertices = [];
        const dt = 2 * Math.PI / n;
        for (let i = 0; i < n; i++) {
            vertices.push({
                color: new Color(1, 1, 1),
                position: new Vector2(Math.cos(i * dt), Math.sin(i * dt))
            });
        }
        let edges = [];
        for (let i = 0; i < n - 1; i++) {
            for (let j = i + 1; j < n; j++) {
                edges.push({startIndex: i, endIndex: j});
            }
        }
        return new Graph(vertices, edges);
    }

    static completeBipartite(m: number, n: number): Graph {
        let vertices = [];
        const dx = m === 0 ? 0 : 2 / m;
        let mOffset = -dx / 2 * (m % 2 == 0 ? (m - 1) : (m - 2));
        for (let i = 0; i < m; i++) {
            // let ci = i >= m / 2 ? i + 1 : i;
            vertices.push({
                color: new Color(1, 0.7, 0.7),
                position: new Vector2(mOffset + i * dx, 0)
            });
        }
        const dy = n === 0 ? 0 : 2 / n;
        let nOffset = -dy / 2 * (n % 2 == 0 ? (n - 1) : (n - 2));
        for (let i = 0; i < n; i++) {
            // let ci = i >= n / 2 ? i + 1 : i;
            vertices.push({
                color: new Color(0.7, 0.7, 1),
                position: new Vector2(0, nOffset + i * dy)
            });
        }
        let edges = [];
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                edges.push({startIndex: i, endIndex: m + j});
            }
        }
        return new Graph(vertices, edges);
    }
}

@Component({
    selector: 'crossing',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class CrossingComponent extends ThreeDemoComponent implements OnDestroy {

    orbitControls: OrbitControls;
    dragControls: DragControls;
    vertices: Object3D[] = [];
    dragging = false;

    private graph: Graph;
    private intersections: InstancedMesh | undefined;
    private drawDirty = true;

    private params = {
        bipartite: true,
        complete: false,
        m: 5,
        n: 7,
    }

    private gui: dat.GUI;

    constructor() {
        super();
        this.useOrthographic = true;
        this.updateOrthographicCamera();
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;
        this.orbitControls.enablePan = true;

        this.graph = Graph.completeBipartite(4, 5);
        this.updateVertices();
        this.updateIntersections();

        this.dragControls = new DragControls(this.vertices, this.camera, this.renderer.domElement);
        this.dragControls.addEventListener('dragstart', this.vertexDragStart.bind(this));
        this.dragControls.addEventListener('drag', this.vertexDrag.bind(this));
        this.dragControls.addEventListener('dragend', this.vertexDragEnd.bind(this));


        this.renderer.setClearColor(CLEAR_COLOR);

        this.gui = new dat.GUI();
        this.updateGUI();

        this.helpTitle = 'Crossing Numbers';
    }


    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    override frame(dt: number) {
        this.processKeyboardInput(dt);
        let z = Math.min(1, 1 / this.camera.zoom);
        for (let d of this.vertices) {
            d.scale.set(z, z, z);
        }
        if (this.drawDirty) this.updateDraw();
    }

    processKeyboardInput(_: number) {
        this.showHelp = !!this.keysPressed.get('KeyH');
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();

        this.gui.add(this.params, 'complete').name('Complete').onFinishChange(() => {
            this.params.bipartite = !this.params.complete;
            this.updateGUI();
            this.updateGraph();
        });
        this.gui.add(this.params, 'bipartite').name('Bipartite').onFinishChange(() => {
            this.params.complete = !this.params.bipartite;
            this.updateGUI();
            this.updateGraph();
        });
        if (this.params.bipartite) {
            this.gui.add(this.params, 'm').min(1).max(30).step(1).onFinishChange(() => {
                this.updateGraph();
            });
        }
        this.gui.add(this.params, 'n').min(1).max(30).step(1).onFinishChange(() => {
            this.updateGraph();
        });

        this.gui.open();
    }

    markDrawDirty() {
        this.drawDirty = true;
    }

    updateVertices() {
        while (this.vertices.length > 0) {
            this.vertices.pop();
        }
        for (let i = 0; i < this.graph.vertices.length; i++) {
            let c = this.graph.vertices[i].color;
            let p = this.graph.vertices[i].position;
            this.vertices.push(new Mesh(new SphereGeometry(0.025), new MeshBasicMaterial({color: c})));
            this.vertices[i].position.set(p.x, p.y, 0);
        }
        this.markDrawDirty();
    }

    updateGraph() {
        if (this.params.complete) {
            this.graph = Graph.complete(this.params.n);
        } else if (this.params.bipartite) {
            this.graph = Graph.completeBipartite(this.params.m, this.params.n);
        }
        this.updateIntersections();
        this.updateVertices();
    }

    updateDraw() {
        this.drawDirty = false;

        this.scene.clear();
        let ls = [];
        for (let e of this.graph.edges) {
            ls.push(
                this.graph.vertices[e.startIndex].position,
                this.graph.vertices[e.endIndex].position
            );
        }
        this.scene.add(new LineSegments(new BufferGeometry().setFromPoints(ls), new LineBasicMaterial({color: 0xffffff})));
        this.scene.add(...this.vertices);
        if (this.intersections && !this.dragging) this.scene.add(this.intersections);
    }

    vertexDragStart() {
        this.dragging = true;
    }

    vertexDrag() {
        this.updateEmbedding();
    }

    vertexDragEnd() {
        this.dragging = false;
        this.updateEmbedding();
    }

    updateEmbedding() {
        for (let i = 0; i < this.vertices.length; i++) {
            let p = this.vertices[i].position;
            this.graph.vertices[i].position = new Vector2(p.x, p.y);
        }
        if (!this.dragging) this.updateIntersections();
        this.markDrawDirty();
    }

    updateIntersections() {
        let segments = [];
        for (let edge of this.graph.edges) {
            segments.push(new LineSegment(this.graph.vertices[edge.startIndex].position,
                this.graph.vertices[edge.endIndex].position));
        }
        let e = segments.length;
        let intersections = [];
        for (let i = 0; i < e - 1; i++) {
            for (let j = i + 1; j < e; j++) {
                let ints = segments[i].intersect(segments[j]);
                if (ints.length === 1) intersections.push(ints[0]);
            }
        }

        this.intersections = new InstancedMesh(
            new SphereGeometry(0.00125),
            new MeshBasicMaterial({color: 0xbb0000}),
            intersections.length
        );

        for (let i = 0; i < intersections.length; i++) {
            let t = intersections[i];
            this.intersections.setMatrixAt(i, new Matrix4().makeTranslation(t.x, t.y, 0));
        }
        this.intersections.instanceMatrix.needsUpdate = true;
    }
}