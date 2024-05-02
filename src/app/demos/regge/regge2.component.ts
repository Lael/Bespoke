import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {
    Color,
    CylinderGeometry,
    InstancedMesh,
    Matrix4,
    MeshBasicMaterial,
    SphereGeometry,
    Vector2,
    Vector3
} from "three";
import {clamp} from "three/src/math/MathUtils";
import {Component} from "@angular/core";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {CommonModule} from "@angular/common";

const CLEAR_COLOR = 0x0a2933;
const Z_EPSILON = 0.01;

const SPRING_CONSTANT = 100;
const DAMPING_FORCE = 1;

const MAX_LOG = 2;

const VERTEX_RADIUS = 0.03;
const EDGE_RADIUS = 0.01;
const EDGE_SEGMENTS = 32;

const COMPRESSION_COLOR = new Color().setRGB(1, 0, 0);
const TENSION_COLOR = new Color().setRGB(0, 0, 1);
const REST_COLOR = new Color().setRGB(0.5, 0.5, 0.5);

class Regge2Vertex {
    position: Vector3;
    velocity: Vector3;

    constructor(position: Vector3, velocity: Vector3 = new Vector3()) {
        this.position = position;
        this.velocity = velocity;
    }
}

class Regge2Edge {
    fraction = 1;

    constructor(readonly index1: number, readonly index2: number, readonly desiredLength: number) {
    }

}

class Regge2Graph {
    constructor(readonly vertices: Regge2Vertex[], readonly edges: Regge2Edge[]) {
        this.update(0);
    }

    update(dt: number) {
        const forces = [];
        for (let i = 0; i < this.vertices.length; i++) {
            forces.push(new Vector3());
        }
        // Add up forces
        for (let e of this.edges) {
            const v1 = this.vertices[e.index1].position;
            const v2 = this.vertices[e.index2].position;
            const currentLength = v1.distanceTo(v2);
            const displacement = currentLength - e.desiredLength;
            const vectorDirection = v2.clone().sub(v1).normalize();
            const force12 = vectorDirection.clone().multiplyScalar(displacement * SPRING_CONSTANT);
            const force21 = vectorDirection.clone().multiplyScalar(-displacement * SPRING_CONSTANT);
            forces[e.index1].add(force12);
            forces[e.index2].add(force21);
        }

        // Apply forces
        for (let i = 0; i < this.vertices.length; i++) {
            const dv = forces[i].multiplyScalar(dt);
            this.vertices[i].velocity.add(dv);
            const dx = this.vertices[i].velocity.multiplyScalar(dt);
            this.vertices[i].position.add(dx);
            this.vertices[i].velocity.multiplyScalar(Math.exp(-dt * DAMPING_FORCE));
        }

        // Update fractions
        for (let e of this.edges) {
            const v1 = this.vertices[e.index1].position;
            const v2 = this.vertices[e.index2].position;
            const currentLength = v1.distanceTo(v2);
            e.fraction = currentLength / e.desiredLength;
        }
    }

    get n(): number {
        return this.vertices.length;
    }

    get e(): number {
        return this.edges.length;
    }
}

@Component({
    selector: 'regge2',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class Regge2Component extends ThreeDemoComponent {

    orbitControls: OrbitControls;

    graph: Regge2Graph = tetrahedronGraph();
    running = false;
    graphDirty = true;
    drawDirty = true;

    vertexMesh!: InstancedMesh;
    edgeMesh!: InstancedMesh;

    constructor() {
        super();
        this.useOrthographic = false;
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableRotate = true;
        this.orbitControls.enablePan = false;

        this.renderer.setClearColor(CLEAR_COLOR);
    }

    rebuildMeshes() {
        this.graphDirty = false;
        this.scene.clear();
        const vertexGeometry = new SphereGeometry(VERTEX_RADIUS);
        const vertexMaterial = new MeshBasicMaterial();
        const edgeGeometry = new CylinderGeometry(EDGE_RADIUS, EDGE_RADIUS, 1, EDGE_SEGMENTS);
        const edgeMaterial = new MeshBasicMaterial();
        this.vertexMesh = new InstancedMesh(vertexGeometry, vertexMaterial, this.n);
        this.edgeMesh = new InstancedMesh(edgeGeometry, edgeMaterial, this.e);
        this.scene.add(this.vertexMesh, this.edgeMesh);
        this.drawDirty = true;
    }

    frame(dt: number): void {
        this.processKeyboardInput();
        if (this.graphDirty) {
            this.rebuildMeshes();
        }
        if (this.running) {
            this.update(dt);
        }
        if (this.drawDirty) {
            this.drawGraph();
        }
    }

    processKeyboardInput() {
        this.running = this.keyHeld('Space');
        if (this.keyHeld('KeyT')) {
            this.graph = tetrahedronGraph();
            this.graphDirty = true;
        }
        if (this.keyHeld('KeyI')) {
            this.graph = icosahedronGraph();
            this.graphDirty = true;
        }
        if (this.keyHeld('KeyP')) {
            this.graph = paraboloidGraph();
            this.graphDirty = true;
        }
    }

    update(dt: number): void {
        this.graph.update(dt);
        this.drawDirty = true;
    }

    drawGraph(): void {
        this.drawDirty = false;
        for (let i = 0; i < this.n; i++) {
            this.vertexMesh.setMatrixAt(i, new Matrix4().setPosition(this.graph.vertices[i].position));
        }
        this.vertexMesh.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < this.e; i++) {
            const edge = this.graph.edges[i];
            const p1 = this.graph.vertices[edge.index1].position;
            const p2 = this.graph.vertices[edge.index2].position;
            this.edgeMesh.setMatrixAt(i, cylinderMatrix(p1, p2));
            this.edgeMesh.setColorAt(i, cylinderColor(edge.fraction));
        }
        this.edgeMesh.instanceMatrix.needsUpdate = true;
        if (this.edgeMesh.instanceColor) this.edgeMesh.instanceColor.needsUpdate = true;
        else console.log('no instanceColor on edgeMesh');
    }

    get n(): number {
        return this.graph.n;
    }

    get e(): number {
        return this.graph.e;
    }
}

export function cylinderMatrix(p1: Vector3, p2: Vector3): Matrix4 {
    const s = new Matrix4().makeScale(1, 1, p1.distanceTo(p2));
    const c = p1.clone().add(p2).multiplyScalar(0.5);
    const t = new Matrix4().makeTranslation(c.x, c.y, c.z);
    const dv = p2.clone().sub(p1).normalize();
    const phi = Math.acos(dv.z);
    let theta = 0;
    if (new Vector2(dv.x, dv.y).length() !== 0) {
        theta = Math.atan2(dv.y, dv.x);
    }
    const r = new Matrix4().makeRotationY(phi).premultiply(new Matrix4().makeRotationZ(theta));
    const x2z = new Matrix4().makeRotationX(Math.PI / 2);
    return x2z.premultiply(s)
        .premultiply(r)
        .premultiply(t);
}

function cylinderColor(fraction: number): Color {
    let lf = clamp(Math.log(fraction), -MAX_LOG, MAX_LOG);
    const a = Math.pow(Math.abs(lf) / MAX_LOG, 0.5);
    if (lf < 0) return new Color().lerpColors(REST_COLOR, COMPRESSION_COLOR, a);
    else return new Color().lerpColors(REST_COLOR, TENSION_COLOR, a);
}

function tetrahedronGraph(): Regge2Graph {
    const dt = Math.PI * 2 / 3;
    const offset = Math.PI / 2;
    const vertices = [];
    vertices.push(new Regge2Vertex(new Vector3(0, 0, Z_EPSILON)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(offset), Math.sin(offset), 0)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(dt + offset), Math.sin(dt + offset), 0)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(2 * dt + offset), Math.sin(2 * dt + offset), 0)));
    const edges = [];
    edges.push(new Regge2Edge(0, 1, 1));
    edges.push(new Regge2Edge(0, 2, 1));
    edges.push(new Regge2Edge(0, 3, 1));
    edges.push(new Regge2Edge(1, 2, 1));
    edges.push(new Regge2Edge(1, 3, 1));
    edges.push(new Regge2Edge(2, 3, 1));
    return new Regge2Graph(vertices, edges);
}

function octahedronGraph(): Regge2Graph {
    const dt = Math.PI * 2 / 3;
    const offset = Math.PI / 2;
    const vertices = [];
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(offset), Math.sin(offset), Z_EPSILON)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(dt + offset), Math.sin(dt + offset), Z_EPSILON)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(2 * dt + offset), Math.sin(2 * dt + offset), Z_EPSILON)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(-offset), Math.sin(-offset), 0).multiplyScalar(3)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(dt - offset), Math.sin(dt - offset), 0).multiplyScalar(3)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(2 * dt - offset), Math.sin(2 * dt - offset), 0).multiplyScalar(3)));
    const edges = [];
    edges.push(new Regge2Edge(0, 1, 2));
    edges.push(new Regge2Edge(1, 2, 2));
    edges.push(new Regge2Edge(2, 0, 2));
    edges.push(new Regge2Edge(3, 4, 2));
    edges.push(new Regge2Edge(4, 5, 2));
    edges.push(new Regge2Edge(5, 3, 2));
    edges.push(new Regge2Edge(0, 4, 2));
    edges.push(new Regge2Edge(0, 5, 2));
    edges.push(new Regge2Edge(1, 3, 2));
    edges.push(new Regge2Edge(1, 5, 2));
    edges.push(new Regge2Edge(2, 3, 2));
    edges.push(new Regge2Edge(2, 4, 2));
    return new Regge2Graph(vertices, edges);
}

function icosahedronGraph() {
    const dt = Math.PI / 3;
    const offset = -Math.PI / 2;
    const innerRadius = 0.5;
    const midRadius = 1.5;
    const outerRadius = 4;
    const restLength = 2;

    const innerEps = 100 * Z_EPSILON;
    const midEps = Z_EPSILON;
    const outerEps = -10 * Z_EPSILON;

    const vertices = [];
    // inner
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(offset), Math.sin(offset), innerEps).multiplyScalar(innerRadius)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(2 * dt + offset), Math.sin(2 * dt + offset), innerEps).multiplyScalar(innerRadius)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(4 * dt + offset), Math.sin(4 * dt + offset), innerEps).multiplyScalar(innerRadius)));

    // mid
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(offset), Math.sin(offset), -midEps).multiplyScalar(midRadius)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(dt + offset), Math.sin(dt + offset), midEps).multiplyScalar(midRadius)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(2 * dt + offset), Math.sin(2 * dt + offset), -midEps).multiplyScalar(midRadius)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(3 * dt + offset), Math.sin(3 * dt + offset), midEps).multiplyScalar(midRadius)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(4 * dt + offset), Math.sin(4 * dt + offset), -midEps).multiplyScalar(midRadius)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(5 * dt + offset), Math.sin(5 * dt + offset), midEps).multiplyScalar(midRadius)));

    // outer
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(-offset), Math.sin(-offset), outerEps).multiplyScalar(outerRadius)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(2 * dt - offset), Math.sin(2 * dt - offset), outerEps).multiplyScalar(outerRadius)));
    vertices.push(new Regge2Vertex(new Vector3(Math.cos(4 * dt - offset), Math.sin(4 * dt - offset), outerEps).multiplyScalar(outerRadius)));

    const edges: Regge2Edge[] = [];
    // inner - inner
    edges.push(new Regge2Edge(0, 1, restLength));
    edges.push(new Regge2Edge(1, 2, restLength));
    edges.push(new Regge2Edge(2, 0, restLength));

    // inner - mid
    edges.push(new Regge2Edge(0, 8, restLength));
    edges.push(new Regge2Edge(0, 3, restLength));
    edges.push(new Regge2Edge(0, 4, restLength));
    edges.push(new Regge2Edge(1, 4, restLength));
    edges.push(new Regge2Edge(1, 5, restLength));
    edges.push(new Regge2Edge(1, 6, restLength));
    edges.push(new Regge2Edge(2, 6, restLength));
    edges.push(new Regge2Edge(2, 7, restLength));
    edges.push(new Regge2Edge(2, 8, restLength));

    // mid - mid
    edges.push(new Regge2Edge(3, 4, restLength));
    edges.push(new Regge2Edge(4, 5, restLength));
    edges.push(new Regge2Edge(5, 6, restLength));
    edges.push(new Regge2Edge(6, 7, restLength));
    edges.push(new Regge2Edge(7, 8, restLength));
    edges.push(new Regge2Edge(8, 3, restLength));

    // inner - outer
    edges.push(new Regge2Edge(9, 5, restLength));
    edges.push(new Regge2Edge(9, 6, restLength));
    edges.push(new Regge2Edge(9, 7, restLength));
    edges.push(new Regge2Edge(10, 7, restLength));
    edges.push(new Regge2Edge(10, 8, restLength));
    edges.push(new Regge2Edge(10, 3, restLength));
    edges.push(new Regge2Edge(11, 3, restLength));
    edges.push(new Regge2Edge(11, 4, restLength));
    edges.push(new Regge2Edge(11, 5, restLength));

    // outer - outer
    edges.push(new Regge2Edge(9, 10, restLength));
    edges.push(new Regge2Edge(10, 11, restLength));
    edges.push(new Regge2Edge(11, 9, restLength));
    return new Regge2Graph(vertices, edges);
}

function paraboloidGraph() {
    return parametricGraph((x, y) => (x * y / 5), 10);
}

function parametricGraph(fn: (x: number, y: number) => number, n: number = 10): Regge2Graph {
    let m = 0;
    const vertices = [];
    for (let i = -n / 2; i < n / 2; i++) {
        for (let j = -n / 2; j < n / 2; j++) {
            const z = fn(i, j);
            if (Math.abs(z) > m) {
                m = Math.abs(z);
            }
            vertices.push(new Regge2Vertex(new Vector3(i, j, z)));
        }
    }
    const edges = [];
    for (let i = 0; i < n * n; i++) {
        const row = Math.floor(i / n);
        const col = i % n;
        const lastRow = row === n - 1;
        const lastCol = col === n - 1;
        if (!lastCol) {
            const dl = vertices[i].position.distanceTo(vertices[i + 1].position);
            edges.push(new Regge2Edge(i, i + 1, dl));
        }
        if (!lastRow) {
            const dl = vertices[i].position.distanceTo(vertices[i + n].position);
            edges.push(new Regge2Edge(i, i + n, dl));
        }
        if (!lastRow && !lastCol) {
            const dl = vertices[i].position.distanceTo(vertices[i + n + 1].position);
            edges.push(new Regge2Edge(i, i + n + 1, dl));
        }
    }
    if (m > 0) {
        for (let v of vertices) {
            v.position.z = v.position.z / m;
        }
    }
    return new Regge2Graph(vertices, edges);
}