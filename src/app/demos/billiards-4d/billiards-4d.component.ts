import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {
    BufferGeometry,
    CircleGeometry,
    Group,
    Line,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    Points,
    PointsMaterial,
    Vector2,
    Vector4
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {EuclideanPolygon} from "../../../math/geometry/euclidean-polygon";
import {closeEnough, EPSILON} from "../../../math/math-helpers";
import {fixTime} from "../../../math/billiards/tables";
import {GUI} from "dat.gui";
import {EuclideanShape} from "../../../math/geometry/euclidean-shape";
import {EuclideanEllipse} from "../../../math/geometry/euclidean-ellipse";

enum Projection {
  XY,
  XZ,
  XW,
  YZ,
  YW,
  ZW,
  XYZ,
  XYW,
  XZW,
  YZW,
}

@Component({
  selector: 'billiards-4d',
  templateUrl: '../../widgets/three-demo/three-demo.component.html',
  styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
  standalone: true,
  imports: [CommonModule]
})
export class Billiards4DComponent extends ThreeDemoComponent {
  orbitControls: OrbitControls;
  // tesseract = new Tesseract();
  // p1 = new Vector4(1, 0.2, -0.3, -0.7);
  // p2 = new Vector4(-0.1, 0.4, 1, 0.5);
  // outerStart = new Vector4(2, 2, 2, 2);
  // trajectory: Vector4[] = [];
  dirty = true;
  // projection: Projection = Projection.XYZ;
  qn = 2;
  pn = 2;
  qRot = 0;
  pRot = 0;
  qEcc = 0;
  pEcc = 0;
  qAR = 1;
  pAR = 1;


  qShape: EuclideanShape = EuclideanPolygon.regular(this.qn).rotate(this.qRot * Math.PI / this.qn);
  pShape: EuclideanShape = EuclideanPolygon.regular(this.pn).rotate(this.pRot * Math.PI / this.pn);

  qTime: number = 0;
  pTime: number = 0;
  iterations: number = 10;

  qOrbit: Vector2[] = [];
  pOrbit: Vector2[] = [];
  phase: Vector2[] = [];

  gui: GUI;

  constructor() {
    super();
    this.gui = new GUI();
    this.updateGUI();
    this.useOrthographic = true;
    this.updateOrthographicCamera();
    this.orbitControls = new OrbitControls(this.orthographicCamera, this.renderer.domElement);
    this.orbitControls.enableRotate = false;
    this.orbitControls.enablePan = true;
    this.orbitControls.zoomToCursor = true;
  }

  private updateGUI() {
    this.gui.destroy();
    this.gui = new GUI();

    this.gui.add(this, 'iterations', 0, 10000, 1).onChange(() => {
      this.dirty = true;
    });

    let qFolder = this.gui.addFolder('Q Shape');
    qFolder.add(this, 'qn', 2, 12, 1).onChange(() => {
      this.dirty = true;
    }).onFinishChange(this.updateGUI.bind(this));
    if (this.qn < 3) {
      qFolder.add(this, 'qEcc', 0, 0.99, 0.01).onChange(() => {
        this.dirty = true
      });
    } else if (this.qn === 4) {
      qFolder.add(this, 'qAR', 0.25, 4, 0.05).onChange(() => {
        this.dirty = true
      });
    }
    qFolder.add(this, 'qRot', 0, 1, 0.01).onChange(() => {
      this.dirty = true;
    });
    qFolder.open();

    let pFolder = this.gui.addFolder('P Shape');
    pFolder.add(this, 'pn', 2, 12, 1).onChange(() => {
      this.dirty = true;
    }).onFinishChange(this.updateGUI.bind(this));
    if (this.pn < 3) {
      pFolder.add(this, 'pEcc', 0, 0.99, 0.01).onChange(() => {
        this.dirty = true
      });
    } else if (this.pn === 4) {
      pFolder.add(this, 'pAR', 0.25, 4, 0.05).onChange(() => {
        this.dirty = true
      });
    }
    pFolder.add(this, 'pRot', 0, 1, 0.01).onChange(() => {
      this.dirty = true;
    });
    pFolder.open();
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.gui.destroy();
  }

  private processKeyboardInput(dt: number) {
    let dq = 0;
    let dp = 0;
    if (this.keyHeld('KeyW')) dp += 1;
    if (this.keyHeld('KeyS')) dp -= 1;
    if (this.keyHeld('KeyD')) dq += 1;
    if (this.keyHeld('KeyA')) dq -= 1;
    if (dq !== 0 || dp !== 0) this.dirty = true;
    let multiplier = 1;
    if (this.keyHeld('ShiftLeft')) multiplier *= 0.1;
    if (this.keyHeld('AltLeft')) multiplier *= 0.01;
    dq *= dt * multiplier * 0.1;
    dp *= dt * multiplier * 0.1;
    this.qTime += dq;
    this.pTime += dp;
    this.qTime = fixTime(this.qTime);
    this.pTime = fixTime(this.pTime);
  }

  override frame(dt: number): void {
    this.processKeyboardInput(dt);
    if (!this.dirty) return;
    this.dirty = false;
    if (this.qn >= 3) {
      if (this.qn === 3) {
        this.qShape = new EuclideanPolygon([new Vector2(0, 0), new Vector2(1, 0), new Vector2(0, 1)]).rotate(this.qRot * Math.PI);
      } else if (this.qn === 4) {
        let theta = Math.atan(this.qAR);
        let c = Math.cos(theta);
        let s = Math.sin(theta);
        this.qShape = new EuclideanPolygon([
          new Vector2(c, s), new Vector2(-c, s), new Vector2(-c, -s), new Vector2(c, -s),
        ]).rotate(this.qRot * Math.PI / this.qn);
      } else {
        this.qShape = EuclideanPolygon.regular(this.qn).rotate(this.qRot * Math.PI / this.qn);
      }
    } else this.qShape = new EuclideanEllipse(this.qEcc, new Vector2(), Math.PI * this.qRot);
    if (this.pn >= 3) {
      if (this.pn === 4) {
        let theta = Math.atan(this.pAR);
        let c = Math.cos(theta);
        let s = Math.sin(theta);
        this.pShape = new EuclideanPolygon([
          new Vector2(c, s), new Vector2(-c, s), new Vector2(-c, -s), new Vector2(c, -s),
        ]).rotate(this.pRot * Math.PI / this.pn);
      } else {
        this.pShape = EuclideanPolygon.regular(this.pn).rotate(this.pRot * Math.PI / this.pn);
      }
    } else this.pShape = new EuclideanEllipse(this.pEcc, new Vector2(), Math.PI * this.pRot);

    this.iterateInner(this.iterations);
    this.scene.clear();

    let left = new Group();
    left.add(this.qShape.drawable(0xffffff));
    left.add(new Line(new BufferGeometry().setFromPoints(this.qOrbit), new LineBasicMaterial({color: 0xff8888})));
    left.translateX(-1.25);
    left.translateY(0.25);
    this.scene.add(left);

    let right = new Group();
    right.add(this.pShape.drawable(0xffffff));
    right.add(new Line(new BufferGeometry().setFromPoints(this.pOrbit), new LineBasicMaterial({color: 0x8888ff})));
    right.translateX(1.25);
    right.translateY(0.25);
    this.scene.add(right);

    let frame: Vector2[] = [];
    let qn = this.qn < 3 ? 1 : this.qn;
    let pn = this.pn < 3 ? 1 : this.pn;
    for (let i = 0; i <= qn; i++) {
      frame.push(new Vector2(2 * i / qn - 1, -1), new Vector2(2 * i / qn - 1, 1));
    }
    for (let i = 0; i <= pn; i++) {
      frame.push(new Vector2(-1, 2 * i / pn - 1), new Vector2(1, 2 * i / pn - 1));
    }
    let firstDot = new Mesh(new CircleGeometry(0.0125), new MeshBasicMaterial({color: 0x00ff00}));
    firstDot.translateX(2 * this.phase[0].x - 1);
    firstDot.translateY(2 * this.phase[0].y - 1);
    firstDot.translateZ(0.1);
    let phaseFrame = new LineSegments(new BufferGeometry().setFromPoints(frame), new LineBasicMaterial({color: 0xffffff}));
    let phaseDots = new Points(
      new BufferGeometry().setFromPoints(this.phase.map(({
                                                           x, y
                                                         }) => new Vector2(2 * x - 1, 2 * y - 1))), new PointsMaterial({
        color: 0xff88ff,
        size: 2
      }));
    let phaseGroup = new Group();
    phaseGroup.add(phaseFrame, phaseDots, firstDot);

    phaseGroup.translateY(-2);
    this.scene.add(phaseGroup);
    // switch (this.projection) {
    // case Projection.XY:
    //     const xy = new Group();
    //     xy.add(new Mesh(new PlaneGeometry(2, 2), new MeshBasicMaterial({color: 0x888888})));
    //     const xyPoints = new Line(new BufferGeometry().setFromPoints(
    //         this.trajectory.map(v => new Vector3(v.x, v.y, 1))
    //     ), new LineBasicMaterial({color: 0xffffff}));
    //     xy.add(xyPoints);
    //     this.scene.add(xy);
    //     break;
    // case Projection.XZ:
    //     const xz = new Group();
    //     xz.add(new Mesh(new PlaneGeometry(2, 2), new MeshBasicMaterial({color: 0x888888})));
    //     const xzPoints = new Line(new BufferGeometry().setFromPoints(
    //         this.trajectory.map(v => new Vector3(v.x, v.z, 1))
    //     ), new LineBasicMaterial({color: 0xffffff}));
    //     xz.add(xzPoints);
    //     this.scene.add(xz);
    //     break;
    // case Projection.XW:
    //     const xw = new Group();
    //     xw.add(new Mesh(new PlaneGeometry(2, 2), new MeshBasicMaterial({color: 0x888888})));
    //     const xwPoints = new Line(new BufferGeometry().setFromPoints(
    //         this.trajectory.map(v => new Vector3(v.x, v.w, 1))
    //     ), new LineBasicMaterial({color: 0xffffff}));
    //     xw.add(xwPoints);
    //     this.scene.add(xw);
    //     break;
    // case Projection.YZ:
    //     const yz = new Group();
    //     yz.add(new Mesh(new PlaneGeometry(2, 2), new MeshBasicMaterial({color: 0x888888})));
    //     const yzPoints = new Line(new BufferGeometry().setFromPoints(
    //         this.trajectory.map(v => new Vector3(v.y, v.z, 1))
    //     ), new LineBasicMaterial({color: 0xffffff}));
    //     yz.add(yzPoints);
    //     this.scene.add(yz);
    //     break;
    // case Projection.YW:
    //     const yw = new Group();
    //     yw.add(new Mesh(new PlaneGeometry(2, 2), new MeshBasicMaterial({color: 0x888888})));
    //     const ywPoints = new Line(new BufferGeometry().setFromPoints(
    //         this.trajectory.map(v => new Vector3(v.y, v.w, 1))
    //     ), new LineBasicMaterial({color: 0xffffff}));
    //     yw.add(ywPoints);
    //     this.scene.add(yw);
    //     break;
    // case Projection.ZW:
    //     const zw = new Group();
    //     zw.add(new Mesh(new PlaneGeometry(2, 2), new MeshBasicMaterial({color: 0x888888})));
    //     const zwPoints = new Line(new BufferGeometry().setFromPoints(
    //         this.trajectory.map(v => new Vector3(v.z, v.w, 1))
    //     ), new LineBasicMaterial({color: 0xffffff}));
    //     zw.add(zwPoints);
    //     this.scene.add(zw);
    //     break;
    // case Projection.XYZ:
    //     const xyz = new Group();
    //     xyz.add(new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial({color: 0x888888, wireframe: true})));
    //     const xyzPoints = new Line(new BufferGeometry().setFromPoints(
    //         this.trajectory.map(v => new Vector3(v.x, v.y, v.z))
    //     ), new LineBasicMaterial({color: 0xffffff}));
    //     xyz.add(xyzPoints);
    //     this.scene.add(xyz);
    //     break;
    // case Projection.XYW:
    //     const xyw = new Group();
    //     xyw.add(new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial({color: 0x888888, wireframe: true})));
    //     const xywPoints = new Line(new BufferGeometry().setFromPoints(
    //         this.trajectory.map(v => new Vector3(v.x, v.y, v.w))
    //     ), new LineBasicMaterial({color: 0xffffff}));
    //     xyw.add(xywPoints);
    //     this.scene.add(xyw);
    //     break;
    // case Projection.XZW:
    //     const xzw = new Group();
    //     xzw.add(new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial({color: 0x888888, wireframe: true})));
    //     const xzwPoints = new Line(new BufferGeometry().setFromPoints(
    //         this.trajectory.map(v => new Vector3(v.x, v.z, v.w))
    //     ), new LineBasicMaterial({color: 0xffffff}));
    //     xzw.add(xzwPoints);
    //     this.scene.add(xzw);
    //     break;
    // case Projection.YZW:
    //     const yzw = new Group();
    //     yzw.add(new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial({color: 0x888888, wireframe: true})));
    //     const yzwPoints = new Line(new BufferGeometry().setFromPoints(
    //         this.trajectory.map(v => new Vector3(v.y, v.z, v.w))
    //     ), new LineBasicMaterial({color: 0xffffff}));
    //     yzw.add(yzwPoints);
    //     this.scene.add(yzw);
    //     break;
    // }
  }

  iterateInner(iters: number) {
    console.clear();
    let q, p;
    try {
      q = this.qShape.param(this.qTime);
      p = this.pShape.param(this.pTime);
    } catch (e) {
      console.log(e);
      return;
    }
    this.qOrbit = [q.point.clone()];
    this.pOrbit = [p.point.clone()];
    this.phase = [new Vector2(this.qTime, this.pTime)];
    let qt = this.qTime;
    let pt = this.pTime;
    for (let i = 0; i < iters; i++) {
      let qd = p.normal.dot(q.normal);
      if (closeEnough(qd, 0)) break;
      let qdir = p.normal.clone().multiplyScalar(qd > 0 ? -1 : 1);
      let qsrc = q.point.clone().addScaledVector(qdir, EPSILON);
      try {
        let qCollision = this.qShape.castRay({src: qsrc, dir: qdir});
        q = this.qShape.param(qCollision.paramTime);
        qt = qCollision.paramTime;
        this.qOrbit.push(q.point.clone());
        this.phase.push(new Vector2(qt, pt));
      } catch (e) {
        console.error(e);
        break;
      }

      let pd = q.normal.dot(p.normal);
      if (closeEnough(pd, 0)) break;
      let pdir = q.normal.clone().multiplyScalar(pd > 0 ? -1 : 1);
      let psrc = p.point.clone().addScaledVector(pdir, EPSILON);
      try {
        let pCollision = this.pShape.castRay({src: psrc, dir: pdir});
        p = this.pShape.param(pCollision.paramTime);
        pt = pCollision.paramTime;
        this.pOrbit.push(p.point.clone());
        this.phase.push(new Vector2(qt, pt));
      } catch (e) {
        console.error(e);
        break;
      }
    }
    // let x = this.p1.clone();
    // let y = this.p2.clone();
    // this.trajectory = [x.clone(), y.clone()];
    // for (let i = 0; i < iters; i++) {
    //     let z: Vector4;
    //     try {
    //         z = this.innerSymplectic(x, y);
    //     } catch (e) {
    //         console.log(i, e);
    //         break;
    //     }
    //     this.trajectory.push(z.clone());
    //     x = y.clone();
    //     y = z.clone();
    // }
    // console.log(this.trajectory);
  }

  // iterateOuter(iters: number) {
  //     let x = this.outerStart.clone();
  //     this.trajectory = [x.clone()];
  //     for (let i = 0; i < iters; i++) {
  //         let y: Vector4;
  //         try {
  //             y = this.outerSymplectic(x);
  //         } catch (e) {
  //             console.log(i, e);
  //             break;
  //         }
  //         this.trajectory.push(y.clone());
  //         x = y.clone();
  //         if (x.equals(this.outerStart)) {
  //             console.log('periodic:', i + 1);
  //             break;
  //         }
  //     }
  // }

  // innerSymplectic(p1: Vector4, p2: Vector4): Vector4 {
  //     const ray: Ray4D = {
  //         src: p1,
  //         dir: applyJ(this.tesseract.normal(p2)),
  //     }
  //     const intersection = this.tesseract.castRay(ray);
  //     if (intersection === undefined) throw Error('no intersection');
  //     return intersection.point;
  // }
  //
  // private outerSymplectic(p: Vector4): Vector4 {
  //     for (let x of [-1, +1]) {
  //         let vx = applyJ(new Vector4(x, 0, 0, 0));
  //         for (let y of [-1, +1]) {
  //             let vy = applyJ(new Vector4(0, y, 0, 0));
  //             for (let z of [-1, +1]) {
  //                 let vz = applyJ(new Vector4(0, 0, z, 0));
  //                 for (let w of [-1, +1]) {
  //                     let vw = applyJ(new Vector4(0, 0, 0, w));
  //                     let vertex = new Vector4(x, y, z, w);
  //                     if (checkCone(p.clone().sub(vertex), [vx, vy, vz, vw])) {
  //                         return p.clone().add(vertex.sub(p).multiplyScalar(2));
  //                     }
  //                 }
  //             }
  //         }
  //     }
  //     throw Error('no vertex claims this point');
  // }
}

function applyJ(v: Vector4): Vector4 {
  return new Vector4(-v.z, -v.w, v.x, v.y);
}

function checkCone(p: Vector4, vectors: Vector4[]) {
  for (let v of vectors) {
    if (p.dot(v) <= 0) return false;
  }
  return true;
  // for (let i = 0; i < vectors.length - 3; i++) {
  //     for (let j = i + 1; j < vectors.length - 2; j++) {
  //         for (let k = j + 1; k < vectors.length - 1; k++) {
  //             for (let l = k + 1; l < vectors.length; l++) {
  //
  //             }
  //         }
  //     }
  // }
}