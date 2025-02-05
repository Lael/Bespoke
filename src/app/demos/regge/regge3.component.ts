import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {Matrix3, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, Vector2, Vector3} from "three";
import {clamp} from "three/src/math/MathUtils.js";
import {CommonModule} from "@angular/common";

const MOVEMENT_SPEED = 1;
const ANGULAR_SPEED = 1;
const ARCTIC_CIRCLE = 0.1;
const CUBE_HALF_SIDE = 1;
const CUBE_SIDE = 2 * CUBE_HALF_SIDE;

// const VERTEX_RADIUS = 0.03;
// const EDGE_RADIUS = 0.01;
// const EDGE_SEGMENTS = 32;

const CLEAR_COLOR = 0x0a2933;

// const PORTAL_SIZE = 800;

class Adj {
    constructor(readonly neighbor: number, readonly matrix: Matrix3) {
    }
}

enum Face {
    FRONT,
    BACK,
    RIGHT,
    LEFT,
    BOTTOM,
    TOP,
}

// interface Regge3Cell {
//     index: number;
//     adjs: Adj[];
// }

const ID = new Matrix3(
    +1, 0, 0,
    0, +1, 0,
    0, 0, +1
);

const XP = new Matrix3(
    +1, 0, 0,
    0, 0, -1,
    0, +1, 0
);

const XM = new Matrix3(
    +1, 0, 0,
    0, 0, +1,
    0, -1, 0
);

// const X2 = new Matrix3(
//     +1, 0, 0,
//     0, -1, 0,
//     0, 0, -1
// );

const YP = new Matrix3(
    0, 0, -1,
    0, +1, 0,
    +1, 0, 0
);

const YM = new Matrix3(
    0, 0, +1,
    0, +1, 0,
    -1, 0, 0
);

const Y2 = new Matrix3(
    -1, 0, 0,
    0, +1, 0,
    0, 0, -1
);

const ZP = new Matrix3(
    0, -1, 0,
    +1, 0, 0,
    0, 0, +1
);

const ZM = new Matrix3(
    0, +1, 0,
    -1, 0, 0,
    0, 0, +1
);

const Z2 = new Matrix3(
    -1, 0, 0,
    0, -1, 0,
    0, 0, +1
);

const SPHERE_CELLS = [
    {index: 0, adjs: [new Adj(1, ID), new Adj(2, ID), new Adj(3, ID), new Adj(4, ID), new Adj(5, ID), new Adj(6, ID)]},
    {index: 1, adjs: [new Adj(7, ID), new Adj(0, ID), new Adj(3, ZM), new Adj(4, ZP), new Adj(5, YM), new Adj(6, YP)]},
    {index: 2, adjs: [new Adj(0, ID), new Adj(7, ID), new Adj(3, ZP), new Adj(4, ZM), new Adj(5, YP), new Adj(6, YM)]},
    {index: 3, adjs: [new Adj(1, ZP), new Adj(2, ZM), new Adj(7, Z2), new Adj(0, ID), new Adj(5, XM), new Adj(6, XP)]},
    {index: 4, adjs: [new Adj(1, ZM), new Adj(2, ZP), new Adj(0, ID), new Adj(7, Z2), new Adj(5, XP), new Adj(6, XM)]},
    {index: 5, adjs: [new Adj(1, YP), new Adj(2, YM), new Adj(3, XP), new Adj(4, XM), new Adj(7, Y2), new Adj(0, ID)]},
    {index: 6, adjs: [new Adj(1, YM), new Adj(2, YP), new Adj(3, XM), new Adj(4, XP), new Adj(0, ID), new Adj(7, Y2)]},
    {index: 7, adjs: [new Adj(2, ID), new Adj(1, ID), new Adj(3, Z2), new Adj(4, Z2), new Adj(5, Y2), new Adj(6, Y2)]},
];

@Component({
    selector: 'regge3',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule]
})
export class Regge3Component extends ThreeDemoComponent {
    cameraPosition = new Vector3();
    cameraTheta = 0;
    cameraPhi = 0;
    up = new Vector3(0, 0, 1);

    currentNodeIndex = 0;

    dirty = false;
    vertexShader = '';
    fragmentShader = '';

    bigQuad: Mesh;

    constructor() {
        super();
        this.useOrthographic = true;
        this.renderer.setClearColor(CLEAR_COLOR);
        this.bigQuad = new Mesh(
            new PlaneGeometry(1, 1), new MeshBasicMaterial({})
        );

        const vertPromise = fetch('assets/shaders/regge3.vert').then(response => response.text());
        const fragPromise = fetch('assets/shaders/regge3.frag').then(response => response.text());

        Promise.all([vertPromise, fragPromise]).then(([vertexShader, fragmentShader]) => {
            this.dirty = true;
            this.vertexShader = vertexShader;
            this.fragmentShader = fragmentShader;
        });
    }

    frame(dt: number): void {
        this.handleInput(dt);
        if (this.dirty) {
            this.dirty = false;
            this.scene.clear();
            this.bigQuad = new Mesh(new PlaneGeometry(3, 2), new ShaderMaterial(
                {
                    uniforms: {
                        uResolution: {value: new Vector2(this.renderer.domElement.width, this.renderer.domElement.height)},
                        uCellIndex: {value: this.currentNodeIndex},
                        uCameraPosition: {value: this.cameraPosition},
                        uPhi: {value: this.cameraPhi},
                        uTheta: {value: this.cameraTheta},
                    },
                    fragmentShader: this.fragmentShader,
                }
            ));
            this.scene.add(this.bigQuad);
        }
    }

    handleInput(dt: number): void {
        let dv = new Vector3();
        if (this.keysPressed.get('KeyW')) dv.x += 1;
        if (this.keysPressed.get('KeyS')) dv.x -= 1;
        if (this.keysPressed.get('KeyD')) dv.y -= 1;
        if (this.keysPressed.get('KeyA')) dv.y += 1;
        if (this.keysPressed.get('Space')) dv.z -= 1;
        if (this.keysPressed.get('ShiftLeft')) dv.z += 1;

        let dTheta = new Vector2();
        if (this.keysPressed.get('ArrowRight')) dTheta.x -= 1;
        if (this.keysPressed.get('ArrowLeft')) dTheta.x += 1;
        if (this.keysPressed.get('ArrowDown')) dTheta.y -= 1;
        if (this.keysPressed.get('ArrowUp')) dTheta.y += 1;

        if (dTheta.length() !== 0) {
            this.dirty = true;
            dTheta.normalize().multiplyScalar(dt * ANGULAR_SPEED);
            this.cameraTheta += dTheta.x;
            this.cameraPhi = clamp(this.cameraPhi + dTheta.y, ARCTIC_CIRCLE - Math.PI / 2, Math.PI / 2 - ARCTIC_CIRCLE);
        }

        if (dv.length() === 0) return;
        this.dirty = true;

        let u = this.up.clone();
        let f = new Vector3(Math.cos(this.cameraTheta), -Math.sin(this.cameraTheta), 0);
        let r = f.clone().cross(u).normalize();

        let mat = new Matrix3().set(
            f.x, r.x, u.x,
            f.y, r.y, u.y,
            f.z, r.z, u.z,
        );

        let v = dv.applyMatrix3(mat);
        v.normalize().multiplyScalar(dt * MOVEMENT_SPEED);

        this.cameraPosition.add(v);

        while (this.cameraPosition.x > CUBE_HALF_SIDE) {
            this.cameraPosition.x -= CUBE_SIDE;
            this.changeCell(Face.FRONT);
        }
        while (this.cameraPosition.x < -CUBE_HALF_SIDE) {
            this.cameraPosition.x += CUBE_SIDE;
            this.changeCell(Face.BACK);
        }
        while (this.cameraPosition.y > CUBE_HALF_SIDE) {
            this.cameraPosition.y -= CUBE_SIDE;
            this.changeCell(Face.RIGHT);
        }
        while (this.cameraPosition.y < -CUBE_HALF_SIDE) {
            this.cameraPosition.y += CUBE_SIDE;
            this.changeCell(Face.LEFT);
        }
        while (this.cameraPosition.z > CUBE_HALF_SIDE) {
            this.cameraPosition.z -= CUBE_SIDE;
            this.changeCell(Face.BOTTOM);
        }
        while (this.cameraPosition.z < -CUBE_HALF_SIDE) {
            this.cameraPosition.z += CUBE_SIDE;
            this.changeCell(Face.TOP);
        }
    }

    changeCell(face: Face) {
        const adj = SPHERE_CELLS[this.currentNodeIndex].adjs[face];
        this.currentNodeIndex = adj.neighbor;
        this.cameraPosition.applyMatrix3(adj.matrix.invert());
        const cart = sphericalToCartesian(1, this.cameraTheta, Math.PI / 2 - this.cameraPhi);
        cart.applyMatrix3(adj.matrix.invert());
        const sph = cartesianToSpherical(cart);
        this.cameraTheta = sph.y;
        this.cameraPhi = Math.PI / 2 - sph.z;
        this.up.applyMatrix3(adj.matrix.invert());
    }
}

function sphericalToCartesian(rho: number, theta: number, phi: number): Vector3 {
    return new Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
    ).multiplyScalar(rho);
}

function cartesianToSpherical(v: Vector3): Vector3 {
    if (v.x === 0 && v.y === 0) return new Vector3(v.z, 0, 0);
    const theta = Math.atan2(v.y, v.x);
    const phi = Math.acos(v.z / v.length())
    return new Vector3(
        v.length(),
        theta,
        phi,
    );
}