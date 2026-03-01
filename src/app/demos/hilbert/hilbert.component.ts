import {Component, OnDestroy} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {Pane} from "tweakpane";
import {
  AmbientLight,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  Matrix3,
  Matrix4,
  MeshPhongMaterial,
  PointLight,
  SphereGeometry,
  Vector3
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {closeEnough} from "../../../math/math-helpers";

const CORNERS: Vector3[] = [
  new Vector3(-1, -1, -1),
  new Vector3(-1, -1, +1),
  new Vector3(-1, +1, +1),
  new Vector3(-1, +1, -1),
  new Vector3(+1, +1, -1),
  new Vector3(+1, +1, +1),
  new Vector3(+1, -1, +1),
  new Vector3(+1, -1, -1),
];

const RX = new Matrix3().set(
  +1, 0, 0,
  0, 0, -1,
  0, +1, 0,
);
const RY = new Matrix3().set(
  0, 0, +1,
  0, +1, 0,
  -1, 0, 0,
);
const RZ = new Matrix3().set(
  0, -1, 0,
  +1, 0, 0,
  0, 0, +1,
);

const FX = new Matrix3().set(
  -1, 0, 0,
  0, +1, 0,
  0, 0, +1,
);

const FY = new Matrix3().set(
  +1, 0, 0,
  0, -1, 0,
  0, 0, +1,
);

const FZ = new Matrix3().set(
  +1, 0, 0,
  0, +1, 0,
  0, 0, -1,
);

const TRANSFORMS: Matrix3[] = [
  RY.clone().multiply(FX),
  RZ.clone().multiply(FY),
  new Matrix3(),
  new Matrix3(),
  new Matrix3(),
  new Matrix3(),
  new Matrix3(),
  new Matrix3(),
];

@Component({
  selector: 'hilbert',
  templateUrl: '../../widgets/three-demo/three-demo.component.html',
  styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
  standalone: true,
  imports: [CommonModule]
})
export class HilbertComponent extends ThreeDemoComponent implements OnDestroy {
  pane?: Pane;
  dirty: boolean = true;
  n: number = 2;
  thickness: number = 0.5;

  oc?: OrbitControls;

  points: InstancedMesh;
  path: InstancedMesh;

  light: PointLight = new PointLight(0xffffff, 100);
  ambient: AmbientLight = new AmbientLight(0xffffff, 0.5);

  constructor() {
    super();

    if (!this.isPreview) {
      this.oc = new OrbitControls(this.camera, this.renderer.domElement);
      this.pane = new Pane();
      this.pane.addBinding(this, 'n', {min: 1, max: 5, step: 1}).on('change', () => {
        this.dirty = true;
      });
      this.pane.addBinding(this, 'thickness', {min: 0.01, max: 1, step: 0.01}).on('change', () => {
        this.dirty = true;
      });
    }

    this.light.position.set(2, 4, 6);

    const vertices = this.generateVertices(this.n);
    this.points = this.makePoints(vertices);
    this.path = this.makePath(vertices);
  }

  generateVertices(n: number): Vector3[] {
    if (n <= 1) {
      return CORNERS.map(v => v.clone());
    }
    const vertices: Vector3[] = [];
    const sublevel = this.generateVertices(n - 1);
    // Intervals: 2^n - 1
    // Intervals per side: 2^(n-1) - 1
    // 2 -> (2^(n-1) - 1 / 2^n - 1)
    // Center should go to 1 - scaleFactor
    const scaleFactor = (Math.pow(2, n - 1) - 1) / (Math.pow(2, n) - 1);
    for (let i = 0; i < 4; i++) {
      const t = CORNERS[i].clone().multiplyScalar(1 - scaleFactor);
      vertices.push(
        ...sublevel.map(
          v => v.clone().applyMatrix3(TRANSFORMS[i]).multiplyScalar(scaleFactor).add(t)
        )
      );
    }
    return vertices;
  }

  makePoints(vertices: Vector3[]): InstancedMesh {
    const r = this.thickness / (Math.pow(2, this.n) - 1)
    const geom = new SphereGeometry(r, 36, 36);
    const im = new InstancedMesh(geom,
      new MeshPhongMaterial({color: 0xffffff, side: DoubleSide}),
      vertices.length);
    for (let i = 0; i < vertices.length; i++) {
      im.setMatrixAt(i, new Matrix4().makeTranslation(vertices[i]));
      im.setColorAt(i, new Color().setRGB(i / vertices.length, 1 - i / vertices.length, 1));
    }
    im.instanceMatrix.needsUpdate = true;
    return im;
  }

  makePath(vertices: Vector3[], close = false): InstancedMesh {
    const r = this.thickness / (Math.pow(2, this.n) - 1)
    const n = close ? vertices.length : vertices.length - 1;
    const edgeMesh = new InstancedMesh(
      new CylinderGeometry(r, r, 1, 36, 12, true),
      new MeshPhongMaterial({color: 0xffffff, side: DoubleSide}),
      n,
    );
    for (let i = 0; i < n; i++) {
      const start = vertices[i];
      const end = vertices[(i + 1) % vertices.length];
      const l = end.distanceTo(start);
      const s = new Matrix4().makeScale(1, l, 1);
      const axis = end.clone().sub(start).normalize();
      let angle = Math.acos(axis.y);
      if (closeEnough(angle, Math.PI)) angle = 0;
      const rotAxis = new Vector3(0, 1, 0).cross(axis).normalize();
      const rot = new Matrix4().makeRotationAxis(rotAxis, angle);
      const t = new Matrix4().makeTranslation(start.clone().lerp(end, 0.5));
      const m = s.premultiply(rot).premultiply(t);
      edgeMesh.setMatrixAt(i, m);
      edgeMesh.setColorAt(i, new Color().setRGB(i / n, 1 - i / n, 1));
    }
    edgeMesh.instanceMatrix.needsUpdate = true;
    return edgeMesh;
  }

  override frame(dt: number): void {
    if (this.dirty) {
      this.dirty = false;
      const vertices = this.generateVertices(this.n);
      this.points = this.makePoints(vertices);
      this.path = this.makePath(vertices);
      this.scene.clear();
      this.scene.add(this.light, this.ambient);
      this.scene.add(this.points, this.path);
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.pane?.dispose();
  }
}