import * as THREE from "three";
import {
  ArrowHelper,
  BufferGeometry,
  Group,
  InstancedMesh,
  Light,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  OrthographicCamera,
  Points,
  PointsMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
  Vector4
} from "three";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from "@angular/core";
import {CommonModule} from "@angular/common";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {GUI} from "dat.gui";
import {convexHull} from "../../widgets/polygon-picker.component";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial.js";
import {LineSegments2} from "three/examples/jsm/lines/LineSegments2.js";
import {LineSegmentsGeometry} from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import {ConvexGeometry} from "three/examples/jsm/geometries/ConvexGeometry.js";
import {Chart} from "chart.js/auto";
import {ChartConfiguration, ChartDataset} from "chart.js";
import {EPSILON} from "../../../math/math-helpers";

// const STARTS: number = 1000;
// const ITERATIONS: number = 1000;
// const DELTA: number = 1e-6;
//
// type Projection = (v: Vector4) => Vector4;
// type Normal = (v: Vector4) => Vector4; // Assumes v lies on the surface
// type Objective = (v: Vector4, n: Vector4) => number;
//
// function projectPerp(normal: Vector4, v: Vector4): Vector4 {
//   return v.clone().addScaledVector(normal.clone(), -normal.dot(v));
// }
//
// function randomPoint(): Vector4 {
//   const u1 = Math.random();
//   const u2 = Math.random();
//   const u3 = Math.random();
//   const u4 = Math.random();
//   return new Vector4(
//     Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2),
//     Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2),
//     Math.sqrt(-2 * Math.log(u3)) * Math.cos(2 * Math.PI * u4),
//     Math.sqrt(-2 * Math.log(u3)) * Math.sin(2 * Math.PI * u4),
//   );
// }
//
// function factor(iter: number): number {
//   return -1;
// }
//
// function minimizeS3(project: Projection, normal: Normal, objective: Objective, target: number): Vector4 {
//   let points = [];
//   for (let i = 0; i < STARTS; i++) {
//     const p = project(randomPoint());
//     points.push(p);
//   }
//   let bestLocal: Vector4 | null = null;
//   let bestLocalValue = Number.POSITIVE_INFINITY;
//   for (let iter = 0; iter < ITERATIONS; iter++) {
//     const f = factor(iter);
//     const newPoints = [];
//     for (let i = 0; i < points.length; i++) {
//       const point = points[i];
//       const g = gradient(objective, normal, point);
//       const n = normal(point);
//       const proj = projectPerp(n, g);
//       const diff = project(point.clone().add(proj)).sub(point);
//       const np = project(point.clone().addScaledVector(diff, f));
//       const nv = objective(np, normal(np));
//       if (closeEnough(np.clone().sub(point).length(), 1e-6) && nv < bestLocalValue) {
//         bestLocal = np;
//         bestLocalValue = nv;
//         continue;
//       }
//       if (nv - target < 1e-4) {
//         return np;
//       }
//       newPoints.push(np);
//     }
//     if (newPoints.length === 0) break;
//     points = newPoints;
//   }
//   // if (bestLocal !== null) {
//   //   console.log(bestLocal, bestLocalValue);
//   //   return bestLocal;
//   // }
//   // for (let p of points) {
//   //   const n = normal(p);
//   //   console.log(p, projectPerp(n, gradient(objective, normal, p)).length(), objective(p, n));
//   // }
//   throw Error('no minimum found');
// }
//
// function pNorm(v: Vector4, p: number): number {
//   return Math.pow(
//     Math.pow(Math.abs(v.x), p) +
//     Math.pow(Math.abs(v.y), p) +
//     Math.pow(Math.abs(v.z), p) +
//     Math.pow(Math.abs(v.w), p), 1 / p);
// }
//
// function lpSphere(p: number): [Projection, Normal] {
//   const project = (v: Vector4) => {
//     const lp = Math.pow(Math.abs(v.x), p) + Math.pow(Math.abs(v.y), p) + Math.pow(Math.abs(v.z), p) + Math.pow(Math.abs(v.w), p);
//     if (lp === 0) throw Error('cannot project origin');
//     return v.clone().multiplyScalar(Math.pow(lp, -1 / p));
//   };
//   const normal = (v: Vector4) => {
//     return new Vector4(
//       Math.pow(v.x, p - 1),
//       Math.pow(v.y, p - 1),
//       Math.pow(v.z, p - 1),
//       Math.pow(v.w, p - 1),
//     ).normalize();
//   }
//   return [project, normal];
// }
//
// function gradient(f: Objective, n: Normal, pt: Vector4): Vector4 {
//   const {x, y, z, w} = pt;
//   const xp = new Vector4(x + DELTA, y, z, w);
//   const xm = new Vector4(x - DELTA, y, z, w);
//   const yp = new Vector4(x, y + DELTA, z, w);
//   const ym = new Vector4(x, y - DELTA, z, w);
//   const zp = new Vector4(x, y, z + DELTA, w);
//   const zm = new Vector4(x, y, z - DELTA, w);
//   const wp = new Vector4(x, y, z, w + DELTA);
//   const wm = new Vector4(x, y, z, w - DELTA);
//   const ddx = (f(xp, n(xp)) - f(xm, n(xm))) / (2 * DELTA);
//   const ddy = (f(yp, n(yp)) - f(ym, n(ym))) / (2 * DELTA);
//   const ddw = (f(wp, n(wp)) - f(wm, n(wm))) / (2 * DELTA);
//   const ddz = (f(zp, n(zp)) - f(zm, n(zm))) / (2 * DELTA);
//   return new Vector4(ddx, ddy, ddz, ddw);
// }
//
// function outerSymplecticObjective(outside: Vector4): Objective {
//   return (v: Vector4, n: Vector4) => {
//     const jv = new Vector4(-n.y, n.x, -n.w, n.z);
//     const diff = v.clone().sub(outside).normalize();
//     return Math.pow(1 - jv.dot(diff), 2);
//   };
// }

const J: Matrix4 = new Matrix4().set(
  0, 0, 1, 0,
  0, 0, 0, 1,
  -1, 0, 0, 0,
  0, -1, 0, 0,
);

// const J: Matrix4 = new Matrix4().set(
//   0, 1, 0, 0,
//   -1, 0, 0, 0,
//   0, 0, 0, 1,
//   0, 0, -1, 0,
// );


interface SquareFace {
  center: Vector4,
  s1: Vector4,
  s2: Vector4,
  n1: Vector4,
  n2: Vector4,
}

const TESSERACT = [
  new Vector4(+1, +1, +1, +1),
  new Vector4(+1, +1, +1, -1),
  new Vector4(+1, +1, -1, +1),
  new Vector4(+1, +1, -1, -1),
  new Vector4(+1, -1, +1, +1),
  new Vector4(+1, -1, +1, -1),
  new Vector4(+1, -1, -1, +1),
  new Vector4(+1, -1, -1, -1),
  new Vector4(-1, +1, +1, +1),
  new Vector4(-1, +1, +1, -1),
  new Vector4(-1, +1, -1, +1),
  new Vector4(-1, +1, -1, -1),
  new Vector4(-1, -1, +1, +1),
  new Vector4(-1, -1, +1, -1),
  new Vector4(-1, -1, -1, +1),
  new Vector4(-1, -1, -1, -1),
];

const X_POS = new Vector4(+1, 0, 0, 0,);
const X_NEG = new Vector4(-1, 0, 0, 0,);
const Y_POS = new Vector4(0, +1, 0, 0,);
const Y_NEG = new Vector4(0, -1, 0, 0,);
const Z_POS = new Vector4(0, 0, +1, 0,);
const Z_NEG = new Vector4(0, 0, -1, 0,);
const W_POS = new Vector4(0, 0, 0, +1,);
const W_NEG = new Vector4(0, 0, 0, -1,);


const FACES: SquareFace[] = [
  // + +
  {center: new Vector4(0, 0, 1, 1), s1: X_POS, s2: Y_POS, n1: Z_POS, n2: W_POS},
  {center: new Vector4(0, 1, 0, 1), s1: X_POS, s2: Z_POS, n1: Y_POS, n2: W_POS},
  {center: new Vector4(1, 0, 0, 1), s1: Y_POS, s2: Z_POS, n1: X_POS, n2: W_POS},
  {center: new Vector4(0, 1, 1, 0), s1: X_POS, s2: W_POS, n1: Y_POS, n2: Z_POS},
  {center: new Vector4(1, 0, 1, 0), s1: Y_POS, s2: W_POS, n1: X_POS, n2: Z_POS},
  {center: new Vector4(1, 1, 0, 0), s1: Z_POS, s2: W_POS, n1: X_POS, n2: Y_POS},

  // + -
  {center: new Vector4(0, 0, 1, -1), s1: X_POS, s2: Y_POS, n1: Z_POS, n2: W_NEG},
  {center: new Vector4(0, 1, 0, -1), s1: X_POS, s2: Z_POS, n1: Y_POS, n2: W_NEG},
  {center: new Vector4(1, 0, 0, -1), s1: Y_POS, s2: Z_POS, n1: X_POS, n2: W_NEG},
  {center: new Vector4(0, 1, -1, 0), s1: X_POS, s2: W_POS, n1: Y_POS, n2: Z_NEG},
  {center: new Vector4(1, 0, -1, 0), s1: Y_POS, s2: W_POS, n1: X_POS, n2: Z_NEG},
  {center: new Vector4(1, -1, 0, 0), s1: Z_POS, s2: W_POS, n1: X_POS, n2: Y_NEG},

  // - +
  {center: new Vector4(0, 0, -1, 1), s1: X_POS, s2: Y_POS, n1: Z_NEG, n2: W_POS},
  {center: new Vector4(0, -1, 0, 1), s1: X_POS, s2: Z_POS, n1: Y_NEG, n2: W_POS},
  {center: new Vector4(-1, 0, 0, 1), s1: Y_POS, s2: Z_POS, n1: X_NEG, n2: W_POS},
  {center: new Vector4(0, -1, 1, 0), s1: X_POS, s2: W_POS, n1: Y_NEG, n2: Z_POS},
  {center: new Vector4(-1, 0, 1, 0), s1: Y_POS, s2: W_POS, n1: X_NEG, n2: Z_POS},
  {center: new Vector4(-1, 1, 0, 0), s1: Z_POS, s2: W_POS, n1: X_NEG, n2: Y_POS},

  // - -
  {center: new Vector4(0, 0, -1, -1), s1: X_POS, s2: Y_POS, n1: Z_NEG, n2: W_NEG},
  {center: new Vector4(0, -1, 0, -1), s1: X_POS, s2: Z_POS, n1: Y_NEG, n2: W_NEG},
  {center: new Vector4(-1, 0, 0, -1), s1: Y_POS, s2: Z_POS, n1: X_NEG, n2: W_NEG},
  {center: new Vector4(0, -1, -1, 0), s1: X_POS, s2: W_POS, n1: Y_NEG, n2: Z_NEG},
  {center: new Vector4(-1, 0, -1, 0), s1: Y_POS, s2: W_POS, n1: X_NEG, n2: Z_NEG},
  {center: new Vector4(-1, -1, 0, 0), s1: Z_POS, s2: W_POS, n1: X_NEG, n2: Y_NEG},
];

function normalConeContains(test: Vector4, nc: Vector4[]): boolean {
  const A = new Matrix4().set(
    nc[0].x, nc[1].x, nc[2].x, nc[3].x,
    nc[0].y, nc[1].y, nc[2].y, nc[3].y,
    nc[0].z, nc[1].z, nc[2].z, nc[3].z,
    nc[0].w, nc[1].w, nc[2].w, nc[3].w,
  );
  const Ainv = A.clone().invert();

  const lambda = test.clone().applyMatrix4(Ainv);
  return lambda.x > EPSILON && lambda.y > EPSILON && lambda.z > EPSILON && lambda.w > EPSILON;
  // console.log(test, normals);
  // for (let n of normals) if (test.dot(n) <= 0) return false;
  // return true;
}

function normalWedgeClaimsPoint(point: Vector4, face: SquareFace): [boolean, Vector4] {
  // does there exist a point P = center + a*s1 + b*s2 such that
  // (P - point) = c*n1 + d*n1
  // where -1 < a,b < 1 and c,d > 0?
  // (center + a*s1 + b*s2 - point) = c*n1 + d*n1
  // point - center = (s1,s2,-n1,-n1)*(a, b, c, d)
  //
  const A = new Matrix4().set(
    face.s1.x, face.s2.x, -face.n1.x, -face.n2.x,
    face.s1.y, face.s2.y, -face.n1.y, -face.n2.y,
    face.s1.z, face.s2.z, -face.n1.z, -face.n2.z,
    face.s1.w, face.s2.w, -face.n1.w, -face.n2.w,
  );

  const abcd = point.clone().sub(face.center).applyMatrix4(A.clone().invert());
  const claims = abcd.x > -1 && abcd.x < 1 && abcd.y > -1 && abcd.y < 1 && abcd.z > EPSILON && abcd.w > EPSILON;
  const pivot = face.center.clone().addScaledVector(face.s1, abcd.x).addScaledVector(face.s2, abcd.y);
  return [claims, pivot];
}

enum CoordinatePlane {
  XY = 'XY',
  XZ = 'XZ',
  XW = 'XW',
  YZ = 'YZ',
  YW = 'YW',
  ZW = 'ZW',
}

function rotation4D(dt: number, cp: CoordinatePlane) {
  const c = Math.cos(dt);
  const s = Math.sin(dt);
  switch (cp) {
  case CoordinatePlane.XY:
    return new Matrix4().set(
      c, -s, 0, 0,
      s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    );
  case CoordinatePlane.XZ:
    return new Matrix4().set(
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1,
    );
  case CoordinatePlane.XW:
    return new Matrix4().set(
      c, 0, 0, -s,
      0, 1, 0, 0,
      0, 0, 1, 0,
      s, 0, 0, c,
    );
  case CoordinatePlane.YZ:
    return new Matrix4().set(
      1, 0, 0, 0,
      0, c, -s, 0,
      0, s, c, 0,
      0, 0, 0, 1,
    );
  case CoordinatePlane.YW:
    return new Matrix4().set(
      1, 0, 0, 0,
      0, c, 0, -s,
      0, 0, 1, 0,
      0, s, 0, c,
    );
  case CoordinatePlane.ZW:
    return new Matrix4().set(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, c, -s,
      0, 0, s, c,
    );
  }
}


const CHART_CONFIG: ChartConfiguration = {
  type: 'scatter',
  options: {
    animation: {
      duration: 0
    }
  },
  data: {
    datasets: []
  },
}

@Component({
  selector: 'outerArea-symplectic',
  templateUrl: 'outer-symplectic.component.html',
  styleUrls: ['../../widgets/three-demo/three-demo.component.sass', 'outer-symplectic.component.sass'],
  standalone: true,
  imports: [CommonModule]
})
export class OuterSymplecticComponent extends ThreeDemoComponent implements AfterViewInit, OnDestroy {

  p: number = 10;
  start: Vector4 = new Vector4(0, 1.01, 0, 0);
  orbit: Vector4[] = [];

  // project: Projection;
  // normal: Normal;

  table: Group;
  arrows: ArrowHelper[] = [];
  orbitPoints!: InstancedMesh;
  line!: Line;
  points!: Points;
  orbitControls: OrbitControls;

  lights: Light[] = [];

  ortho: Matrix4 = new Matrix4().identity();
  // ortho: Matrix4 = rotation4D(Math.PI / 4, CoordinatePlane.XY);
  orthoInverse: Matrix4 = this.ortho.clone().invert();

  iterations: number = 0;
  connectEvery: number = 0;
  project2D: boolean = true;
  showChart: boolean = false;
  canvas: HTMLCanvasElement | null = null;
  chart?: Chart;

  gui: GUI = new GUI();
  orbitDirty: boolean = true;
  drawDirty: boolean = true;

  // projected view
  xyScene: THREE.Scene;
  xyRenderer: THREE.WebGLRenderer;
  xyCamera: THREE.OrthographicCamera;
  zwScene: THREE.Scene;
  zwRenderer: THREE.WebGLRenderer;
  zwCamera: THREE.OrthographicCamera;

  @ViewChild('xy_container', {static: true})
  xyHost?: ElementRef;
  xyControls: OrbitControls;

  @ViewChild('zw_container', {static: true})
  zwHost?: ElementRef;
  zwControls: OrbitControls;

  xyOrbit!: THREE.Object3D;
  zwOrbit!: THREE.Object3D;

  pointsMaterial: PointsMaterial;
  lineMaterial: LineBasicMaterial;

  xyTable!: Group;
  zwTable!: Group;

  coordinatePlane: CoordinatePlane = CoordinatePlane.XY;

  period: string = '';

  constructor() {
    super();
    this.perspectiveCamera.far = 1e6;
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    // [this.project, this.normal] = lpSphere(this.p);

    // this.table = new Mesh(new IcosahedronGeometry(1, 100), new MeshPhongMaterial({color: 0xf0f1eb}));
    // const positionAttribute = this.table.geometry.getAttribute('position');
    // for (let i = 0; i < positionAttribute.count; i++) {
    //   // Get the original vertex position
    //   const x = positionAttribute.getX(i);
    //   const y = positionAttribute.getY(i);
    //   const z = positionAttribute.getZ(i);
    //
    //   const v = this.project(new Vector4(x, y, z, 0));
    //
    //   positionAttribute.setXYZ(i, v.x, v.y, v.z);
    // }
    // this.table.geometry.computeVertexNormals();

    this.registerColor('lo_w', 0xff0000, 0xff0000);
    this.registerColor('hi_w', 0x0000ff, 0x00ffff);
    this.registerColor('orbit', 0x123456, 0xf0f1eb);
    this.pointsMaterial = new PointsMaterial();
    this.lineMaterial = new LineBasicMaterial();
    this.registerMaterial(this.pointsMaterial, 'orbit');
    this.registerMaterial(this.lineMaterial, 'orbit');

    this.table = new Group();

    const al = new THREE.AmbientLight(0xffffff, 1);
    const dl = new THREE.DirectionalLight(0xffffff, 2);
    dl.position.set(1, 2, 3);
    dl.target = this.table;
    this.lights.push(al, dl);

    this.xyScene = new THREE.Scene();
    this.xyRenderer = new THREE.WebGLRenderer({antialias: true});
    this.xyRenderer.setPixelRatio(window.devicePixelRatio);
    this.xyRenderer.setClearColor(this.getColor('clear'));
    this.xyCamera = new OrthographicCamera();
    this.xyCamera.position.z = 100;
    this.xyCamera.zoom = 0.25;
    this.xyCamera.updateProjectionMatrix();
    this.xyControls = new OrbitControls(this.xyCamera, this.xyRenderer.domElement);
    this.xyControls.enableRotate = false;
    this.xyControls.zoomToCursor = true;

    this.zwScene = new THREE.Scene();
    this.zwRenderer = new THREE.WebGLRenderer({antialias: true});
    this.zwRenderer.setPixelRatio(window.devicePixelRatio);
    this.zwRenderer.setClearColor(this.getColor('clear'));
    this.zwCamera = new OrthographicCamera();
    this.zwCamera.position.z = 100;
    this.zwCamera.zoom = 0.25;
    this.zwCamera.updateProjectionMatrix();
    this.zwControls = new OrbitControls(this.zwCamera, this.zwRenderer.domElement);
    this.zwControls.enableRotate = false;
    this.zwControls.zoomToCursor = true;

    this.updateGUI();
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.gui.destroy();
    this.xyHost?.nativeElement.removeChild(this.xyRenderer.domElement);
    this.xyRenderer.dispose();

    this.zwHost?.nativeElement.removeChild(this.zwRenderer.domElement);
    this.zwRenderer.dispose();
  }

  override ngAfterViewInit() {
    super.ngAfterViewInit();

    this.canvas = document.getElementById("chart") as HTMLCanvasElement;

    if (this.canvas === null) console.error("Could not initialize chart");
    Chart.defaults.color = '#ffffff';
    this.chart = new Chart((this.canvas as HTMLCanvasElement),
      CHART_CONFIG,
    );

    if (!this.xyHost) {
      console.error('Missing container for xy renderer');
      return;
    }
    this.xyRenderer.setSize(400, 400);
    this.xyControls = new OrbitControls(this.xyCamera, this.xyRenderer.domElement);
    this.xyControls.enableRotate = false;
    this.xyControls.screenSpacePanning = true;
    // this.xyControls.zoomToCursor = true;
    this.xyHost.nativeElement.appendChild(this.xyRenderer.domElement);

    if (!this.zwHost) {
      console.error('Missing container for zw renderer');
      return;
    }
    this.zwRenderer.setSize(400, 400);
    this.zwControls = new OrbitControls(this.zwCamera, this.zwRenderer.domElement);
    this.zwControls.enableRotate = false;
    this.zwControls.screenSpacePanning = true;
    // this.zwControls.zoomToCursor = true;
    this.zwHost.nativeElement.appendChild(this.zwRenderer.domElement);

    this.drawDirty = true;
    this.updateChart();
  }

  updateGUI() {
    this.gui.destroy();
    this.gui = new GUI();

    this.gui.add(this, 'iterations', 0, 20, 1)
      .name('log2(iters)')
      .onFinishChange(() => {
        this.orbitDirty = true;
      });

    this.gui.add(this, 'connectEvery', 0, 3, 1)
      .name('Connect every')
      .onChange(() => {
        this.drawDirty = true;
      });

    this.gui.add(this, 'project2D').name('xy and zw')
      .onChange(() => {
        this.drawDirty = true;
      });

    this.gui.add(this, 'coordinatePlane').options(Object.values(CoordinatePlane)).name('Rotate in...');

    this.gui.add(this, 'period').name('Period');

    this.gui.add(this, 'showChart').name('Chart')
      .onChange(() => {
        this.updateChart();
        this.drawDirty = true;
      });

    this.gui.open();
  }

  iterate(): number {
    console.clear();
    this.drawDirty = true;
    let start = this.start.clone().applyMatrix4(this.ortho);
    this.orbit = [];
    this.orbit.push(start);
    let inside = true;
    for (let v of this.start) if (Math.abs(v) > 1) inside = false;
    if (inside) {
      return 0;
    }
    let state = start.clone();
    for (let i = 0; i < 1 << this.iterations; i++) {
      try {
        const newState = this.billiard(state);

        const diff = newState.clone().sub(state);
        const closest = state.clone().addScaledVector(diff,
          -diff.dot(state) / diff.lengthSq()).applyMatrix4(this.orthoInverse);

        if (Math.abs(closest.x) < 1 && Math.abs(closest.y) < 1 && Math.abs(closest.z) < 1 && Math.abs(closest.w) < 1) {
          console.log(closest);
        }

        state = newState;

        this.orbit.push(state.clone());
        if (state.clone().sub(start).length() < 1e-6) {
          return i + 1;
        }
      } catch (e) {
        console.warn(i, e);
        break;
      }
    }
    return 0;
  }

  updateDraw() {
    this.updateTables();
    this.orbitPoints = new InstancedMesh(
      new SphereGeometry(0.05),
      new MeshBasicMaterial({color: 0xffffff}),
      this.orbit.length);
    const buff = new BufferGeometry()
      .setFromPoints(this.orbit.map(v4 => new Vector3(v4.x, v4.y, v4.z)));
    const colors = [];
    for (let [i, p] of this.orbit.entries()) {
      this.orbitPoints.setMatrixAt(i, new Matrix4().makeTranslation(p.x, p.y, p.z))
      const a = Math.atan(p.w / 10) / Math.PI + 0.5;
      const color = this.getColor('lo_w').clone().lerp(this.getColor('hi_w'), a);
      this.orbitPoints.setColorAt(i, color);
      colors.push(color.r, color.g, color.b);
    }
    this.orbitPoints.instanceMatrix.needsUpdate = true;
    this.orbitPoints.instanceColor!.needsUpdate = true;

    buff.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.points = new Points(buff, new PointsMaterial({vertexColors: true, sizeAttenuation: false}));

    if (this.connectEvery === 0) {
      this.xyOrbit = new Points(new BufferGeometry().setFromPoints(this.orbit.map(v => new Vector3(v.x, v.y))), this.pointsMaterial);
      this.zwOrbit = new Points(new BufferGeometry().setFromPoints(this.orbit.map(v => new Vector3(v.z, v.w))), this.pointsMaterial);
      return;
    }
    const everyOther = this.orbit.filter((_, i) => i % this.connectEvery === 0);
    const lineBuff = new BufferGeometry()
      .setFromPoints(everyOther.map(v4 => new Vector3(v4.x, v4.y, v4.z)));
    lineBuff.setAttribute('color', new THREE.Float32BufferAttribute(
      colors.filter((_, i) => Math.floor(i / 3) % this.connectEvery === 0), 3));

    this.line = new Line(
      lineBuff,
      new LineBasicMaterial({vertexColors: true})
    );
    this.xyOrbit = new Line(new BufferGeometry().setFromPoints(everyOther.map(v => new Vector3(v.x, v.y))), this.lineMaterial);
    this.zwOrbit = new Line(new BufferGeometry().setFromPoints(everyOther.map(v => new Vector3(v.z, v.w))), this.lineMaterial);
  }

  processKeyboardInput(dt: number): void {
    this.renderer.setClearColor(this.getColor('clear'));
    const diff = new Vector4(0, 0, 0, 0);
    if (this.keyHeld('KeyA')) diff.x -= 1;
    if (this.keyHeld('KeyD')) diff.x += 1;
    if (this.keyHeld('KeyS')) diff.y -= 1;
    if (this.keyHeld('KeyW')) diff.y += 1;
    if (this.keyHeld('KeyJ')) diff.z -= 1;
    if (this.keyHeld('KeyL')) diff.z += 1;
    if (this.keyHeld('KeyK')) diff.w -= 1;
    if (this.keyHeld('KeyI')) diff.w += 1;

    let mult: number = 1;
    if (this.keyHeld('ShiftLeft') || this.keyHeld('ShiftRight')) mult /= 10;
    if (this.keyHeld('AltLeft') || this.keyHeld('AltRight')) mult /= 100;

    if (diff.length() !== 0) {
      diff.normalize().multiplyScalar(dt * 2 * mult);
      this.start.add(diff);
      this.orbitDirty = true;
    }

    const oldCP = this.coordinatePlane;
    if (this.keyJustPressed('Digit1')) this.coordinatePlane = CoordinatePlane.XY;
    if (this.keyJustPressed('Digit2')) this.coordinatePlane = CoordinatePlane.XZ;
    if (this.keyJustPressed('Digit3')) this.coordinatePlane = CoordinatePlane.XW;
    if (this.keyJustPressed('Digit4')) this.coordinatePlane = CoordinatePlane.YZ;
    if (this.keyJustPressed('Digit5')) this.coordinatePlane = CoordinatePlane.YW;
    if (this.keyJustPressed('Digit6')) this.coordinatePlane = CoordinatePlane.ZW;
    if (oldCP !== this.coordinatePlane) this.updateGUI();

    let updateOrtho = false;
    if (this.keyJustPressed('Digit0')) {
      this.ortho.identity();
      this.orthoInverse.identity();
      updateOrtho = true;
    }

    let dTheta: number = 0;
    if (this.keyHeld('BracketLeft')) dTheta += dt / 2;
    if (this.keyHeld('BracketRight')) dTheta -= dt / 2;
    if (dTheta !== 0 || updateOrtho) {
      const rot = rotation4D(dTheta * mult, this.coordinatePlane);
      this.ortho.premultiply(rot);
      this.orthoInverse = this.ortho.clone().invert();
      this.orbitDirty = true;
      this.updateTables();
    }

    if (this.keyJustPressed('KeyP')) {
      console.clear();
      console.log(this.orbit.map(v => v.clone().multiplyScalar(1000).round().multiplyScalar(0.001)));
    }
  }

  updateTables() {
    const v = TESSERACT.map(v => v.clone().applyMatrix4(this.ortho));
    const edges = [
      v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[9], v[10], v[11], v[12], v[13], v[14], v[15],
      v[0], v[2], v[1], v[3], v[4], v[6], v[5], v[7], v[8], v[10], v[9], v[11], v[12], v[14], v[13], v[15],
      v[0], v[4], v[1], v[5], v[2], v[6], v[3], v[7], v[8], v[12], v[9], v[13], v[10], v[14], v[11], v[15],
      v[0], v[8], v[1], v[9], v[2], v[10], v[3], v[11], v[4], v[12], v[5], v[13], v[6], v[14], v[7], v[15],
    ];
    this.table = new Group();
    this.table.add(new LineSegments2(
      new LineSegmentsGeometry().setPositions(edges.flatMap(v4 => [v4.x, v4.y, v4.z])),
      new LineMaterial({color: 0xff0000, resolution: this.resolution, linewidth: 3}))
    );
    const convexGeometry = new ConvexGeometry(v.map(v4 => new Vector3(v4.x, v4.y, v4.z)));
    this.table.add(new Mesh(convexGeometry, new MeshPhongMaterial({
      color: 0x00aaaa,
      transparent: true,
      opacity: 0.5
    })));

    const xyHull = convexHull(v.map(v => new Vector2(v.x, v.y)))[0];
    this.xyTable = new Group();
    this.xyTable.add(new Mesh(
      new ShapeGeometry(new Shape().setFromPoints(xyHull).closePath()),
      new MeshBasicMaterial({
        color: 0x00aaaa,
        transparent: true,
        opacity: 0.5
      })));
    this.xyTable.add(new LineSegments2(
      new LineSegmentsGeometry().setPositions(edges.flatMap(v4 => [v4.x, v4.y, 0])),
      new LineMaterial({color: 0xff0000, resolution: new Vector2(400, 400), linewidth: 3}))
    );
    this.xyTable.translateZ(-1);

    const zwHull = convexHull(v.map(v => new Vector2(v.z, v.w)))[0];
    this.zwTable = new Group();
    this.zwTable.add(new Mesh(
      new ShapeGeometry(new Shape().setFromPoints(zwHull).closePath()),
      new MeshBasicMaterial({
        color: 0x00aaaa,
        transparent: true,
        opacity: 0.5
      })));
    this.zwTable.add(new LineSegments2(
      new LineSegmentsGeometry().setPositions(edges.flatMap(v4 => [v4.z, v4.w, 0])),
      new LineMaterial({color: 0xff0000, resolution: new Vector2(400, 400), linewidth: 3}))
    );
    this.zwTable.translateZ(-1);

    this.arrows = [];
    for (let c of TESSERACT) {
      const oc = c.clone().applyMatrix4(this.ortho);
      const cone = [
        new Vector4(c.x, 0, 0, 0),
        new Vector4(0, c.y, 0, 0),
        new Vector4(0, 0, c.z, 0),
        new Vector4(0, 0, 0, c.w)
      ].map(v => v.applyMatrix4(this.ortho).applyMatrix4(J)).map(v => new Vector3(-v.x, -v.y, -v.z));

      const co = c.clone().applyMatrix4(this.ortho);
      const c3 = new Vector3(co.x, co.y, co.z);

      for (let nv of cone) {
        this.arrows.push(new ArrowHelper(
          nv.clone().sub(c3),
          c3.clone(),
          nv.length() / 2,
          0xff4444,
        ))
      }
    }
  }

  updateChart() {
    if (this.showChart && this.chart) {
      const desiredPoints = Math.min(1000, this.orbit.length);
      const step = Math.floor(this.orbit.length / desiredPoints);
      const dataset: ChartDataset = {
        label: 'distance',
        type: 'scatter',
        data: this.orbit.filter((_, i) => i % step === 0)
          .map((v, i) => {
            // const t = normalizeAngle(row.theta + Math.PI / 2, 0);
            return {
              x: i * step,
              y: v.length(),
            };
          })
      };
      const datasets: ChartDataset[] = [dataset];
      this.chart.config.data = {datasets};
      this.chart.update();
    }
  }

  frame(dt: number): void {
    this.processKeyboardInput(dt);

    if (this.colorModeFraction !== this.colorMode) this.drawDirty = true;

    if (this.orbitDirty) {
      this.drawDirty = true;
      const period = this.iterate();
      this.period = period > 0 ? `${period}` : `not periodic`;
      this.updateChart();
      this.updateGUI();
      this.orbitDirty = false;
    }

    if (this.drawDirty) {
      this.updateDraw();
      this.drawDirty = false;
    }

    if (this.project2D) {
      this.xyRenderer.setClearColor(this.getColor('clear'));
      this.xyRenderer.clear();
      this.xyCamera.up.set(0, 1, 0);
      this.xyCamera.updateProjectionMatrix();
      this.xyScene.clear();
      this.xyScene.add(this.xyTable);
      this.xyScene.add(this.xyOrbit);
      this.xyScene.add(...this.lights);
      this.xyRenderer.render(this.xyScene, this.xyCamera);

      this.zwRenderer.setClearColor(this.getColor('clear'));
      this.zwRenderer.clear();
      this.zwCamera.up.set(0, 1, 0);
      this.zwCamera.updateProjectionMatrix();
      this.zwScene.clear();
      this.zwScene.add(this.zwTable);
      this.zwScene.add(this.zwOrbit);
      this.zwScene.add(...this.lights);
      this.zwRenderer.render(this.zwScene, this.zwCamera);
    }

    this.scene.clear();
    this.scene.add(this.table);
    // if (this.arrows.length > 0) this.scene.add(...this.arrows);
    this.scene.add(this.orbitPoints);
    if (this.connectEvery == 0) this.scene.add(this.points);
    else this.scene.add(this.line);
    this.scene.add(...this.lights);
  }

  billiard(start: Vector4): Vector4 {
    let pivot: Vector4 | null = null;
    for (let corner of TESSERACT) {
      const cone = [
        new Vector4(corner.x, 0, 0, 0),
        new Vector4(0, corner.y, 0, 0),
        new Vector4(0, 0, corner.z, 0),
        new Vector4(0, 0, 0, corner.w)
      ].map(v => v.applyMatrix4(this.ortho).applyMatrix4(J));
      const v = corner.clone().applyMatrix4(this.ortho).sub(start);

      if (normalConeContains(v, cone)) {
        pivot = corner.clone().applyMatrix4(this.ortho);
        break;
      }
    }
    let facesClaiming = 0;
    if (pivot === null) {
      for (let face of FACES) {
        const [claims, facePivot] = normalWedgeClaimsPoint(start.clone(), {
          center: face.center.clone().applyMatrix4(this.ortho),
          s1: face.s1.clone().applyMatrix4(this.ortho),
          s2: face.s2.clone().applyMatrix4(this.ortho),
          n1: face.n1.clone().applyMatrix4(this.ortho).applyMatrix4(J),
          n2: face.n2.clone().applyMatrix4(this.ortho).applyMatrix4(J),
        });
        if (claims) {
          pivot = facePivot;
          facesClaiming++;
          console.log(face.center);
        }
      }
    }
    if (facesClaiming > 1) console.log('multiple faces', start);
    if (pivot === null) {
      console.log(start.clone().applyMatrix4(this.orthoInverse));
      throw Error('could not reflect');
    }
    // console.log(pivot.clone().applyMatrix4(this.orthoInverse).multiplyScalar(10000).round().multiplyScalar(1 / 10000));
    const image = pivot.clone().add(pivot.clone().sub(start));
    if (Math.abs(image.x) < 1 && Math.abs(image.y) < 1 && Math.abs(image.z) < 1 && Math.abs(image.w) < 1)
      console.log('Uh oh, we are inside the hypercube!');
    console.log('image', image);
    return image;
    // if (pNorm(start, this.p) <= 1) throw Error('inside table');
    // const pivot = minimizeS3(
    //   this.project, this.normal, outerSymplecticObjective(start), 0
    // );
    // return pivot.add(pivot.clone().sub(start));
  }
}