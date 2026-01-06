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
  Vector2
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {EuclideanPolygon} from "../../../math/geometry/euclidean-polygon";
import {closeEnough, EPSILON} from "../../../math/math-helpers";
import {fixTime} from "../../../math/billiards/tables";
import {GUI} from "dat.gui";
import {EuclideanShape} from "../../../math/geometry/euclidean-shape";
import {smoothPolygon} from "../../../math/billiards/affine-oval-table";
import {EuclideanEllipse} from "../../../math/geometry/euclidean-ellipse";

enum TableType {
  POLYGON = 'Polygon',
  ELLIPSE = 'Ellipse',
  SMOOTH = 'Smooth',
  QUAD = 'Quad',
}

interface TableParams {
  polygonN: number,
  ellipseEcc: number,
  smoothN: number,
  smoothP: number,
  rotation: number,
}

function createShape(type: TableType, params: TableParams): EuclideanShape {
  const theta = params.rotation * Math.PI;
  switch (type) {
  case TableType.POLYGON:
    return EuclideanPolygon.regular(params.polygonN).rotate(theta);
  case TableType.ELLIPSE:
    return new EuclideanEllipse(params.ellipseEcc, new Vector2(), theta);
  case TableType.SMOOTH:
    return smoothPolygon(params.smoothN, params.smoothP).rotate(theta);
  case TableType.QUAD:
    return new EuclideanPolygon([
      new Vector2(-1, -1), new Vector2(2, -1), new Vector2(0, 1), new Vector2(-1, 0),
    ]).scale(0.5).rotate(theta);
  }
}

@Component({
  selector: 'minkowski',
  templateUrl: '../../widgets/three-demo/three-demo.component.html',
  styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
  standalone: true,
  imports: [CommonModule]
})
export class MinkowskiBilliardsComponent extends ThreeDemoComponent {
  orbitControls: OrbitControls;
  dirty = true;

  qType: TableType = TableType.POLYGON;
  pType: TableType = TableType.POLYGON;

  qParams: TableParams = {
    polygonN: 3,
    ellipseEcc: 0.9,
    smoothN: 5,
    smoothP: 1.4,
    rotation: 0,
  }

  pParams: TableParams = {
    polygonN: 3,
    ellipseEcc: 0.9,
    smoothN: 5,
    smoothP: 1.4,
    rotation: 0.5,
  }

  qShape!: EuclideanShape;
  pShape!: EuclideanShape;

  showFirstPoint: boolean = true;

  qTime: number = 0.123;
  pTime: number = 0.456;
  iterations: number = 1;

  qOrbit: Vector2[] = [];
  pOrbit: Vector2[] = [];
  phase: Vector2[] = [];

  gui: GUI;

  boundaryMaterial: LineBasicMaterial;
  phaseMaterial: PointsMaterial;

  phaseDots: Points = new Points();

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
    this.registerColor('boundary', 0x000000, 0xffffff);
    this.registerColor('phase', 0x880088, 0xff88ff);
    this.registerColor('left', 0xaa0000, 0xaa4444);
    this.registerColor('right', 0x0000aa, 0x4444aa);
    this.boundaryMaterial = new LineBasicMaterial();
    this.phaseMaterial = new PointsMaterial({
      color: this.getColor('phase'),
      size: 2
    });
    this.registerMaterial(this.boundaryMaterial, 'boundary');
    this.registerMaterial(this.phaseMaterial, 'phase');
    this.setShapes();

    this.colorScheme.register('clear', 0xffffff, 0x000000);
  }

  private updateGUI() {
    this.gui.destroy();
    this.gui = new GUI();

    this.gui.add(this, 'iterations', 0, 20, 1)
      .name('log2(iters)')
      .onChange(() => {
        this.dirty = true;
      });

    let qFolder = this.gui.addFolder('Q Shape');
    qFolder.add(this, 'qType').options(Object.values(TableType)).name('Type')
      .onChange(() => {
        this.dirty = true;
      })
      .onFinishChange(this.updateGUI.bind(this));
    switch (this.qType) {
    case TableType.POLYGON:
      qFolder.add(this.qParams, 'polygonN', 3, 12, 1).name('n').onChange(() => {
        this.dirty = true;
      });
      break;
    case TableType.ELLIPSE:
      qFolder.add(this.qParams, 'ellipseEcc', 0, 0.99, 0.01).name('Eccentricity')
        .onChange(() => {
          this.dirty = true;
        });
      break;
    case TableType.SMOOTH:
      qFolder.add(this.qParams, 'smoothN', 3, 12, 1).name('n').onChange(() => {
        this.dirty = true;
      });
      qFolder.add(this.qParams, 'smoothP', 1.1, 2, 0.01).name('p').onChange(() => {
        this.dirty = true;
      });
      break;
    case TableType.QUAD:
      break;
    }
    qFolder.add(this.qParams, 'rotation', 0, 1, 0.01).name('Rotation').onChange(() => {
      this.dirty = true;
    });
    qFolder.open();

    let pFolder = this.gui.addFolder('P Shape');
    pFolder.add(this, 'pType').options(Object.values(TableType)).name('Type')
      .onChange(() => {
        this.dirty = true;
      })
      .onFinishChange(this.updateGUI.bind(this));
    switch (this.pType) {
    case TableType.POLYGON:
      pFolder.add(this.pParams, 'polygonN', 3, 12, 1).name('n').onChange(() => {
        this.dirty = true;
      });
      break;
    case TableType.ELLIPSE:
      pFolder.add(this.pParams, 'ellipseEcc', 0, 0.99, 0.01).name('Eccentricity')
        .onChange(() => {
          this.dirty = true;
        });
      break;
    case TableType.SMOOTH:
      pFolder.add(this.pParams, 'smoothN', 3, 12, 1).name('n').onChange(() => {
        this.dirty = true;
      });
      pFolder.add(this.pParams, 'smoothP', 1.1, 2, 0.01).name('p').onChange(() => {
        this.dirty = true;
      });
      break;
    case TableType.QUAD:
      break;
    }
    pFolder.add(this.pParams, 'rotation', 0, 1, 0.01).name('Rotation').onChange(() => {
      this.dirty = true;
    });
    pFolder.open();

    let drawFolder = this.gui.addFolder('Draw');
    drawFolder.add(this, 'showFirstPoint').name('Show initial').onChange(() => {
      this.dirty = true;
    });
    drawFolder.open();
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.gui.destroy();
  }

  private processKeyboardInput(dt: number) {
    let dq = 0;
    let dp = 0;
    if (this.keyHeld('ArrowUp')) dp += 1;
    if (this.keyHeld('ArrowDown')) dp -= 1;
    if (this.keyHeld('ArrowRight')) dq += 1;
    if (this.keyHeld('ArrowLeft')) dq -= 1;
    if (dq !== 0 || dp !== 0) this.dirty = true;
    let multiplier = 1;
    if (this.keyHeld('ShiftLeft') || this.keyHeld('ShiftRight')) multiplier *= 0.1;
    if (this.keyHeld('AltLeft') || this.keyHeld('AltRight')) multiplier *= 0.01;
    dq *= dt * multiplier * 0.1;
    dp *= dt * multiplier * 0.1;
    this.qTime += dq;
    this.pTime += dp;
    this.qTime = fixTime(this.qTime);
    this.pTime = fixTime(this.pTime);
  }

  setShapes() {
    this.qShape = createShape(this.qType, this.qParams);
    this.pShape = createShape(this.pType, this.pParams);
  }

  override frame(dt: number): void {
    this.renderer.setClearColor(this.getColor('clear'));
    this.renderer.clear();
    this.processKeyboardInput(dt);
    if (this.dirty) {
      this.dirty = false;
      this.setShapes();

      this.iterateInner(Math.pow(2, this.iterations));
    }
    this.scene.clear();

    let left = new Group();
    left.add(this.qShape.drawable(this.getColor('boundary')));
    left.add(new Line(new BufferGeometry().setFromPoints(this.qOrbit), new LineBasicMaterial({color: this.getColor('left')})));
    left.translateX(-1.25);
    left.translateY(0.25);
    this.scene.add(left);

    let right = new Group();
    right.add(this.pShape.drawable(this.getColor('boundary')));
    right.add(new Line(new BufferGeometry().setFromPoints(this.pOrbit), new LineBasicMaterial({color: this.getColor('right')})));
    right.translateX(1.25);
    right.translateY(0.25);
    this.scene.add(right);

    let frame: Vector2[] = [];
    let qCorners = this.qShape.corners();
    if (qCorners.length < 2) qCorners = [0, 1];
    let pCorners = this.pShape.corners();
    if (pCorners.length < 2) pCorners = [0, 1];
    for (let c of qCorners) {
      frame.push(new Vector2(2 * c - 1, -1), new Vector2(2 * c - 1, 1));
    }
    for (let c of pCorners) {
      frame.push(new Vector2(-1, 2 * c - 1), new Vector2(1, 2 * c - 1));
    }
    let firstDot = new Mesh(new CircleGeometry(0.0125), new MeshBasicMaterial({color: 0x00ff00}));
    firstDot.translateX(2 * this.phase[0].x - 1);
    firstDot.translateY(2 * this.phase[0].y - 1);
    firstDot.translateZ(0.1);
    let phaseFrame = new LineSegments(new BufferGeometry().setFromPoints(frame), this.boundaryMaterial);
    this.phaseDots = new Points(
      new BufferGeometry().setFromPoints(this.phase.map((
        {x, y}) => new Vector2(2 * x - 1, 2 * y - 1))), this.phaseMaterial);
    let phaseGroup = new Group();
    phaseGroup.add(phaseFrame, this.phaseDots);
    if (this.showFirstPoint) phaseGroup.add(firstDot);

    phaseGroup.translateY(-2);
    this.scene.add(phaseGroup);
  }

  iterateInner(iters: number) {
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
        console.warn(e);
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
        console.warn(e);
        break;
      }
      if (closeEnough(qt, this.qTime) && closeEnough(pt, this.pTime)) break;
    }
  }
}
