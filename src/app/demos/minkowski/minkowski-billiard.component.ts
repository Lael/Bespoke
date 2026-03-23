import {AfterViewInit, Component, ElementRef, inject, OnInit, ViewChild} from "@angular/core";
import {AngularSplitModule} from "angular-split";
import {
  ArrowHelper,
  AxesHelper,
  BufferGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Scene,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {EuclideanShape} from "../../../math/geometry/euclidean-shape";
import {Previewable} from "../../app.routes";
import {Pane} from "../../widgets/pane";
import {EuclideanPolygon} from "../../../math/geometry/euclidean-polygon";
import {EuclideanEllipse} from "../../../math/geometry/euclidean-ellipse";
import {smoothPolygon} from "../../../math/billiards/affine-oval-table";
import {closeEnough, EPSILON} from "../../../math/math-helpers";
import {PaneDemo} from "../pane-demo";
import {SettingsPanelComponent} from "../../widgets/settings/settings-panel.component";
import {Gui, GuiFolder} from "../../widgets/settings/settings";
import {LineSegments2} from "three/examples/jsm/lines/LineSegments2.js";
import {populateLineGeometry, populateLineSegmentsGeometry} from "../demo-helpers";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial.js";
import {LineSegmentsGeometry} from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import {Line2} from "three/examples/jsm/lines/Line2.js";
import {LineGeometry} from "three/examples/jsm/lines/LineGeometry.js";
import {RoundPoints, RoundPointsMaterial} from "../../../graphics/round-points";
import {fixTime} from "../../../math/billiards/tables";
import {MatButtonModule} from "@angular/material/button";
import {MatIcon} from "@angular/material/icon";
import {MatTableModule} from "@angular/material/table";
import {HelpDialogComponent, HelpDialogData} from "../../widgets/help-dialog/help-dialog.component";
import {MatDialog} from "@angular/material/dialog";
import {Face, Polyhedron} from "../../../math/geometry/polyhedron";
import {MatTooltipModule} from "@angular/material/tooltip";
import {PolyhedronNet} from "../../../math/geometry/polyhedron-net";
import {AffinePiecewiseTable} from "../../../math/billiards/affine-piecewise-table";
import {Complex} from "../../../math/complex/complex";

const ARROW_LENGTH: number = 0.25;
const HEAD_LENGTH: number = 0.1;
const HEAD_WIDTH: number = 0.075;

interface State2D {
  qTime: number;
  qPoint: Vector2;
  qNormal: Vector2;
  pTime: number;
  pPoint: Vector2;
  pNormal: Vector2;
}

interface State3D {
  qPoint: Vector3;
  qFace: Face;
  pPoint: Vector3;
  pFace: Face;
}

enum TableType {
  REGULAR = 'Regular',
  ELLIPSE = 'Ellipse',
  SMOOTH = 'Smooth',
  QUAD = 'Quad',
  // TWENTY = 'Twenty',
  PENTHOUSE = 'Penthouse',
}

enum PlatonicSolid {
  TETRAHEDRON = 'Tetrahedron',
  TETRAHEDRON2 = 'Dual Tetrahedron',
  CUBE = 'Cube',
  OCTAHEDRON = 'Octahedron',
  DODECAHEDRON = 'Dodecahedron',
  ICOSAHEDRON = 'Icosahedron',
}

interface TableParams {
  type: TableType,
  polygonN: number,
  radius: number,
  ellipseEcc: number,
  smoothP: number,
  rotation: number,
  penthouse: Vector2,
  platonic: PlatonicSolid,
  scale: Vector3,
  rotateVector: Vector3,
}

function createShape(params: TableParams): EuclideanShape {
  const theta = params.rotation * Math.PI;
  switch (params.type) {
  case TableType.REGULAR:
    if (params.radius === 0) return EuclideanPolygon.regular(params.polygonN).rotate(theta);
    // if (params.radius === 1) return new EuclideanEllipse(0, new Vector2(), theta);
    const vertices = [];
    const curvatures = [];
    const k = 1 / params.radius;
    const pin = Math.PI / params.polygonN;

    for (let i = 0; i < params.polygonN; i++) {
      const center = Complex.polar(1, 2 * i * pin + theta);
      const lo = Complex.polar(params.radius, (2 * i - 1) * pin + theta);
      const hi = Complex.polar(params.radius, (2 * i + 1) * pin + theta);
      vertices.push(center.plus(lo).toVector2(), center.plus(hi).toVector2());
      curvatures.push(k, 0);
    }
    return new AffinePiecewiseTable(vertices, curvatures);
  case TableType.ELLIPSE:
    return new EuclideanEllipse(params.ellipseEcc, new Vector2(), theta);
  case TableType.SMOOTH:
    return smoothPolygon(params.polygonN, params.smoothP).rotate(theta);
  case TableType.QUAD:
    return new EuclideanPolygon([
      new Vector2(-1, -1), new Vector2(2, -1), new Vector2(0, 1), new Vector2(-1, 0),
    ]).scale(0.5).rotate(theta);
  case TableType.PENTHOUSE:
    return new EuclideanPolygon([
      new Vector2(-1, 1), new Vector2(-1, -1), new Vector2(1, -1), new Vector2(1, 1),
      new Vector2(-1 + 2 * params.penthouse.x, 1 + 2 * params.penthouse.y)
    ]).scale(0.5).rotate(theta);
    // case TableType.TWENTY:
    //   const vs: Vector2[] = [];
    //   // for (let i = 0; i < 5; i++) {
    //   //   vs.push()
    //   // }
    //   return new EuclideanPolygon(vs
    //   ).rotate(theta);
  }
}

function choosePolyhedron(platonic: PlatonicSolid, t: Matrix4 = new Matrix4().identity()): Polyhedron {
  switch (platonic) {
  case PlatonicSolid.TETRAHEDRON:
    return Polyhedron.TETRAHEDRON.transform(t);
  case PlatonicSolid.TETRAHEDRON2:
    return Polyhedron.TETRAHEDRON2.transform(t);
  case PlatonicSolid.CUBE:
    return Polyhedron.CUBE.transform(t);
  case PlatonicSolid.OCTAHEDRON:
    return Polyhedron.OCTAHEDRON.transform(t);
  case PlatonicSolid.DODECAHEDRON:
    return Polyhedron.DODECAHEDRON.transform(t);
  case PlatonicSolid.ICOSAHEDRON:
    return Polyhedron.ICOSAHEDRON.transform(t);
  }
}

interface ResultRow {
  key: string,
  value: string | number,
  action?: () => void;
}

const arrowHead = new Shape().setFromPoints([
  new Vector2(-0.025, 0),
  new Vector2(-0.05, -0.05),
  new Vector2(0.1, 0),
  new Vector2(-0.05, 0.05),
]);

@Component({
  selector: 'minkowski-billiard',
  templateUrl: 'minkowski-panes.component.html',
  styleUrl: 'minkowski-panes.component.scss',
  standalone: true,
  imports: [AngularSplitModule, SettingsPanelComponent, MatButtonModule, MatIcon, MatTableModule, MatTooltipModule],
})
export class MinkowskiBilliardComponent extends PaneDemo implements Previewable, OnInit, AfterViewInit {
  private dialog = inject(MatDialog);
  orbitDirty: boolean = true;
  drawDirty: boolean = true;
  showSettings: boolean = true;
  results: ResultRow[] = [{
    key: 'Period',
    value: '?'
  }];
  displayedColumns: string[] = ['key', 'value'];
  dialogIsOpen: boolean = false;

  @ViewChild('container')
  containerRef?: ElementRef<HTMLDivElement>;
  container: HTMLDivElement | null = null;

  @ViewChild('canvas')
  canvasRef?: ElementRef<HTMLCanvasElement>;

  @ViewChild('table')
  tableRef?: ElementRef<HTMLDivElement>;
  tablePane!: Pane;

  @ViewChild('metric')
  metricRef?: ElementRef<HTMLDivElement>;
  metricPane!: Pane;

  @ViewChild('phase')
  phaseRef?: ElementRef<HTMLDivElement>;
  phasePane!: Pane;

  @ViewChild('qNet')
  qNetRef?: ElementRef<HTMLDivElement>;
  qNetPane!: Pane;

  @ViewChild('pNet')
  pNetRef?: ElementRef<HTMLDivElement>;
  pNetPane!: Pane;


  // Three.JS objects
  standardRenderer!: WebGLRenderer;

  qLineMat: LineMaterial;
  qDotMat: RoundPointsMaterial;
  pLineMat: LineMaterial;
  pDotMat: RoundPointsMaterial;

  boundaryMaterial: LineMaterial;
  qPhaseMat: LineMaterial;
  pPhaseMat: LineMaterial;
  phaseMaterial: RoundPointsMaterial;
  firstDotMat: RoundPointsMaterial;
  arrowHeadMat: MeshBasicMaterial;

  showAxes: boolean = true;
  pAxes = new AxesHelper(3);
  qAxes = new AxesHelper(3);

  vertexMaterial: MeshBasicMaterial = new MeshBasicMaterial();
  edgeMaterial: MeshBasicMaterial = new MeshBasicMaterial({
    side: DoubleSide,
  });
  qFaceMat: MeshBasicMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0.2,
    side: DoubleSide,
  });
  pFaceMat: MeshBasicMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0.2,
    side: DoubleSide,
  });

  leftMat: MeshBasicMaterial = new MeshBasicMaterial();
  rightMat: MeshBasicMaterial = new MeshBasicMaterial();

  // Data
  qTime: number = 0.123;
  pTime: number = 0.456;

  qStart = new Vector2(0.12, -0.34);
  qFace: number | undefined = undefined;
  qHeading: number = 0.5;
  pStart = new Vector2(0.67, -0.89);
  pFace: number | undefined = undefined;
  pHeading: number = 1.0;

  qOrbit: (Vector2 | Vector3)[] = [];
  pOrbit: (Vector2 | Vector3)[] = [];
  phase2D: Vector2[] = [];
  qPhase3D: Vector2[] = [];
  pPhase3D: Vector2[] = [];

  leftNormal: ArrowHelper = new ArrowHelper();
  leftVector: ArrowHelper = new ArrowHelper();
  leftBall: Mesh = new Mesh(new SphereGeometry(0.025), this.leftMat);

  rightNormal: ArrowHelper = new ArrowHelper();
  rightVector: ArrowHelper = new ArrowHelper();
  rightBall: Mesh = new Mesh(new SphereGeometry(0.025), this.rightMat);

  // Params
  dim3 = false;
  symplectic = true;
  logIters = 4;
  showFirstPoint = true;
  drawDots = false;
  opacity: number = 0.2;

  qParams: TableParams = {
    type: TableType.REGULAR,
    polygonN: 5,
    ellipseEcc: 0.9,
    smoothP: 1.4,
    radius: 0,
    rotation: 0,
    penthouse: new Vector2(0.6, 0.2),
    platonic: PlatonicSolid.DODECAHEDRON,
    scale: new Vector3(1, 1, 1),
    rotateVector: new Vector3(0, 0, 0),
  };

  pParams: TableParams = {
    ...this.qParams,
    rotation: 0.5,
    platonic: PlatonicSolid.ICOSAHEDRON,
    scale: new Vector3(1, 1, 1),
    rotateVector: new Vector3(0, 0, 0),
  };

  // Shapes
  qShape = createShape(this.qParams);
  pShape = createShape(this.pParams);

  qPolyhedron: Polyhedron = Polyhedron.CUBE;
  pPolyhedron: Polyhedron = Polyhedron.OCTAHEDRON;

  qNet: PolyhedronNet = new PolyhedronNet(this.qPolyhedron);
  pNet: PolyhedronNet = new PolyhedronNet(this.qPolyhedron);

  // Objects
  qDrawable: Object3D = new Object3D();
  qOrbitDrawable: Object3D = new Object3D();
  pDrawable: Object3D = new Object3D();
  pOrbitDrawable: Object3D = new Object3D();

  qNetDrawable: Object3D = new Object3D();
  pNetDrawable: Object3D = new Object3D();
  phaseFrame: Object3D = new Object3D();

  qTank: Mesh = new Mesh();
  pTank: Mesh = new Mesh();
  qPhase: RoundPoints = new RoundPoints();
  pPhase: RoundPoints = new RoundPoints();
  phaseDots: RoundPoints = new RoundPoints();

  qOrbitPoints: InstancedMesh | undefined = undefined;
  pOrbitPoints: InstancedMesh | undefined = undefined;

  oldQz: number = 1;
  oldQNz: number = 1;
  oldPz: number = 1;
  oldPNz: number = 1;

  gui = new Gui();

  helpData: HelpDialogData = {
    title: 'Minkowski Billiards',
    description: 'Billiards in two tables. The state is given by a point on the boundary of each table, and the map' +
      ' from state is as follows. Cast a ray inwards from the point on the first table in the direction parallel to' +
      ' the normal vector at the point on the second table and move the first point to the collision. Then, cast a' +
      ' ray in the second table parallel to the normal at the new point in the first table. Repeat.',
    sections: [{
      heading: 'Selecting the Tables',
      text:
        'The settings panel on the right can be used to select the tables.' +
        ' In 2D, you can select a regular polygon, one of several interesting polygons, an ellipse, or a smoothed' +
        ' polygon (caveat: some of these are not convex and exhibit incorrect behavior).' +
        ' If the "Symplectic" setting is active, the two tables are the same, but one is rotated relative to the' +
        ' other. If this setting is unchecked, the tables can be specified independently' +
        ' In 3D, you are limited to the platonic solids and there is no symplectic option.',
    }, {
      heading: 'Manipulating the Orbit',
      text:
        'In 2D, the arrow keys control a point in the square phase space (with coordinates given by parametrizations' +
        ' of the boundaries of the two tables. In 3D, clusters of keys are used to move the starting point in the' +
        ' nets of each polyhedron.',
    }, {
      heading: 'Interpreting the Output',
      text:
        'A single orbit is drawn at a time. The tables and trajectories shown in the upper half of the screen are' +
        ' self-explanatory. The orbit is also shown in the phase space. Some data is displayed in the case that the' +
        ' orbit is detected to be periodic.',
    }],
    keyBindings: [
      {
        cluster: [['', '↑', ''], ['←', '↓', '→']],
        effect: 'Move starting point in 2D phase space.'
      }, {
        cluster: [['', 'W', ''], ['A', 'S', 'D']],
        effect: 'Move starting point in table net.'
      }, {
        cluster: [['', 'I', ''], ['J', 'K', 'L']],
        effect: 'Move starting point in metric net.'
      }, {
        keys: ['Space'],
        effect: 'Attempt to converge to a periodic orbit in 2D.'
      }, {
        cluster: [['E', 'U']],
        effect: 'Attempt to converge to a periodic orbit in 3D.'
      }, {
        keys: ['Shift'],
        effect: 'Slow motion of points by 10x.'
      }, {
        keys: ['Alt'],
        effect: 'Slow motion of points by 100x.'
      }, {
        keys: ['?'],
        effect: 'Open this help panel.'
      },
    ],
  };

  constructor() {
    super();

    this.registerColor('clear', 0xffffff, 0x000000);
    this.registerColor('boundary', 0x000000, 0xffffff);
    this.registerColor('phase', 0x880088, 0xff88ff);
    this.registerColor('q', 0x00aaaa, 0x00aaaa);
    this.registerColor('p', 0xaa0000, 0xaa0000);
    this.registerColor('edge', 0x000000, 0xffffff);
    this.registerColor('vertex', 0x000000, 0xffffff);
    this.registerColor('first_dot', 0x880088, 0xff88ff);

    this.qLineMat = new LineMaterial({
      resolution: this.resolution,
      linewidth: 2,
    });
    this.pLineMat = new LineMaterial({
      resolution: this.resolution,
      linewidth: 2,
    });
    this.qDotMat = new RoundPointsMaterial({
      size: 10,
      sizeAttenuation: false,
    });
    this.pDotMat = new RoundPointsMaterial({
      size: 10,
      sizeAttenuation: false,
    });

    this.boundaryMaterial = new LineMaterial({resolution: this.resolution});
    this.qPhaseMat = new LineMaterial({resolution: this.resolution});
    this.pPhaseMat = new LineMaterial({resolution: this.resolution});
    this.phaseMaterial = new RoundPointsMaterial({size: 0.2});
    this.firstDotMat = new RoundPointsMaterial({size: 0.4});
    this.arrowHeadMat = new MeshBasicMaterial();

    this.registerColorable(this.edgeMaterial, 'edge');
    this.registerColorable(this.vertexMaterial, 'vertex');
    this.registerColorable(this.qLineMat, 'q');
    this.registerColorable(this.qDotMat, 'q');
    this.registerColorable(this.qFaceMat, 'q');
    this.registerColorable(this.leftMat, 'q');
    this.registerColorable(this.pLineMat, 'p');
    this.registerColorable(this.pDotMat, 'p');
    this.registerColorable(this.pFaceMat, 'p');
    this.registerColorable(this.rightMat, 'p');
    this.registerColorable(this.boundaryMaterial, 'boundary');
    this.registerColorable(this.qPhaseMat, 'q');
    this.registerColorable(this.pPhaseMat, 'p');
    this.registerColorable(this.phaseMaterial, 'phase');
    this.registerColorable(this.firstDotMat, 'first_dot');
    this.registerColorable(this.arrowHeadMat, 'first_dot');
    this.registerLineMat(this.qLineMat);
    this.registerLineMat(this.pLineMat);
    this.registerLineMat(this.boundaryMaterial);

    this.qShape = createShape(this.qParams);
    this.pShape = createShape(this.pParams);

    this.qTank = new Mesh(new ShapeGeometry(arrowHead), this.arrowHeadMat);
    this.pTank = new Mesh(new ShapeGeometry(arrowHead), this.arrowHeadMat);

    if (this.previewRenderer) {
      this.initPanes();
    }

    this.updateTables();
  }

  ngOnInit() {
    this.gui.add(this, 'dim3').name('3D').onChange((v) => {
      this.switchDimension(v);
    });
    this.gui.add(this, 'symplectic')
      .name('Symplectic')
      .tooltip('Forces the second table to be a rotated copy of the first one')
      .showIf(() => !this.dim3)
      .onChange(() => {
        this.updateTables();
      });
    const qFolder = this.gui.addFolder('Table');
    const pFolder = this.gui.addFolder('Metric');
    pFolder.showIf(() => !this.symplectic || this.dim3);

    const populateTableSettings = (params: TableParams, folder: GuiFolder) => {
      const formatAngle = (v: any) => {
        let i = v as number;
        if (i === 0) return '0';
        else if (i === 1) return 'π';
        else if (i === -1) return '-π';
        return `${v}π`
      }
      folder.add(params, 'type')
        .name('Type')
        .options(Object.values(TableType))
        .showIf(() => !this.dim3);
      folder.add(params, 'polygonN', 3, 12, 1)
        .name('n')
        .showIf(() => !this.dim3 && params.type === TableType.REGULAR);
      folder.add(params, 'radius', 0, 1, 0.01)
        .name('Radius')
        .showIf(() => !this.dim3 && params.type === TableType.REGULAR);
      folder.add(params, 'smoothP', 1.1, 2, 0.01)
        .name('Smoothness')
        .showIf(() => !this.dim3 && params.type === TableType.SMOOTH);
      folder.add(params, 'ellipseEcc', 0, 0.99, 0.01)
        .name('Eccentricity')
        .showIf(() => !this.dim3 && params.type === TableType.ELLIPSE);
      folder.add(params.penthouse, 'x', 0.01, 0.99, 0.01)
        .showIf(() => !this.dim3 && params.type === TableType.PENTHOUSE);
      folder.add(params.penthouse, 'y', 0.01, 0.99, 0.01)
        .showIf(() => !this.dim3 && params.type === TableType.PENTHOUSE);
      folder.add(params, 'platonic')
        .name('Solid')
        .options(Object.values(PlatonicSolid))
        .showIf(() => this.dim3);
      folder.add(params, 'rotation', 0, 2, 0.01)
        .name('Rotation')
        .format(formatAngle)
        .showIf(() => !this.dim3);
      const transformFolder = folder.addFolder('Transform').showIf(() => this.dim3);
      transformFolder.add(params.scale, 'x', 0.05, 2, 0.01)
        .name('Scale x').showIf(() => this.dim3);
      transformFolder.add(params.scale, 'y', 0.05, 2, 0.01)
        .name('Scale y').showIf(() => this.dim3);
      transformFolder.add(params.scale, 'z', 0.05, 2, 0.01)
        .name('Scale z').showIf(() => this.dim3);
      transformFolder.add(params.rotateVector, 'x', -1, +1, 0.01)
        .name('Pitch').showIf(() => this.dim3).format(formatAngle);
      transformFolder.add(params.rotateVector, 'y', -1, +1, 0.01)
        .name('Roll').showIf(() => this.dim3).format(formatAngle);
      transformFolder.add(params.rotateVector, 'z', -1, +1, 0.01)
        .name('Yaw').showIf(() => this.dim3).format(formatAngle);
      folder.onChange(() => {
        this.updateTables();
      });
    }

    populateTableSettings(this.qParams, qFolder);
    populateTableSettings(this.pParams, pFolder);

    const experimentFolder = this.gui.addFolder('Experiment');
    experimentFolder.add(this, 'logIters', 0, 20, 1)
      .name('Iterations').tooltip('Each step doubles the number of iterations.')
      .format((v: any) => {
        let i = v as number;
        const it = Math.pow(2, i);
        if (it > 1e6) return `${Math.round(it / 1e6)}M`;
        else if (it > 1e3) return `${Math.round(it / 1e3)}k`;
        else return `${it}`;
      })
      .onChange(() => {
        this.orbitDirty = true;
      });
    experimentFolder.add(this, 'showFirstPoint')
      .name('Show start')
      .tooltip('Hightlight initial state').onChange(() => {
      this.drawDirty = true;
    });
    experimentFolder.add(this, 'drawDots')
      .name('Draw vertices/foci')
      .onChange(() => {
        this.qDrawable = this.drawable2D(this.qShape, this.qLineMat, this.qDotMat);
        this.pDrawable = this.drawable2D(this.pShape, this.pLineMat, this.pDotMat);
        this.drawDirty = true;
      }).showIf(() => !this.dim3);
    experimentFolder.add(this, 'showAxes')
      .name('Draw axes')
      .onChange(() => {
        this.qAxes.visible = this.showAxes;
        this.pAxes.visible = this.showAxes
        this.drawDirty = true;
      }).showIf(() => this.dim3);
    experimentFolder.add(this, 'opacity', 0, 1, 0.1)
      .name('Opacity')
      .onChange(() => {
        this.qFaceMat.opacity = this.opacity;
        this.pFaceMat.opacity = this.opacity;
        this.drawDirty = true;
      }).showIf(() => this.dim3);

    this.gui.add(this, 'openMainHelp').name('Help');
    this.gui.onChange(() => {
      this.containerRef?.nativeElement.focus();
    });
  }

  switchDimension(dim3: boolean) {
    for (let pane of [this.tablePane, this.metricPane]) {
      pane.orbitControls?.dispose();
      pane.useOrthographic = !dim3;
      pane.orbitControls = new OrbitControls(pane.camera, pane.ref?.nativeElement || this.renderer.domElement);
      pane.orbitControls.enablePan = !dim3;
      pane.orbitControls.enableRotate = dim3;
      pane.orbitControls.zoomToCursor = !dim3;
    }

    this.phasePane.active = !dim3;
    this.qNetPane.active = dim3;
    this.pNetPane.active = dim3;

    this.updateTables();
  }

  openMainHelp() {
    this.dialogIsOpen = true;
    this.dialog.open(HelpDialogComponent, {
      data: this.helpData,
    }).afterClosed().subscribe((_) => {
      this.dialogIsOpen = false;
    });
  }

  ngAfterViewInit() {
    if (this.previewRenderer) return;

    if (!this.containerRef) throw Error('no container');
    this.container = this.containerRef.nativeElement;
    if (!this.canvasRef?.nativeElement) throw Error('no canvas');
    if (!this.tableRef) throw Error('no table');
    if (!this.metricRef) throw Error('no metric');
    if (!this.phaseRef) throw Error('no phase');
    if (!this.qNetRef) throw Error('no q net');
    if (!this.pNetRef) throw Error('no p net');
    this.standardRenderer = new WebGLRenderer({
      alpha: true,
      canvas: this.canvasRef.nativeElement,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.standardRenderer.setPixelRatio(window.devicePixelRatio);

    this.initPanes();

    window.requestAnimationFrame(this.run.bind(this));
  }

  initPanes() {
    this.tablePane = this.createPane(this.tableRef, this.dim3, new Vector4(0, 0.5, 0.5, 0.5));
    this.metricPane = this.createPane(this.metricRef, this.dim3, new Vector4(0.5, 0.5, 0.5, 0.5));
    this.phasePane = this.createPane(this.phaseRef, false, new Vector4(0, 0, 1, 0.5));

    this.qNetPane = this.createPane(this.qNetRef, false, new Vector4(0, 0, 0.5, 0.5));
    this.pNetPane = this.createPane(this.pNetRef, false, new Vector4(0.5, 0, 0.5, 0.5));
    this.centerNets();

    this.phasePane.active = !this.dim3;
    this.qNetPane.active = this.dim3;
    this.pNetPane.active = this.dim3;
  }

  centerNets() {
    if (this.dim3 && this.qNet && this.qNetPane) {
      this.qNetPane.orthographicCamera.zoom = 3 / this.qNet.ll.distanceTo(this.qNet.ur);
    }
    if (this.dim3 && this.pNet && this.pNetPane) {
      this.pNetPane.orthographicCamera.zoom = 3 / this.pNet.ll.distanceTo(this.pNet.ur);
    }
  }

  createPane(ref: ElementRef<HTMLDivElement> | undefined, dim3: boolean, defaults: Vector4): Pane {
    const scene = new Scene();
    const pane = new Pane(
      scene,
      defaults,
      !dim3,
      ref,
    );
    pane.orbitControls = new OrbitControls(pane.camera, ref?.nativeElement || this.renderer.domElement);
    pane.orbitControls.enablePan = !dim3;
    pane.orbitControls.enableRotate = dim3;
    pane.orbitControls.zoomToCursor = !dim3;

    this.leftNormal.visible = this.showFirstPoint;
    this.leftVector.visible = this.showFirstPoint;
    this.leftBall.visible = this.showFirstPoint;
    this.rightNormal.visible = this.showFirstPoint;
    this.rightVector.visible = this.showFirstPoint;
    this.rightBall.visible = this.showFirstPoint;

    this.panes.push(pane);
    return pane;
  }

  transform(params: TableParams): Matrix4 {
    const scale = new Matrix4().makeScale(params.scale.x, params.scale.y, params.scale.z);
    const pitch = new Matrix4().makeRotationX(params.rotateVector.x * Math.PI);
    const roll = new Matrix4().makeRotationZ(params.rotateVector.y * Math.PI);
    const yaw = new Matrix4().makeRotationY(params.rotateVector.z * Math.PI);
    return scale.premultiply(roll).premultiply(pitch).premultiply(yaw);
  }

  updateTables() {
    this.orbitDirty = true;
    if (this.dim3) {
      const qm = this.transform(this.qParams);
      const pm = this.transform(this.pParams);
      this.qPolyhedron = choosePolyhedron(this.qParams.platonic, qm);
      this.pPolyhedron = choosePolyhedron(this.pParams.platonic, pm);

      this.qDrawable = this.qPolyhedron.drawable(this.vertexMaterial, this.edgeMaterial, this.qFaceMat);
      this.pDrawable = this.pPolyhedron.drawable(this.vertexMaterial, this.edgeMaterial, this.pFaceMat);

      this.qNet = new PolyhedronNet(this.qPolyhedron);
      this.qNetDrawable = this.netDrawable(this.qNet, this.qFaceMat);
      this.pNet = new PolyhedronNet(this.pPolyhedron);
      this.pNetDrawable = this.netDrawable(this.pNet, this.pFaceMat);
      this.centerNets();
      try {
        this.qFace = this.qNet.findNetFace(this.qStart.clone());
      } catch (e) {
        this.qStart = midpoint(this.qNet.polygons[0].vertices);
        this.qFace = 0;
      }

      try {
        this.pFace = this.pNet.findNetFace(this.pStart.clone());
      } catch (e) {
        this.pStart = midpoint(this.pNet.polygons[0].vertices);
        this.pFace = 0;
      }
    } else {
      this.qShape = createShape(this.qParams);
      if (this.symplectic) {
        this.pShape = createShape({
          ...this.qParams,
          rotation: (this.qParams.rotation + 0.5) % 2,
        })
      } else {
        this.pShape = createShape(this.pParams);
      }
      this.qDrawable = this.drawable2D(this.qShape, this.qLineMat, this.qDotMat);
      this.pDrawable = this.drawable2D(this.pShape, this.pLineMat, this.pDotMat);
    }
  }

  updatePanes2D() {
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
    let firstDot = new RoundPoints(new BufferGeometry().setFromPoints([
      new Vector2(2 * this.qTime - 1, 2 * this.pTime - 1)
    ]), this.firstDotMat);
    firstDot.translateZ(0.1);
    this.phaseFrame = new LineSegments2(populateLineSegmentsGeometry(new LineSegmentsGeometry(), frame), this.boundaryMaterial);
    this.phaseDots = new RoundPoints(
      new BufferGeometry().setFromPoints(this.phase2D.map(({x, y}) => new Vector2(2 * x - 1, 2 * y - 1))),
      this.phaseMaterial);
    this.phasePane.scene.clear();
    this.phasePane.scene.add(this.phaseFrame, this.phaseDots);
    if (this.showFirstPoint) this.phasePane.scene.add(firstDot);
  }

  updatePanes3D() {
    this.tablePane.scene.add(this.qAxes);
    this.metricPane.scene.add(this.pAxes);

    this.qNetPane.scene.clear();
    this.pNetPane.scene.clear();

    this.qNetPane.scene.add(this.qNetDrawable);
    this.pNetPane.scene.add(this.pNetDrawable);

    this.qTank.position.set(this.qStart.x, this.qStart.y, 2);
    this.qTank.setRotationFromAxisAngle(new Vector3(0, 0, 1), this.qHeading);
    this.qTank.visible = this.showFirstPoint;

    this.pTank.position.set(this.pStart.x, this.pStart.y, 2);
    this.pTank.setRotationFromAxisAngle(new Vector3(0, 0, 1), this.pHeading);
    this.pTank.visible = this.showFirstPoint;

    this.qPhase = this.qPhase3D.length > 0 ? new RoundPoints(new BufferGeometry().setFromPoints(this.qPhase3D), this.phaseMaterial) : new RoundPoints();
    this.pPhase = this.pPhase3D.length > 0 ? new RoundPoints(new BufferGeometry().setFromPoints(this.pPhase3D), this.phaseMaterial) : new RoundPoints();

    if (this.qOrbit.length > 0) {
      this.qOrbitPoints = new InstancedMesh(new SphereGeometry(0.01), this.edgeMaterial, this.qOrbit.length);
      for (let [i, q] of this.qOrbit.entries()) {
        this.qOrbitPoints.setMatrixAt(i, new Matrix4().makeTranslation(q as Vector3));
      }
      this.qOrbitPoints.instanceMatrix.needsUpdate = true;
      this.tablePane.scene.add(this.qOrbitPoints);
    }

    if (this.pOrbit.length > 0) {
      this.pOrbitPoints = new InstancedMesh(new SphereGeometry(0.01), this.edgeMaterial, this.pOrbit.length);
      for (let [i, p] of this.pOrbit.entries()) {
        this.pOrbitPoints.setMatrixAt(i, new Matrix4().makeTranslation(p as Vector3));
      }
      this.pOrbitPoints.instanceMatrix.needsUpdate = true;
      this.metricPane.scene.add(this.pOrbitPoints);
    }

    this.qNetPane.scene.add(this.qTank, this.qPhase);
    this.pNetPane.scene.add(this.pTank, this.pPhase);
  }

  updatePanes() {
    this.tablePane.scene.clear();
    this.tablePane.scene.add(this.qDrawable);
    this.metricPane.scene.clear();
    this.metricPane.scene.add(this.pDrawable);

    if (this.showFirstPoint) {
      this.tablePane.scene.add(this.leftBall, this.leftNormal, this.leftVector);
      this.metricPane.scene.add(this.rightBall, this.rightNormal, this.rightVector);
    }

    if (this.qOrbit.length > 1) {
      this.qOrbitDrawable = new Line2(
        populateLineGeometry(new LineGeometry(), this.qOrbit),
        this.qPhaseMat
      );
      this.tablePane.scene.add(this.qOrbitDrawable);
    }
    if (this.pOrbit.length > 1) {
      this.pOrbitDrawable = new Line2(
        populateLineGeometry(new LineGeometry(), this.pOrbit),
        this.pPhaseMat
      );
      this.metricPane.scene.add(this.pOrbitDrawable);
    }

    if (this.dim3) this.updatePanes3D();
    else this.updatePanes2D();
  }

  iterate(iters: number) {
    this.drawDirty = true;
    console.log('iterating');
    if (this.dim3) {
      this.iterate3D(iters);
    } else {
      this.iterate2D(iters);
    }
  }

  leftStep2D(state: State2D): number {
    let qd = state.pNormal.dot(state.qNormal);
    if (closeEnough(qd, 0)) throw Error('perpendicular normals');
    let qdir = state.pNormal.clone().multiplyScalar(qd > 0 ? -1 : 1);
    let qsrc = state.qPoint.clone().addScaledVector(qdir, EPSILON);
    let qCollision = this.qShape.castRay({src: qsrc, dir: qdir});
    const newQ = this.qShape.param(qCollision.paramTime);
    const l = this.pShape.support(newQ.point.clone().sub(state.qPoint));
    state.qTime = qCollision.paramTime;
    state.qPoint = newQ.point;
    state.qNormal = newQ.normal;
    return l;
  }

  rightStep2D(state: State2D): number {
    let pd = state.qNormal.dot(state.pNormal);
    if (closeEnough(pd, 0)) throw Error('perpendicular normals');
    let pdir = state.qNormal.clone().multiplyScalar(pd > 0 ? -1 : 1);
    let psrc = state.pPoint.clone().addScaledVector(pdir, EPSILON);
    let pCollision = this.pShape.castRay({src: psrc, dir: pdir});
    const newP = this.pShape.param(pCollision.paramTime);
    const l = this.qShape.support(newP.point.clone().sub(state.pPoint));
    state.pTime = pCollision.paramTime;
    state.pPoint = newP.point;
    state.pNormal = newP.normal;
    return l;
  }

  phaseCell(qt: number, pt: number) {
    const qCorners = this.qShape.corners();
    const pCorners = this.pShape.corners();
    if (qCorners.length === 0 || pCorners.length === 0) throw Error('no phase cells');

    let lq = 0;
    let hq = 0;
    for (let i = 0; i < qCorners.length - 1; i++) {
      const l = qCorners[i];
      const h = qCorners[i + 1];
      if (l === qt || h === qt) throw Error('on phase cell boundary');
      if (l < qt && h > qt) {
        lq = l;
        hq = h;
      }
    }

    let lp = 0;
    let hp = 0;
    for (let i = 0; i < pCorners.length - 1; i++) {
      const l = pCorners[i];
      const h = pCorners[i + 1];
      if (l === pt || h === pt) throw Error('on phase cell boundary');
      if (l < pt && h > pt) {
        lp = l;
        hp = h;
      }
    }
    return new Vector4(lq, lp, hq, hp);
  }

  cellContains(cell: Vector4, phase: Vector2): boolean {
    return cell.x < phase.x && cell.y < phase.y && cell.z > phase.x && cell.w > phase.y;
  }

  firstReturn2D(qt: number, pt: number): [Vector2, number] {
    let q, p;
    try {
      q = this.qShape.param(qt);
      p = this.pShape.param(pt);
    } catch (e) {
      console.log(e);
      return [new Vector2(), 0];
    }

    const state: State2D = {
      qTime: qt,
      qPoint: q.point,
      qNormal: q.normal,
      pTime: pt,
      pPoint: p.point,
      pNormal: p.normal,
    };

    let cell: Vector4;
    try {
      cell = this.phaseCell(qt, pt);
    } catch {
      return [new Vector2(), 0];
    }

    let departed = false;
    for (let i = 0; i < Math.pow(2, this.logIters); i++) {
      this.leftStep2D(state);
      this.rightStep2D(state);
      const phase = new Vector2(state.qTime, state.pTime);
      const contains = this.cellContains(cell, phase);
      if (!contains) departed = true;
      if (departed && contains) {
        return [phase.sub(new Vector2(qt, pt)), i];
      }
    }
    return [new Vector2(), 0];
  }

  iterate2D(iters: number) {
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

    let qp3 = new Vector3(q.point.x, q.point.y, 1);
    let pp3 = new Vector3(p.point.x, p.point.y, 1);
    let qn3 = new Vector3(q.normal.x, q.normal.y, 0);
    let pn3 = new Vector3(p.normal.x, p.normal.y, 0);

    // place the leftBall at q.point
    this.leftBall.position.set(qp3.x, qp3.y, qp3.z);
    // place the rightBall at p.point
    this.rightBall.position.set(pp3.x, pp3.y, pp3.z);
    // make the rightNormal point from p.point in the direction of p.normal
    this.rightNormal = new ArrowHelper(pn3, pp3, ARROW_LENGTH, this.getColor('p'), HEAD_LENGTH, HEAD_WIDTH);
    // make the leftVector point from q.point in the direction of p.normal
    this.leftVector = new ArrowHelper(pn3, qp3, ARROW_LENGTH, this.getColor('p'), HEAD_LENGTH, HEAD_WIDTH);
    this.leftNormal.visible = false;
    this.rightVector.visible = false;

    this.phase2D = [];
    let qt = this.qTime;
    let pt = this.pTime;

    let period = -1;
    let qLength = 0;
    let pLength = 0;
    let logDist = 0;

    const state: State2D = {
      qTime: qt,
      qPoint: q.point,
      qNormal: q.normal,
      pTime: pt,
      pPoint: p.point,
      pNormal: p.normal,
    };

    for (let i = 0; i < iters; i++) {
      try {
        qLength += this.leftStep2D(state);
      } catch (e) {
        console.warn(e);
        break;
      }
      this.qOrbit.push(state.qPoint.clone());
      // this.phase2D.push(new Vector2(state.qTime, state.pTime));

      if (i === 0) {
        qp3 = new Vector3(state.qPoint.x, state.qPoint.y, 1);
        pp3 = new Vector3(state.pPoint.x, state.pPoint.y, 1);
        qn3 = new Vector3(state.qNormal.x, state.qNormal.y, 0);
        pn3 = new Vector3(state.pNormal.x, state.pNormal.y, 0);

        // make the leftNormal point from q.point in the direction of q.normal
        this.leftNormal = new ArrowHelper(qn3, qp3, ARROW_LENGTH, this.getColor('q'), HEAD_LENGTH, HEAD_WIDTH);

        // make the rightVector point from p.point in the direction q.normal
        this.rightVector = new ArrowHelper(qn3, pp3, ARROW_LENGTH, this.getColor('q'), HEAD_LENGTH, HEAD_WIDTH);

        this.leftNormal.visible = true;
        this.rightVector.visible = true;
      }

      try {
        pLength += this.rightStep2D(state);
      } catch (e) {
        console.warn(e);
        break;
      }
      this.pOrbit.push(state.pPoint.clone());
      this.phase2D.push(new Vector2(state.qTime, state.pTime));

      const dq = state.qTime - this.qTime;
      const dp = state.pTime - this.pTime;
      const d = new Vector2(dq, dp).length();

      if (closeEnough(d, 0)) {
        logDist = -Math.log10(d);
        period = i + 1;
        break;
      }
    }

    const vol = this.qShape.area() * this.pShape.area();

    this.results = [
      {key: 'Period', value: period < 0 ? '?' : `${period} (${logDist.toFixed(1)}-digit accuracy)`},
      {key: 'Volume', value: vol.toFixed(8)},
    ];
    if (period > 0) {
      this.results.push(
        {key: 'Q length', value: qLength.toFixed(8)},
        {key: 'P length', value: pLength.toFixed(8)},
        {key: 'Q²/(2V)', value: ((qLength * qLength) / (2 * vol)).toFixed(8)},
        {key: 'P²/(2V)', value: ((pLength * pLength) / (2 * vol)).toFixed(8)},
      );
    } else {
      this.results.push(
        {key: 'Q length', value: '?'},
        {key: 'P length', value: '?'},
        {key: 'Q²/(2V)', value: '?'},
        {key: 'P²/(2V)', value: '?'},
      );
    }
  }

  leftStep3D(state: State3D): number {
    const qNormal = state.qFace.polygon.plane.normal;
    const pNormal = state.pFace.polygon.plane.normal;
    const dot = qNormal.dot(pNormal);
    if (closeEnough(dot, 0)) throw Error('perpendicular normals');
    const qdir = pNormal.clone().multiplyScalar(dot > 0 ? -1 : 1);
    const qsrc = state.qPoint.clone();

    [state.qPoint, state.qFace] = this.qPolyhedron.intersectRay({src: qsrc, dir: qdir});
    return this.pPolyhedron.support(state.qPoint.clone().sub(qsrc));
  }

  rightStep3D(state: State3D): number {
    const qNormal = state.qFace.polygon.plane.normal;
    const pNormal = state.pFace.polygon.plane.normal;
    const dot = qNormal.dot(pNormal);
    if (closeEnough(dot, 0)) throw Error('perpendicular normals');
    let pdir = qNormal.clone().multiplyScalar(dot > 0 ? -1 : 1);
    let psrc = state.pPoint.clone();

    [state.pPoint, state.pFace] = this.pPolyhedron.intersectRay({src: psrc, dir: pdir});
    return this.qPolyhedron.support(state.pPoint.clone().sub(psrc));
  }

  firstReturn3D(q: boolean): Vector2 {
    let qPoint, qFace, pPoint, pFace;
    try {
      const rq = this.qNet.netToPolyhedron(this.qStart.clone(), this.qFace);
      qPoint = rq.p3;
      qFace = this.qPolyhedron.faces[rq.face];
      const rp = this.pNet.netToPolyhedron(this.pStart.clone(), this.pFace);
      pPoint = rp.p3;
      pFace = this.pPolyhedron.faces[rp.face];
    } catch (e) {
      console.error(e);
      return new Vector2();
    }

    let state: State3D = {qPoint, qFace, pPoint, pFace};
    const ip3 = q ? state.qPoint.clone() : state.pPoint.clone();
    const initialFaceIndex = q ? qFace.index : pFace.index;
    const initialPoint = (q ? this.qStart : this.pStart).clone();

    let departed = false;
    for (let i = 0; i < Math.pow(2, this.logIters); i++) {
      this.leftStep3D(state);
      this.rightStep3D(state);
      const index = q ? state.qFace.index : state.pFace.index;
      if (index !== initialFaceIndex) departed = true;
      if (departed && index === initialFaceIndex) {
        const pt3 = q ? state.qPoint.clone() : state.pPoint.clone();
        const pt = (q ? this.qNet : this.pNet).polyhedronToNet(pt3, index).p2;
        return pt.sub(initialPoint);
      }
    }
    return new Vector2();
  }

  iterate3D(iters: number) {
    this.qOrbit = [];
    this.pOrbit = [];
    this.qPhase3D = [this.qStart.clone()]
    this.pPhase3D = [this.pStart.clone()]

    let qPoint: Vector3, pPoint: Vector3;
    let qFace: Face, pFace: Face;
    try {
      const rq = this.qNet.netToPolyhedron(this.qStart.clone(), this.qFace);
      qPoint = rq.p3;
      qFace = this.qPolyhedron.faces[rq.face];
      const rp = this.pNet.netToPolyhedron(this.pStart.clone(), this.pFace);
      pPoint = rp.p3;
      pFace = this.pPolyhedron.faces[rp.face];
    } catch (e) {
      console.error(e);
      return;
    }

    let qp3 = qPoint.clone();
    let pp3 = pPoint.clone();
    let qn3 = qFace.polygon.plane.normal.clone();
    let pn3 = pFace.polygon.plane.normal.clone();

    // place the leftBall at q.point
    this.leftBall.position.set(qp3.x, qp3.y, qp3.z);
    // place the rightBall at p.point
    this.rightBall.position.set(pp3.x, pp3.y, pp3.z);
    // make the leftNormal point from q.point in the direction of q.normal
    this.leftNormal = new ArrowHelper(qn3, qp3, ARROW_LENGTH, this.getColor('q'), HEAD_LENGTH, HEAD_WIDTH);
    // make the rightNormal point from p.point in the direction of p.normal
    this.rightNormal = new ArrowHelper(pn3, pp3, ARROW_LENGTH, this.getColor('p'), HEAD_LENGTH, HEAD_WIDTH);
    // make the leftVector point from q.point in the direction of p.normal
    this.leftVector = new ArrowHelper(pn3, qp3, ARROW_LENGTH, this.getColor('p'), HEAD_LENGTH, HEAD_WIDTH);
    // make the rightVector point from p.point in the direction q.normal
    this.rightVector = new ArrowHelper(qn3, pp3, ARROW_LENGTH, this.getColor('q'), HEAD_LENGTH, HEAD_WIDTH);

    this.leftNormal.visible = false;
    this.rightVector.visible = false;

    this.qOrbit.push(qPoint);
    this.pOrbit.push(pPoint);

    let period = -1;
    let qLength = 0;
    let pLength = 0;
    let logDist = 0;

    let state: State3D = {
      qPoint,
      qFace,
      pPoint,
      pFace,
    };

    for (let i = 0; i < iters; i++) {
      try {
        qLength += this.leftStep3D(state);
      } catch (e) {
        console.warn(e);
        break;
      }

      this.qOrbit.push(state.qPoint.clone());
      const qPhase = this.qNet.polyhedronToNet(state.qPoint, state.qFace.index).p2;
      this.qPhase3D.push(qPhase);

      if (i === 0) {
        qp3 = state.qPoint.clone();
        pp3 = state.pPoint.clone();
        qn3 = state.qFace.polygon.plane.normal.clone();
        pn3 = state.pFace.polygon.plane.normal.clone();

        // make the leftNormal point from q.point in the direction of q.normal
        this.leftNormal = new ArrowHelper(qn3, qp3, ARROW_LENGTH, this.getColor('q'), HEAD_LENGTH, HEAD_WIDTH);

        // make the rightVector point from p.point in the direction q.normal
        this.rightVector = new ArrowHelper(qn3, pp3, ARROW_LENGTH, this.getColor('q'), HEAD_LENGTH, HEAD_WIDTH);

        this.leftNormal.visible = true;
        this.rightVector.visible = true;
      }

      try {
        pLength += this.rightStep3D(state);
      } catch (e) {
        console.warn(e);
        break;
      }

      this.pOrbit.push(state.pPoint.clone());
      const pPhase = this.pNet.polyhedronToNet(state.pPoint, state.pFace.index).p2;
      this.pPhase3D.push(pPhase);

      const dq = qPhase.distanceTo(this.qStart);
      const dp = pPhase.distanceTo(this.pStart);
      if (closeEnough(dq, 0) && closeEnough(dp, 0)) {
        logDist = -Math.log10(new Vector2(dp, dq).length());
        period = i + 1;
        break;
      }
    }

    const vol = this.qPolyhedron.volume * this.pPolyhedron.volume;

    this.results = [
      {key: 'Period', value: period < 0 ? '?' : `${period} (${logDist.toFixed(1)}-digit accuracy)`},
      {key: 'Volume', value: vol.toFixed(8)},
    ];
    if (period > 0) {
      this.results.push(
        {key: 'Q length', value: qLength.toFixed(8)},
        {key: 'P length', value: pLength.toFixed(8)},
        {key: 'Q³/(6V)', value: ((qLength * qLength * qLength) / (6 * vol)).toFixed(8)},
        {key: 'P³/(6V)', value: ((pLength * pLength * pLength) / (6 * vol)).toFixed(8)},
      );
    } else {
      this.results.push(
        {key: 'Q length', value: '?'},
        {key: 'P length', value: '?'},
        {key: 'Q³/(6V)', value: '?'},
        {key: 'P³/(6V)', value: '?'},
      );
    }
  }

  // Up, down, right, left
  pointDelta(keys: string[]): Vector2 {
    let dx = 0;
    let dy = 0;
    if (this.keyHeld(keys[0])) dy += 1;
    if (this.keyHeld(keys[1])) dy -= 1;
    if (this.keyHeld(keys[2])) dx += 1;
    if (this.keyHeld(keys[3])) dx -= 1;
    if (dx !== 0 || dy !== 0) this.orbitDirty = true;
    return new Vector2(dx, dy)
  }

  handleInput(dt: number) {
    if (this.keyJustPressed('?')) {
      if (!this.dialogIsOpen) this.openMainHelp();
      else this.dialog.closeAll();
    }

    if (this.dialogIsOpen) return;

    if (this.keyJustPressed('Enter')) {
      this.containerRef?.nativeElement.focus();
    }

    if (this.keyJustPressed('KeyP')) {
      this.screenshot();
    }

    let multiplier = 1;
    if (this.keyHeld('ShiftLeft') || this.keyHeld('ShiftRight')) multiplier *= 0.1;
    if (this.keyHeld('AltLeft') || this.keyHeld('AltRight')) multiplier *= 0.01;

    if (this.dim3) {
      const dq = this.pointDelta(['KeyW', 'KeyS', 'KeyD', 'KeyA']);
      if (!closeEnough(dq.lengthSq(), 0)) {
        const speed = 0.5 / this.qNetPane.camera.zoom;
        this.qHeading -= dq.x * dt * 2;
        const dl = dq.y * dt * multiplier * speed;
        const offset = dl < 0 ? Math.PI : 0;
        const netPoint = this.qNet.wrapPoint(
          {point: this.qStart, heading: this.qHeading + offset, face: this.qFace},
          Math.abs(dl));
        this.qStart = netPoint.point;
        this.qHeading = netPoint.heading - offset;
        this.qFace = netPoint.face;
      }
      const dp = this.pointDelta(['KeyI', 'KeyK', 'KeyL', 'KeyJ']);
      if (!closeEnough(dp.lengthSq(), 0)) {
        const speed = 0.5 / this.pNetPane.camera.zoom;
        this.pHeading -= dp.x * dt * 2;
        const dl = dp.y * dt * multiplier * speed;
        const offset = dl < 0 ? Math.PI : 0;
        const netPoint = this.pNet.wrapPoint(
          {point: this.pStart, heading: this.pHeading + offset, face: this.pFace},
          Math.abs(dl));
        this.pStart = netPoint.point;
        this.pHeading = netPoint.heading - offset;
        this.pFace = netPoint.face;
      }
      if (this.keyHeld('KeyE')) {
        try {
          const frd = this.firstReturn3D(true);
          this.qStart.add(frd.multiplyScalar(dt * 5));
          this.orbitDirty = true;
        } catch {
        }
      }
      if (this.keyHeld('KeyU')) {
        try {
          const frd = this.firstReturn3D(false);
          this.pStart.add(frd.multiplyScalar(dt * 5));
          this.orbitDirty = true;
        } catch {
        }
      }
    } else {
      const speed = 0.5 / this.phasePane.camera.zoom;
      const dv = this.pointDelta(['ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft'])
        .multiplyScalar(dt * multiplier * speed);
      this.qTime += dv.x;
      this.pTime += dv.y;
      if (this.keyHeld('KeyE') || this.keyHeld('KeyU')) {
        try {
          let eps = 1e-9;
          let steps = 0;
          while (steps < 10) {
            const [frd, i] = this.firstReturn2D(this.qTime, this.pTime);
            const [xp, xpi] = this.firstReturn2D(this.qTime + eps, this.pTime);
            const [xm, xmi] = this.firstReturn2D(this.qTime - eps, this.pTime);
            const [yp, ypi] = this.firstReturn2D(this.qTime, this.pTime + eps);
            const [ym, ymi] = this.firstReturn2D(this.qTime, this.pTime - eps);
            if (i > 0 && i === xpi && i === xmi && i === ypi && i === ymi) {
              console.log('updating');
              const grad = new Vector2(
                (xp.length() - xm.length()) / (2 * eps),
                (yp.length() - ym.length()) / (2 * eps),
              );
              // if (grad.length() > 1) grad.normalize();
              const v = frd.length();
              if (this.keyHeld('KeyE')) this.qTime -= grad.x * dt * multiplier * v * speed;
              if (this.keyHeld('KeyU')) this.pTime -= grad.y * dt * multiplier * v * speed;
              this.orbitDirty = true;
              break;
            } else {
              eps /= 2;
              steps++;
            }
          }
        } catch (e) {
          console.warn(e);
        }
      }
      this.qTime = fixTime(this.qTime);
      this.pTime = fixTime(this.pTime);
    }
  }

  frame(dt: number) {
    this.leftNormal.setColor(this.getColor('q'));
    this.leftVector.setColor(this.getColor('p'));
    this.rightNormal.setColor(this.getColor('p'));
    this.rightVector.setColor(this.getColor('q'));
    this.handleInput(dt);

    const qz = this.tablePane.camera.zoom;
    const qzf = this.oldQz / qz;
    this.leftBall.geometry.scale(qzf, qzf, 1);
    this.oldQz = qz;

    const pz = this.metricPane.camera.zoom;
    const pzf = this.oldPz / pz;
    this.rightBall.geometry.scale(pzf, pzf, 1);
    this.oldPz = pz;

    if (this.dim3) {
      const qnz = this.qNetPane.camera.zoom;
      const qnzf = this.oldQNz / qnz;
      this.qTank.geometry.scale(qnzf, qnzf, 1);
      this.oldQNz = qnz;

      const pnz = this.pNetPane.camera.zoom;
      const pnzf = this.oldPNz / pnz;
      this.pTank.geometry.scale(pnzf, pnzf, 1);
      this.oldPNz = pnz;
    }

    if (this.orbitDirty) {
      this.orbitDirty = false;
      this.iterate(Math.pow(2, this.logIters));
    }
    if (this.drawDirty) {
      this.drawDirty = false;
      this.updatePanes();
    }
  }

  override draw() {
    if (!this.container) throw Error('no container');

    const cs = getComputedStyle(this.container);
    const containerBB = this.container.getBoundingClientRect();
    const pl = parseFloat(cs.paddingLeft);
    const pr = parseFloat(cs.paddingRight);
    const pt = parseFloat(cs.paddingTop);
    const pb = parseFloat(cs.paddingBottom);
    const w = containerBB.width - (pl + pr);
    const h = containerBB.height - (pt + pb);

    this.render(new Vector4(pl, pb, w, h));
  }

  drawable2D(shape: EuclideanShape, mat: LineMaterial, dotMat: RoundPointsMaterial): Object3D {
    const data = shape.shapeData();
    const path = new Line2(populateLineGeometry(new LineGeometry(), data.path), mat);
    if (this.drawDots) {
      const dots = new RoundPoints(
        new BufferGeometry().setFromPoints(data.dots.map(v => new Vector3(v.x, v.y, 0.1))), dotMat);
      path.add(dots);
    }
    return path;
  }

  netDrawable(net: PolyhedronNet, meshMat: MeshBasicMaterial): Object3D {
    const g = new Group();
    const edges: Vector2[] = [];
    for (let face of net.polygons) {
      const s = new Shape().setFromPoints(face.vertices.map(v => v.clone()));
      g.add(new Mesh(new ShapeGeometry(s), meshMat));
      const n = face.vertices.length;
      for (let i = 0; i < n; i++) {
        edges.push(face.vertices[i].clone(), face.vertices[(i + 1) % n].clone());
      }
    }
    const ls = new LineSegments2(
      populateLineSegmentsGeometry(new LineSegmentsGeometry(), edges, 1),
      this.boundaryMaterial
    );

    g.add(ls);

    return g;
  }

  get renderer(): WebGLRenderer {
    return this.previewRenderer || this.standardRenderer;
  }

  screenshot() {
    if (!this.canvasRef) throw Error('no canvas');
    const link = document.createElement('a');
    link.href = this.canvasRef.nativeElement.toDataURL('image/png');
    link.download = 'minkowski-screenshot.png';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function midpoint(pts: readonly Vector2[]): Vector2 {
  if (pts.length === 0) return new Vector2();
  return pts
    .map(pt => pt.clone())
    .reduce((acc, v) => acc.add(v))
    .multiplyScalar(1 / pts.length);
}