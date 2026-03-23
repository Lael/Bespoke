import {Component, ElementRef, Input, OnInit, ViewChild} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import * as THREE from 'three';
import {
  BufferGeometry,
  CircleGeometry,
  ColorRepresentation,
  Light,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  Object3D,
  OrthographicCamera,
  Points,
  PointsMaterial,
  SphereGeometry,
  Vector2,
  Vector3
} from 'three';
import {Duality, Generator, Geometry} from "../../../math/billiards/new-billiard";
import {AffinePolygonTable} from "../../../math/billiards/affine-polygon-table";
import {
  HyperbolicModel,
  HyperGeodesic,
  HyperPoint,
  kleinToTrueDistance,
  poincareToKleinDistance,
  trueToPoincareDistance
} from "../../../math/hyperbolic/hyperbolic";
import {Complex} from "../../../math/complex/complex";
import {fixTime} from "../../../math/billiards/tables";
import {SphericalOuterBilliardTable} from "../../../math/billiards/spherical-billiard-table";
import {DragControls} from "three/examples/jsm/controls/DragControls.js";
import {CommonModule} from "@angular/common";
import {SphericalPolygonTable} from "../../../math/billiards/spherical-polygon-table";
import {SpherePoint, SphericalArc, sphericalLerp} from "../../../math/geometry/spherical";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {ChartConfiguration, ChartDataset} from "chart.js";
import {Chart} from "chart.js/auto";
import {normalizeAngle} from "../../../math/math-helpers";
import {
  AffineInnerBilliardTable,
  AffineOuterBilliardTable,
  Straight
} from "../../../math/billiards/affine-billiard-table";
import {ellipse} from "../../../math/billiards/affine-oval-table";
import {AffineFlexigonTable} from "../../../math/billiards/affine-flexigon-table";
import {Line2} from "three/examples/jsm/lines/Line2.js";
import {LineGeometry} from "three/examples/jsm/lines/LineGeometry.js";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial.js";
import {AffinePiecewiseTable} from "../../../math/billiards/affine-piecewise-table";
import {LineSegmentsGeometry} from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import {LineSegments2} from "three/examples/jsm/lines/LineSegments2.js";

import {GUI} from 'lil-gui';

import JSZip from "jszip";
import {saveAs} from "file-saver";
import {ActivatedRoute} from "@angular/router";
import {AffineEllipseTable} from "../../../math/billiards/affine-ellipse-table";
import {emptyGrid, VoxelGrid} from "./voxel";
import {HyperbolicPolygonTable} from "../../../math/billiards/hyperbolic-polygon-table";
import {ArcCSVGenerator} from "./arc-data";
import {SuperellipseTable} from "../../../math/billiards/superellipse-table";
import {populateLineGeometry} from "../demo-helpers";
import {CircularArc} from "./svg-output";
import {ArcSegment} from "../../../math/geometry/arc-segment";

const SPHERE_COLOR: ColorRepresentation = 0xffffff;
const SPHERE_TABLE_COLOR: ColorRepresentation = 0x123456;
const SPHERE_SING_COLOR: ColorRepresentation = 0xbb0000;
const CHORDS_COLOR: ColorRepresentation = 0xffffff;
const OUTER_ORBIT_COLOR: ColorRepresentation = 0x000000;
const SPHERE_OUTER_ORBIT_COLOR: ColorRepresentation = 0x000000;
const START_POINT_COLOR: ColorRepresentation = 0x51e76f;
const END_POINT_COLOR: ColorRepresentation = 0x6f51e7;
const SCAFFOLD_COLOR: ColorRepresentation = 0xff00ff;
const CIRCLE_CENTER_COLOR: ColorRepresentation = 0x004400;

const TABLE_BOUNDARY_THICKNESS: number = 2;

interface Coaster {
  n: number,
  tiling: boolean,
  r?: number,
  k?: number,
}

const COASTERS: Coaster[] = [
  {n: 5, tiling: false, r: 0.40235},
  {n: 5, tiling: false, r: 0.623},
  {n: 4, tiling: false, r: 0.525},
  {n: 4, tiling: false, r: 0.321},
  {n: 5, tiling: true, k: 4},
  {n: 4, tiling: true, k: 5},
];

enum TableType {
  POLYGON = 'Polygon',
  FLEXIGON = 'Flexigon',
  SEMIDISK = 'Semidisk',
  ELLIPSE = 'Ellipse',
  SUPERELLIPSE = 'Superellipse',
  LENS = 'Lens',
}

interface PolygonParams {
  n: number, // number of vertices
  r: number, // radius for spherical or hyperbolic polygon
}

interface FlexigonParams {
  n: number,
  k: number,
  cornerRadius: number, // corner rounding
}

interface SuperellipseParams {
  p: number,
}

interface SemidiskParams {
  beta: number,
}

interface EllipseParams {
  eccentricity: number,
}

interface LensParams {
  k1: number,
  k2: number,
}

interface TableParams {
  tableType: TableType,
  polygonParams: PolygonParams,
  flexigonParams: FlexigonParams,
  superellipseParams: SuperellipseParams,
  semidiskParams: SemidiskParams,
  ellipseParams: EllipseParams,
  lensParams: LensParams,
}

interface DataRow {
  r: number;
  theta: number;
  dR: number;
  dTheta: number;
  cr: number;
  ctheta: number;
  cdR: number;
  cdTheta: number;
  center: Vector2;
  dCenter: Vector2;
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

const ANIMATION_FRAME_COUNT: number = 1;
const ANIMATION_FRAME_RATE: number = 60;
// const ANIMATION_MIN_R: number = hyperbolicTilingRadius(5, 5);
// const ANIMATION_MAX_R: number = hyperbolicTilingRadius(5, 4);
const ANIMATION_MIN_R: number = 0.214;
const ANIMATION_MAX_R: number = ANIMATION_MIN_R;

// function ding() {
//   const audio = new Audio('assets/audio/ding.mp3');
//   audio.play();
// }

@Component({
  selector: 'billiards',
  templateUrl: 'billiards.component.html',
  styleUrls: ['../../widgets/three-demo/three-demo.component.sass', 'billiards.component.sass'],
  standalone: true,
  imports: [CommonModule]
})
export class BilliardsComponent extends ThreeDemoComponent implements OnInit {
  // chartCanvas: HTMLCanvasElement | null = null;

  @Input('embedded')
  embedded: boolean = false;

  orbitControls!: OrbitControls;
  dragControls!: DragControls;

  draggables: Object3D[] = [];
  dragging = false;
  moving = false;
  cameraSwitch = true;

  animationRunning = false;
  animationFrame = 0;
  frameReady = true;
  grid: VoxelGrid | null = null;
  csvGen = new ArcCSVGenerator();
  mc: Mesh | null = null;
  // blobs: Blob[] = [];
  // mediaRecorder: MediaRecorder | null = null;
  // stream: MediaStream | null = null;
  // recordedChunks: BlobPart[] = [];

  // Parameters
  billiardTypeParams = {
    duality: Duality.INNER,
    generator: Generator.LENGTH,
    geometry: Geometry.SPHERICAL,
  }

  tableParams: TableParams = {
    tableType: TableType.POLYGON,
    polygonParams: {
      n: 5,
      r: 0.40235,
    },
    flexigonParams: {
      n: 3,
      k: 1 / Math.sqrt(3),
      cornerRadius: 0,
    },
    superellipseParams: {
      p: 6,
    },
    semidiskParams: {
      beta: 0,
    },
    ellipseParams: {
      eccentricity: 0.99,
    },
    lensParams: {
      k1: 0.25,
      k2: 0.5
    }
  }

  drawParams = {
    model: 'Poincaré',
    singularities: true,
    singularityIterations: 50,
    singInterval: 0,
    orbit: false,
    start: false,
    connectEvery: 1,
    scaffold: false,
    centers: false,
    stereograph: false,
    orbitSize: 1,
    phase: false,
  }

  gameParams = {
    iterations: 0,
    startTime: 0.123,
    angle: 0.456,
    tilingPolygon: 0,
  }

  // When to update stuff
  tableDirty = true;
  singularityDirty = true;
  orbitDirty = true;
  drawDirty = true;

  gui: GUI | null = null;

  // Stuff on the screen
  // planarPlane: THREE.Mesh;
  // hyperbolicPlane: THREE.Mesh;
  hyperbolicDisk: Line2;
  sphericalSphere: THREE.Mesh;
  polygon = new THREE.Mesh();
  orbit: Object3D[] = [];
  centers: THREE.Object3D[] = [];
  singularities = new THREE.Object3D();
  startPoint = new THREE.Mesh();
  nextPoint = new THREE.Mesh();
  scaffold: THREE.Object3D[] = [];
  antiTable = new THREE.Mesh();
  antiBoundary: Line2 | undefined = undefined;
  tableMesh = new THREE.Mesh();
  tableBoundary: Line2 | undefined = undefined;
  // strip: Mesh;

  // Billiards
  affineOuterTable!: AffineOuterBilliardTable;
  affineInnerTable!: AffineInnerBilliardTable;
  hyperbolicTable!: HyperbolicPolygonTable;
  sphericalTable!: SphericalOuterBilliardTable
  // affineOuterStart: Vector2 = new Vector2(4.444406348720879, 0.1280422279354999);
  affineOuterStart: Vector2 = new Vector2(2, 1);
  hyperOuterStart: HyperPoint = HyperPoint.fromPoincare(new Vector2(0.5, 0.5));
  sphereOuterStart: Vector2 = new Vector2(1, 1);

  lights: Light[] = [];

  showChart: boolean = false;
  canvas: HTMLCanvasElement | null = null;
  chart?: Chart;
  data: DataRow[] = [];

  runawayPoints: Vector2[] = [];
  firstReturn: boolean = true;

  // Materials
  diskMaterial: LineMaterial;
  handleMaterial: MeshBasicMaterial;
  tableFillMaterial: MeshBasicMaterial;
  tableBoundaryMaterial: LineMaterial;
  singularityMaterial: LineMaterial;
  sphereMaterial: MeshPhongMaterial;
  sphereSingularityMaterial: LineMaterial;
  outerOrbitPointMaterial: PointsMaterial;
  outerOrbitLineMaterial: LineMaterial;
  chordMaterial: LineMaterial;
  scaffoldMaterial: LineMaterial;

  // coordinate view
  coordRenderer: THREE.WebGLRenderer;
  coordCamera: THREE.OrthographicCamera;

  @ViewChild('coordinate_container', {static: true})
  coordHostElement?: ElementRef;
  coordOrbit: OrbitControls;

  phaseDots: Points = new Points();
  phaseMaterial: PointsMaterial;

  marks: CircularArc[] = [];
  private sphereArcs: SphericalArc[] = [];

  constructor(private route: ActivatedRoute) {
    super();

    this.useOrthographic = true;
    this.orthographicDiagonal = 1.05;
    // this.camera.zoom = 0.5;
    this.updateOrthographicCamera();

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableRotate = false;
    this.orbitControls.enablePan = true;
    // this.orbitControls.zoomToCursor = true;
    this.dragControls = new DragControls(this.draggables, this.camera, this.renderer.domElement);
    this.dragControls.addEventListener('dragstart', this.affineVertexDragStart.bind(this));
    this.dragControls.addEventListener('drag', this.affineVertexDrag.bind(this));
    this.dragControls.addEventListener('dragend', this.affineVertexDragEnd.bind(this));

    if (this.embedded) {
      this.showStats = false;
    }

    // Color scheme
    // this.registerColor('clear', 0xF0F1EB, 0x0a2933);
    this.registerColor('clear', 0xffffff, 0x000000);
    // this.registerColor('disk', 0xffffff, 0xffffff);
    this.registerColor('disk', 0x000000, 0xffffff);
    // this.registerColor('outer_table_fill', 0x123456, 0xabcdef);
    // this.registerColor('outer_table_fill', 0xbbbbee, 0xddddee);
    this.registerColor('outer_table_fill', 0xdddddd, 0xddddee);
    // this.registerColor('outer_table_fill', 0xffffff, 0xddddee);
    this.registerColor('outer_table_boundary', 0x3060aa, 0x3060aa);
    // this.registerColor('outer_table_boundary', 0x0, 0x3060aa);
    this.registerColor('outer_orbit', 0x000000, 0xffffff);
    this.registerColor('handle', 0x990044, 0x990044);
    this.registerColor('outer_singularity', 0xB00020, 0xB00020);
    // this.registerColor('outer_singularity', 0x000000, 0xffffff);
    this.registerColor('sphere', 0xffffff, 0xffffff);
    this.registerColor('sphere_singularity', SPHERE_SING_COLOR, SPHERE_SING_COLOR);
    this.registerColor('chord', 0xffffff, 0x000000);
    this.registerColor('scaffold', 0x440044, 0xaa44aa);

    const path = new THREE.Path();
    path.absellipse(0, 0, 1, 1, 0, 2 * Math.PI, true, 0);
    const points = path.getPoints(128);
    const diskGeometry = new LineGeometry().setPositions(points.flatMap(v => [v.x, v.y, 0.1]));

    this.diskMaterial = new LineMaterial({
      color: this.getColor('disk'),
      linewidth: this.drawParams.orbitSize,
      resolution: this.resolution,
    });
    this.handleMaterial = new MeshBasicMaterial({color: this.getColor('handle')});
    this.tableFillMaterial = new THREE.MeshBasicMaterial({color: this.getColor('outer_table_fill')});
    this.tableBoundaryMaterial = new LineMaterial({
      color: this.getColor('outer_table_boundary'),
      linewidth: this.drawParams.orbitSize * TABLE_BOUNDARY_THICKNESS,
      resolution: this.resolution,
    });
    this.singularityMaterial = new LineMaterial({
      color: this.getColor('outer_singularity'),
      linewidth: this.drawParams.orbitSize,
      resolution: this.resolution,
    });
    this.sphereMaterial = new MeshPhongMaterial({
      transparent: true,
      opacity: 0.95,
      color: this.getColor('sphere'),
    });
    this.sphereSingularityMaterial = new LineMaterial({
      color: this.getColor('sphere_singularity'),
      linewidth: this.drawParams.orbitSize,
      resolution: this.resolution,
    });
    this.outerOrbitPointMaterial = new PointsMaterial({
      color: this.getColor('outer_orbit'),
      size: this.drawParams.orbitSize,
    });
    this.outerOrbitLineMaterial = new LineMaterial({
      color: this.getColor('outer_orbit'),
      linewidth: this.drawParams.orbitSize,
      resolution: this.resolution,
    });
    this.phaseMaterial = new PointsMaterial({
      color: this.getColor('outer_orbit')
    });
    this.chordMaterial = new LineMaterial();
    this.registerColorable(this.chordMaterial, 'chord');
    this.scaffoldMaterial = new LineMaterial();
    this.registerColorable(this.scaffoldMaterial, 'scaffold');

    this.hyperbolicDisk = new Line2(diskGeometry, this.diskMaterial);
    this.sphericalSphere = new Mesh(
      new SphereGeometry(0.999, 180, 180),
      new MeshPhongMaterial({
        color: SPHERE_COLOR,
        opacity: 0.8,
        transparent: true,
      })
    );

    const startPointGeometry = new THREE.SphereGeometry(0.025);
    const startPointMaterial = new THREE.MeshBasicMaterial({color: START_POINT_COLOR});
    const endPointMaterial = new THREE.MeshBasicMaterial({color: END_POINT_COLOR});

    this.startPoint = new THREE.Mesh(startPointGeometry, startPointMaterial);
    this.nextPoint = new THREE.Mesh(startPointGeometry, endPointMaterial);

    this.resetAffineVertices();

    // this.gui = new lil.GUI();
    // this.updateGUI();

    const al = new THREE.AmbientLight(0xffffff, 1);
    const dl = new THREE.DirectionalLight(0xffffff, 2);
    dl.position.set(1, 1, 1);
    dl.target = this.sphericalSphere;

    this.lights.push(al, dl);

    this.coordRenderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    this.coordRenderer.setPixelRatio(window.devicePixelRatio);
    this.coordRenderer.setClearColor(this.getColor('clear'));

    this.coordCamera = new OrthographicCamera();
    this.coordCamera.position.z = 100;

    this.coordOrbit = new OrbitControls(this.coordCamera, this.coordRenderer.domElement);
    this.coordOrbit.enableRotate = false;
    this.coordOrbit.zoomToCursor = true;
  }

  async encodeVideoFromFrames(frames: Blob[]) {
    const offset = ANIMATION_FRAME_RATE * Math.floor(this.animationFrame / ANIMATION_FRAME_RATE);
    // await ffmpeg.load();

    // 1. Write each frame into ffmpeg's virtual FS
    const zip = new JSZip();


    // Save the generated zip file (browser-specific)

    for (let i = 0; i < frames.length; i++) {
      const name = `frame-${String(offset + i).padStart(3, '0')}.png`;
      zip.file(name, frames[i]);
    }

    // Generate the zip file as a blob
    const content = await zip.generateAsync({type: "blob"});
    saveAs(content, "frames.zip");
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      // Enums
      if (params.hasOwnProperty('duality')) this.billiardTypeParams.duality = this.readDuality(params['duality']);
      if (params.hasOwnProperty('generator')) this.billiardTypeParams.generator = this.readGenerator(params['generator']);
      if (params.hasOwnProperty('geometry')) this.billiardTypeParams.geometry = this.readGeometry(params['geometry']);
      if (params.hasOwnProperty('tableType')) this.tableParams.tableType = this.readTableType(params['tableType']);

      // Integers
      if (params.hasOwnProperty('n')) this.tableParams.polygonParams.n = parseInt(params['n']);
      if (params.hasOwnProperty('iterations')) this.gameParams.iterations = parseInt(params['iterations']);
      if (params.hasOwnProperty('singularityIterations')) this.drawParams.singularityIterations = parseInt(params['singularityIterations']);
      if (params.hasOwnProperty('connectEvery')) this.drawParams.connectEvery = parseInt(params['connectEvery']);

      // Floats
      if (params.hasOwnProperty('r')) this.tableParams.polygonParams.r = parseFloat(params['r']);
      if (params.hasOwnProperty('startX')) this.affineOuterStart.x = parseFloat(params['startX']);
      if (params.hasOwnProperty('startY')) this.affineOuterStart.y = parseFloat(params['startY']);
      if (params.hasOwnProperty('eccentricity')) this.tableParams.ellipseParams.eccentricity = parseFloat(params['eccentricity']);

      // Booleans
      if (params.hasOwnProperty('singularities')) this.drawParams.singularities = params['singularities'].toLowerCase() === 'true';
      if (params.hasOwnProperty('centers')) this.drawParams.centers = params['centers'].toLowerCase() === 'true';
      if (params.hasOwnProperty('orbit')) this.drawParams.orbit = params['orbit'].toLowerCase() === 'true';
      if (params.hasOwnProperty('start')) this.drawParams.start = params['start'].toLowerCase() === 'true';
      if (params.hasOwnProperty('scaffold')) this.drawParams.scaffold = params['scaffold'].toLowerCase() === 'true';

      // Lock in changes
      this.updateTableParams();
      this.gui?.close();
    });
  }

  private readGeometry(geo: string): Geometry {
    switch (geo.toLowerCase()) {
    case 'euclidean':
      return Geometry.EUCLIDEAN;
    case 'hyperbolic':
      return Geometry.HYPERBOLIC;
    case 'spherical':
      return Geometry.SPHERICAL;
    default:
      return this.billiardTypeParams.geometry;
    }
  }

  private readDuality(duality: string): Duality {
    switch (duality.toLowerCase()) {
    case 'inner':
      return Duality.INNER;
    case 'outer':
      return Duality.OUTER;
    default:
      return this.billiardTypeParams.duality;
    }
  }

  private readGenerator(gen: string): Generator {
    switch (gen.toLowerCase()) {
    case 'area':
      return Generator.AREA;
    case 'length':
      return Generator.LENGTH;
    default:
      return this.billiardTypeParams.generator;
    }
  }

  private readTableType(tt: string): TableType {
    switch (tt.toLowerCase()) {
    case 'polygon':
      return TableType.POLYGON;
    case 'ellipse':
      return TableType.ELLIPSE;
    case 'superellipse':
      return TableType.SUPERELLIPSE;
    case 'semidisk':
      return TableType.SEMIDISK;
    case 'lens':
      return TableType.LENS;
    case 'flexigon':
      return TableType.FLEXIGON;
    default:
      return this.tableParams.tableType;
    }
  }

  // private pickSupportedMimeType(): string {
  //   const mimeTypes = [
  //     'video/webm',
  //     'video/mp4;codecs=h264',
  //     'video/webm;codecs=vp9',
  //     'video/webm;codecs=vp8',
  //   ];
  //
  //   for (const type of mimeTypes) {
  //     if (MediaRecorder.isTypeSupported(type)) {
  //       return type;
  //     }
  //   }
  //   return ''; // Let browser choose default
  // }

  private startRecording() {
    this.scene.clear();
    this.animationRunning = true;
    this.animationFrame = 0;
    this.frameReady = true;
    this.grid = emptyGrid();
    console.log('start');
    // this.stream = this.renderer.domElement.captureStream(0);
    // if (!this.stream) {
    //   console.error('could not start media stream', this.renderer.domElement);
    //   return;
    // }
    // const options: MediaRecorderOptions = {
    //   mimeType: this.pickSupportedMimeType(),
    //   // videoBitsPerSecond: 45_000_000,
    // };
    // console.log(options.mimeType);
    // this.mediaRecorder = new MediaRecorder(this.stream, options);
    //
    // this.recordedChunks = [];
    // this.mediaRecorder.ondataavailable = (event) => {
    //   if (event.data && event.data.size > 0) {
    //     this.recordedChunks.push(event.data);
    //   }
    // };
    //
    // this.mediaRecorder.onstop = () => {
    //   const blob = new Blob(this.recordedChunks, {type: this.mediaRecorder?.mimeType});
    //   // download via FileSaver or a manual <a> tag
    //   saveAs(blob, 'three-animation.webm');
    // };
    // this.mediaRecorder.start();
  }

  private cancelRecording() {
    console.log('cancel');
    this.animationRunning = false;
    this.animationFrame = 0;
    // this.blobs = [];
  }

  private stopRecording() {
    // if (this.mediaRecorder !== null) {
    //   this.mediaRecorder.stop();
    // }
    // this.mediaRecorder = null;
    // this.stream = null;
    console.log('stop');
    this.animationRunning = false;
    this.animationFrame = 0;

    this.csvGen.download();

    // if (this.grid) {
    //   const mesh = gridToMesh(this.grid);
    //   console.log(mesh);
    //   this.mc = mesh;
    //   this.mc.material = this.sphereMaterial;
    // }


    console.log('updated');
    this.drawDirty = true;

    this.grid = null;
    // this.encodeVideoFromFrames(this.blobs).then(() => {
    //   console.log('done processing');
    //   ding();
    // });
    // this.blobs = [];
  }

  private processKeyboardInput(dt: number): void {
    let coaster: Coaster | null = null;
    if (this.keyJustPressed('Digit1')) coaster = COASTERS[0];
    if (this.keyJustPressed('Digit2')) coaster = COASTERS[1];
    if (this.keyJustPressed('Digit3')) coaster = COASTERS[2];
    if (this.keyJustPressed('Digit4')) coaster = COASTERS[3];
    if (this.keyJustPressed('Digit5')) coaster = COASTERS[4];
    if (this.keyJustPressed('Digit6')) coaster = COASTERS[5];
    if (coaster) {
      this.tableParams.polygonParams.n = coaster.n;
      if (coaster.tiling) {
        this.tableParams.polygonParams.r = hyperbolicTilingRadius(coaster.n, coaster.k!);
      } else {
        this.tableParams.polygonParams.r = coaster.r!;
      }
      this.updateTable();
      this.updateGUI();
    }

    if (this.keyJustPressed('KeyL')) {
      // const cuts: CircularArc[] = [
      //   {center: new Vector2(), radius: 1, startAngle: 0, endAngle: 2 * Math.PI},
      // ];
      // for (let i = 0; i < this.hyperbolicTable.n; i++) {
      //   const geo = new HyperGeodesic(this.hyperbolicTable.vertices[(i + 1) % this.hyperbolicTable.n], this.hyperbolicTable.vertices[i]);
      //   const segment = geo.segment(HyperbolicModel.POINCARE) as ArcSegment;
      //   cuts.push({
      //     center: segment.center.toVector2(),
      //     radius: segment.radius,
      //     startAngle: segment.startAngle,
      //     endAngle: segment.endAngle,
      //   });
      // }
      //
      // const scale = 100;
      // exportSVG(
      //   cuts,
      //   this.marks.concat(
      //     this.marks.map(m => {
      //       return {
      //         center: new Vector2(-m.center.x, m.center.y),
      //         radius: m.radius,
      //         startAngle: Math.PI - m.endAngle,
      //         endAngle: Math.PI - m.startAngle,
      //       };
      //     })
      //   ),
      //   scale
      // );
      const csv = new ArcCSVGenerator();
      for (let segment of this.sphereArcs) {
        csv.appendArc(segment.p1.coords.clone(), segment.p2.coords.clone());
      }
      csv.download();
    }

    if (this.keyJustPressed('KeyT')) {
      console.log(JSON.stringify(this.billiardTypeParams));
      console.log(JSON.stringify(this.tableParams));
      console.log(JSON.stringify(this.drawParams));
    }
    if (this.animationRunning) {
      if (this.keyJustPressed('Escape')) {
        this.cancelRecording();
      }
      if (this.keyJustPressed('KeyS')) {
        this.stopRecording();
      }
    } else if (this.keyJustPressed('KeyA')) {
      // this.startRecording();
    }

    if (this.keyJustPressed('KeyF') &&
      this.duality === Duality.OUTER &&
      this.generator === Generator.LENGTH &&
      this.tableParams.tableType === TableType.POLYGON) {
      (this.affineOuterTable as AffinePolygonTable).outerLengthSingularDF(5, 9, 200);
    }

    if (this.keyJustPressed('KeyD')) {
      this.billiardTypeParams.duality = this.duality === Duality.INNER ? Duality.OUTER : Duality.INNER;
      this.billiardTypeParams.generator = this.generator === Generator.LENGTH ? Generator.AREA : Generator.LENGTH;
      if (this.geometry === Geometry.SPHERICAL && this.tableParams.tableType === TableType.POLYGON) {
        this.sphericalTable = new SphericalPolygonTable((this.sphericalTable as SphericalPolygonTable).polygon.dual().vertices);
        const spts = this.sphericalTable.points(36, this.drawParams.stereograph);
        if (!this.drawParams.stereograph) {
          this.antiTable = this.sphericalTable.mesh(36, this.getColor('outer_table_fill'), this.drawParams.stereograph);
          this.antiTable.scale.set(-1, -1, -1);
          const aspts = spts.map(p => p.clone().multiplyScalar(-1));
          this.antiBoundary = new Line2(populateLineGeometry(new LineGeometry(), aspts.concat(aspts[0])), this.tableBoundaryMaterial);
        }
        this.tableMesh = this.sphericalTable.mesh(36, this.getColor('outer_table_fill'), this.drawParams.stereograph);
        this.tableBoundary = new Line2(populateLineGeometry(new LineGeometry(), spts.concat(spts[0])), this.tableBoundaryMaterial);
        this.updateGUI();

        if (this.duality === Duality.INNER && this.singularities) this.scene.remove(this.singularities);

        this.singularityDirty = true;
        this.orbitDirty = true;
        this.drawDirty = true;
      }
    }

    this.showChart = this.runawayPoints.length > 0;
    if (this.showChart && this.chart && this.keyHeld('KeyD')) {
      // const ds1: ChartDataset = {
      //   label: 'r(θ) * ∆θ(θ)',
      //   type: 'scatter',
      //   data: this.data.map(row => {
      //     return {
      //       x: row.theta,
      //       y: row.dTheta * row.r,
      //     };
      //   })
      // };
      // const ecc = this.tableParams.ellipseParams.eccentricity;
      // const a = 1;
      // const b = Math.sqrt(1 - ecc * ecc);
      // const ds2: ChartDataset = {
      //   label: '2 * width(θ)',
      //   type: 'line',
      //   data: this.data.map(row => {
      //     // const t = normalizeAngle(row.theta + Math.PI / 2, 0);
      //     const t = row.theta;
      //     return {
      //       x: t,
      //       y: 2 * this.affineOuterTable.width(t),
      //     };
      //   }).sort((pt1, pt2) => pt1.x - pt2.x)
      // };
      // const ds3: ChartDataset = {
      //   label: 'Centers: r^3/det(C,C•)',
      //   type: 'scatter',
      //   data: this.data.map(row => {
      //     return {
      //       x: row.theta,
      //       y: -16 * row.r * row.r * row.r / row.center.cross(row.dCenter),
      //     };
      //   })
      // };
      // const datasets: ChartDataset[] = [ds3, ds2];
      // if (this.tableParams.tableType === TableType.ELLIPSE) datasets.push(ds2);
      const n = this.runawayPoints.length;
      const xs = [];
      const ys = [];
      let xavg = 0;
      let denom = 0;
      for (let i = 0; i < n; i++) {
        xs.push({x: i + 1, y: this.runawayPoints[i].x});
        ys.push({x: i + 1, y: this.runawayPoints[i].y});
        if (i > 1) {
          xavg += i * i * (this.runawayPoints[i].x - this.runawayPoints[i - 1].x);
          denom += i * i;
        }
      }
      xavg /= denom;
      for (let i = 0; i < xs.length; i++) {
        xs[i].y -= i * xavg;
      }
      const datasets: ChartDataset[] = [];
      if (this.keyHeld('KeyX')) datasets.push({label: 'x', type: 'scatter', data: xs});
      else datasets.push({label: 'y', type: 'scatter', data: ys});
      this.chart.config.data = {datasets};
      this.chart.update();
    }
    if (this.keyJustPressed('KeyC')) {
      this.camera.position.x = 0;
      this.camera.position.y = 0;
      this.camera.zoom = 0.05;
      this.orthographicDiagonal = 0.51;
      this.updateOrthographicCamera();
      this.orbitControls.reset();
    }
    if (this.keyJustPressed('KeyP')) {
      this.printScreen(2000, 2000);
    }
    // if (this.geometry === Geometry.EUCLIDEAN &&
    //   this.duality === Duality.OUTER &&
    //   this.keyJustPressed('KeyK')) {
    //   this.setKite();
    // }
    // Test point
    const pointDiff = new Vector2();
    if (this.keysPressed.get('ArrowLeft')) pointDiff.x -= 1;
    if (this.keysPressed.get('ArrowRight')) pointDiff.x += 1;
    if (this.keysPressed.get('ArrowUp')) pointDiff.y += 1;
    if (this.keysPressed.get('ArrowDown')) pointDiff.y -= 1;
    if (pointDiff.length() === 0) {
      if (this.moving) {
        this.moving = false;
        this.orbitDirty = true;
      }
      return;
    }
    this.moving = true;
    pointDiff.normalize();
    if (this.keysPressed.get('ShiftLeft')) pointDiff.multiplyScalar(0.1);
    if (this.keysPressed.get('AltLeft')) pointDiff.multiplyScalar(0.01);
    if (this.duality === Duality.OUTER) {
      const startPointDiff = pointDiff.multiplyScalar(0.5 * dt / this.camera.zoom);
      switch (this.geometry) {
      case Geometry.EUCLIDEAN:
        this.affineOuterStart.add(startPointDiff);
        this.orbitDirty = true;
        break;
      case Geometry.HYPERBOLIC:
        const current = this.hyperOuterStart.resolve(this.model);
        const diff = startPointDiff.multiplyScalar(1 / (1 + current.modulusSquared()));
        const newPoint = current.plus(Complex.fromVector2(diff));
        if (newPoint.modulusSquared() > 0.999) return;
        this.hyperOuterStart = new HyperPoint(newPoint, this.model);
        this.orbitDirty = true;
        break;
      case Geometry.SPHERICAL:
        this.sphereOuterStart.add(startPointDiff);
        break;
      }
    } else {
      this.gameParams.startTime += pointDiff.x * 0.05 * dt;
      this.gameParams.startTime = fixTime(this.gameParams.startTime);
      this.gameParams.angle += pointDiff.y * 0.05 * dt;
      this.gameParams.angle = fixTime(this.gameParams.angle);
      this.orbitDirty = true;
      this.updateGUI();
    }
  }

  override render() {
    // if (this.animationRunning && this.frameReady) {
    if (this.animationRunning) {
      // this.frameReady = false;
      // let size = new Vector2();
      // this.renderer.getSize(size);
      // this.renderer.setSize(3840, 2160);
      this.renderer.render(this.scene, this.camera);
      // const start = Date.now();
      // this.updateOrthographicCamera(3840, 2160);
      // this.renderer.domElement.toBlob((blob) => {
      //   if (blob) this.blobs.push(blob);
      //   if (this.blobs.length === 60) {
      //     this.encodeVideoFromFrames(this.blobs).then(() => console.log('tranche downloaded'));
      //     this.blobs = [];
      //   }
      //   const end = Date.now();
      //   console.log(`pushing ${this.renderer.domElement.width}x${this.renderer.domElement.height} blob took ${end - start} ms`);
      //   this.frameReady = true;
      this.animationFrame++;
      //   console.log(`${this.animationFrame}/${ANIMATION_FRAME_COUNT}`);
      if (this.animationFrame >= ANIMATION_FRAME_COUNT) {
        this.stopRecording();
      }
      // });
      // this.renderer.setSize(size.x, size.y);
      // this.updateOrthographicCamera();
      // const tracks = this.stream?.getVideoTracks();
      // if (tracks && tracks.length > 0) {
      //   console.log('requesting frame');
      //   (tracks[0] as any).requestFrame();
      // }
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // override ngAfterViewInit() {
  //   if (this.embedded) {
  //     this.showStats = false;
  //   } else {
  //     this.updateGUI();
  //   }
  //   super.ngAfterViewInit();
  //
  //   // this.chartCanvas = document.getElementById("chart") as HTMLCanvasElement;
  //   //
  //   // if (this.chartCanvas === null) console.error("Could not initialize chart");
  //   // Chart.defaults.color = '#ffffff';
  //   // this.chart = new Chart((this.chartCanvas as HTMLCanvasElement),
  //   //   CHART_CONFIG,
  //   // );
  //   //
  //   // if (!this.coordHostElement) {
  //   //   console.error('Missing container for coordinate renderer');
  //   //   return;
  //   // }
  //   // this.coordRenderer.setSize(400, 400);
  //   // this.coordOrbit = new OrbitControls(this.coordCamera, this.coordRenderer.domElement);
  //   // this.coordOrbit.enableRotate = false;
  //   // this.coordOrbit.zoomToCursor = true;
  //   // this.coordHostElement.nativeElement.appendChild(this.coordRenderer.domElement);
  //   // super.ngAfterViewInit();
  // }

  override ngOnDestroy() {
    super.ngOnDestroy();
    if (this.gui) this.gui.destroy();
  }

  override frame(dt: number) {
    this.renderer.setClearColor(this.getColor('clear'));
    this.coordRenderer.setClearColor(this.getColor('clear'));
    this.diskMaterial.color.set(this.getColor('disk'));
    this.diskMaterial.linewidth = this.drawParams.orbitSize + 2;
    this.diskMaterial.resolution.set(this.resolution.x, this.resolution.y);
    this.handleMaterial.color.set(this.getColor('handle'));
    this.tableFillMaterial.color.set(this.getColor('outer_table_fill'));
    this.singularityMaterial.color.set(this.getColor('outer_singularity'));
    this.singularityMaterial.linewidth = this.drawParams.orbitSize;
    this.singularityMaterial.resolution.set(this.resolution.x, this.resolution.y);
    this.outerOrbitLineMaterial.linewidth = this.drawParams.orbitSize;
    this.outerOrbitLineMaterial.resolution.set(this.resolution.x, this.resolution.y);
    this.sphereMaterial.color.set(this.getColor('sphere'));
    this.sphereSingularityMaterial.color.set(this.getColor('sphere_singularity'));
    this.sphereSingularityMaterial.linewidth = this.drawParams.orbitSize;
    this.sphereSingularityMaterial.resolution.set(this.resolution.x, this.resolution.y);
    this.outerOrbitPointMaterial.color.set(this.getColor('outer_orbit'));
    this.outerOrbitPointMaterial.size = this.drawParams.orbitSize;
    this.outerOrbitLineMaterial.color.set(this.getColor('outer_orbit'));
    this.outerOrbitLineMaterial.linewidth = this.drawParams.orbitSize;
    this.outerOrbitLineMaterial.resolution.set(this.resolution.x, this.resolution.y);
    this.phaseMaterial.color.set(this.getColor('outer_orbit'));
    this.scaffoldMaterial.linewidth = this.drawParams.orbitSize;
    this.scaffoldMaterial.resolution.set(this.resolution.x, this.resolution.y);
    this.tableBoundaryMaterial.color.set(this.getColor('outer_table_boundary'));
    this.tableBoundaryMaterial.linewidth = this.drawParams.orbitSize * TABLE_BOUNDARY_THICKNESS;
    this.tableBoundaryMaterial.resolution = this.resolution;

    const z = 0.5 / this.camera.zoom;
    this.startPoint.scale.set(z, z, z);
    this.nextPoint.scale.set(z, z, z);
    this.draggables.map(d => d.scale.set(z / 2, z / 2, 1));
    this.processKeyboardInput(dt);

    if (this.animationRunning) {
      this.tableParams.polygonParams.r = ANIMATION_MIN_R + (ANIMATION_MAX_R - ANIMATION_MIN_R)
        * this.animationFrame / ANIMATION_FRAME_COUNT;
      this.tableDirty = true;
    }

    if (this.cameraSwitch) {
      this.cameraSwitch = false;
      switch (this.geometry) {
      case Geometry.EUCLIDEAN:
      case Geometry.HYPERBOLIC:
        this.orbitControls.reset();
        this.orbitControls.enablePan = true;
        this.orbitControls.enableRotate = false;
        this.orbitControls.zoomToCursor = true;
        this.updateOrthographicCamera();
        this.orthographicCamera.rotation.set(0, 0, 0);
        break;
      case Geometry.SPHERICAL:
        if (this.drawParams.stereograph) {
          this.orbitControls.reset();
          this.orbitControls.enablePan = true;
          this.orbitControls.enableRotate = false;
          // this.orbitControls.zoomToCursor = true;
          this.updateOrthographicCamera();
          this.orthographicCamera.rotation.set(0, 0, 0);
        } else {
          this.orbitControls.reset();
          this.orbitControls.enablePan = false;
          this.orbitControls.enableRotate = true;
          this.orbitControls.zoomToCursor = false;
          this.updateOrthographicCamera();
          this.orthographicCamera.rotation.set(0, 0, 0);
        }
        break;
      }
    }

    if (this.tableDirty) this.updateTable();
    if (this.singularityDirty && this.drawParams.singularities && this.duality === Duality.OUTER) this.updateSingularities();
    // if (this.geometry === Geometry.HYPERBOLIC && this.duality === Duality.OUTER && this.hyperbolicTable.fresh) {
    // this.drawHyperbolicPreimages(this.hyperbolicTable.singularities);
    // this.hyperbolicTable.fresh = false;
    // }
    if (this.orbitDirty) this.updateOrbit();
    if (this.drawDirty) this.updateDraw();
  }

  updateGUI() {
    if (this.embedded) return;

    if (this.gui) this.gui.destroy();
    this.gui = new GUI();

    const billiardFolder = this.gui.addFolder('Billiard Type');
    billiardFolder.add(this.billiardTypeParams, 'duality').options(Object.values(Duality))
      .name('Duality')
      .onFinishChange(this.updateBilliardTypeParams.bind(this));
    billiardFolder.add(this.billiardTypeParams, 'generator').options(Object.values(Generator))
      .name('Generator')
      .onFinishChange(this.updateBilliardTypeParams.bind(this));
    billiardFolder.add(this.billiardTypeParams, 'geometry').options(Object.values(Geometry))
      .name('Geometry')
      .onFinishChange(() => {
        this.cameraSwitch = true;
        if (this.geometry !== Geometry.EUCLIDEAN) {
          this.tableParams.tableType = TableType.POLYGON;
        }
        this.updateBilliardTypeParams();
      });
    billiardFolder.open();

    const tableFolder = this.gui.addFolder('Table');
    tableFolder.add(this.tableParams, 'tableType').options(Object.values(TableType)).name('Table Type')
      .onFinishChange(() => {
        if (this.tableParams.tableType !== TableType.POLYGON) {
          this.cameraSwitch = true;
          this.billiardTypeParams.duality = Duality.OUTER;
          this.billiardTypeParams.geometry = Geometry.EUCLIDEAN;
        }
        this.updateTableParams();
      });
    switch (this.tableParams.tableType) {
    case TableType.POLYGON:
      tableFolder.add(this.tableParams.polygonParams, 'n').name('n')
        .min(2).max(12).step(1)
        .onFinishChange(this.updateTableParams.bind(this));
      if (this.geometry === Geometry.HYPERBOLIC || this.geometry === Geometry.SPHERICAL) {
        tableFolder.add(this.tableParams.polygonParams, 'r').name('r')
          .min(0.01).max(2).step(0.001)
          .onFinishChange(this.updateTableParams.bind(this));
      }
      break;
    case TableType.FLEXIGON:
      tableFolder.add(this.tableParams.flexigonParams, 'n').name('n')
        .min(2).max(12).step(1)
        .onFinishChange(this.updateTableParams.bind(this));
      tableFolder.add(this.tableParams.flexigonParams, 'k').name('k')
        .min(0.01).max(0.99).step(0.01)
        .onFinishChange(this.updateTableParams.bind(this));
      break;
    case TableType.SEMIDISK:
      tableFolder.add(this.tableParams.semidiskParams, 'beta').name('y')
        .min(-0.99).max(0.99).step(0.01)
        .onFinishChange(this.updateTableParams.bind(this));
      break;
    case TableType.ELLIPSE:
      tableFolder.add(this.tableParams.ellipseParams, 'eccentricity').name('Eccentricity')
        .min(0).max(0.99).step(0.01)
        .onFinishChange(this.updateTableParams.bind(this));
      break;
    case TableType.SUPERELLIPSE:
      tableFolder.add(this.tableParams.superellipseParams, 'p').name('p')
        .min(2).max(10).step(1)
        .onFinishChange(this.updateTableParams.bind(this));
      break;
    case TableType.LENS:
      tableFolder.add(this.tableParams.lensParams, 'k1', 0, 1, 0.001)
        .onFinishChange(this.updateTableParams.bind(this));
      tableFolder.add(this.tableParams.lensParams, 'k2', 0, 1, 0.001)
        .onFinishChange(this.updateTableParams.bind(this));
    }
    tableFolder.open();

    const drawFolder = this.gui.addFolder('Drawing');
    if (this.geometry === Geometry.HYPERBOLIC) {
      drawFolder.add(this.drawParams, 'model', ['Poincaré', 'Klein'])
        .name('Model').onFinishChange(this.updateDrawParams.bind(this));
    }
    if (this.duality === Duality.OUTER) {
      drawFolder.add(this.drawParams, 'singularities').name('Singularities').onFinishChange(
        this.markDrawDirty.bind(this));
      drawFolder.add(this.drawParams, 'singularityIterations').name('Iterations')
        .min(0).max(
        this.generator === Generator.AREA ? 1000 : 150).step(1)
        .onFinishChange(this.markSingularityDirty.bind(this));
      // drawFolder.add(this.drawParams, 'singInterval').name('Interval')
      //   .min(0).max(12).step(1)
      //   .onFinishChange(this.markSingularityDirty.bind(this));
      drawFolder.add(this.drawParams, 'connectEvery').name('Connect every')
        .min(0).max(12).step(1)
        .onFinishChange(this.markOrbitDirty.bind(this));
      drawFolder.add(this.drawParams, 'orbitSize').name('Orbit size')
        .min(0.0).max(5.0).step(0.1)
        .onFinishChange(this.markOrbitDirty.bind(this));
    } else {
      drawFolder.add(this.drawParams, 'phase').name('Phase').onFinishChange(
        this.markDrawDirty.bind(this));
    }
    if ((this.duality === Duality.OUTER && this.generator === Generator.LENGTH) ||
      this.duality === Duality.INNER && this.generator === Generator.AREA) {
      drawFolder.add(this.drawParams, 'scaffold').name('Scaffold').onFinishChange(
        this.markOrbitDirty.bind(this));
    }
    if (this.duality === Duality.OUTER && this.generator === Generator.LENGTH) {
      drawFolder.add(this.drawParams, 'centers').name('Centers').onFinishChange(
        this.markOrbitDirty.bind(this));
    }
    if (this.geometry === Geometry.SPHERICAL) {
      drawFolder.add(this.drawParams, 'stereograph').name('Stereographic').onFinishChange(() => {
        this.cameraSwitch = true;
        this.updateTableParams();
      });
    }
    drawFolder.open();

    const gameFolder = this.gui.addFolder('Game');
    gameFolder.add(this.drawParams, 'orbit').name('Draw Orbit').onChange(this.markDrawDirty.bind(this));
    gameFolder.add(this.drawParams, 'start').name('Start Point').onChange(this.markDrawDirty.bind(this));
    if (this.duality === Duality.INNER) {
      gameFolder.add(this.gameParams, 'startTime')
        .min(0).max(1).step(0.01).name('Start time')
        .onChange(() => {
          this.orbitDirty = true;
        });
      gameFolder.add(this.gameParams, 'angle')
        .min(0.01).max(0.99).step(0.01).name('Angle')
        .onChange(() => {
          this.orbitDirty = true;
        });
    }
    gameFolder.add(this.gameParams, 'iterations')
      .min(0).max(20).step(1).name('Iterations (log)')
      .onChange(() => {
        this.orbitDirty = true;
      });
    if (this.duality === Duality.OUTER && this.generator === Generator.AREA && this.tableParams.tableType === TableType.POLYGON) {
      gameFolder.add(this.gameParams, 'tilingPolygon')
        .min(3).max(20).step(1).name('Tiling').onFinishChange(this.makeTiling.bind(this));
    }
    gameFolder.open();
  }

  makeTiling() {
    if (!(this.duality === Duality.OUTER && this.generator === Generator.AREA)
      || this.gameParams.tilingPolygon < 3) {
      return;
    }

    const n = this.tableParams.polygonParams.n;
    const k = this.gameParams.tilingPolygon;
    if (k < 3) return;
    let v = 6 / n + 6 / k;
    if (v === 3 && this.geometry !== Geometry.EUCLIDEAN) {
      this.billiardTypeParams.geometry = Geometry.EUCLIDEAN;
      this.cameraSwitch = true;
      this.updateGUI();
      this.updateTableParams();
    } else if (v > 3 && this.geometry !== Geometry.SPHERICAL) {
      this.billiardTypeParams.geometry = Geometry.SPHERICAL;
      this.cameraSwitch = true;
      this.updateGUI();
    } else if (v < 3 && this.geometry !== Geometry.HYPERBOLIC) {
      this.billiardTypeParams.geometry = Geometry.HYPERBOLIC;
      this.cameraSwitch = true;
      this.updateGUI();
    }

    let r;
    switch (this.geometry) {
    case Geometry.EUCLIDEAN:
      return;
    case Geometry.HYPERBOLIC:
      r = hyperbolicTilingRadius(this.tableParams.polygonParams.n, this.gameParams.tilingPolygon);
      break;
    case Geometry.SPHERICAL:
      r = sphericalTilingRadius(this.tableParams.polygonParams.n, this.gameParams.tilingPolygon);
      break;
    }
    if (r === undefined) return;

    this.tableParams.polygonParams.r = r;
    this.updateBilliardTypeParams();
  }

  updateBilliardTypeParams() {
    this.updateGUI();
    this.updateTableParams();
  }

  updateTableParams() {
    this.updateGUI();
    this.tableDirty = true;
    this.resetAffineVertices();
  }

  updateDrawParams() {
    this.updateTable();
    this.drawDirty = true;
  }

  markSingularityDirty() {
    this.singularityDirty = true;
  }

  markOrbitDirty() {
    this.orbitDirty = true;
  }

  markDrawDirty() {
    this.drawDirty = true;
  }

  resetAffineVertices() {
    const points = [];
    this.scene.remove(...this.draggables);
    while (this.draggables.length) this.draggables.pop();
    if (this.geometry === Geometry.EUCLIDEAN && this.tableParams.tableType === TableType.POLYGON) {
      const n = this.tableParams.polygonParams.n;
      const dtheta = Math.PI * 2 / n;
      const offset = Math.PI / n - Math.PI / 2;
      for (let i = 0; i < n; i++) {
        const theta = i * dtheta + offset;
        const c = Complex.polar(Math.sqrt(2), theta);
        points.push(c.toVector2());
      }
      for (let p of points) {
        const dot = new Mesh(
          new CircleGeometry(0.025, 16), this.handleMaterial);
        dot.translateX(p.x);
        dot.translateY(p.y);
        dot.translateZ(0.6);
        this.draggables.push(dot);
      }
    }
    this.tableDirty = true;
    this.updateTable();
  }

  affineVertexDragStart() {
    this.dragging = true;
  }

  affineVertexDrag() {
    this.updateTable();
  }

  affineVertexDragEnd() {
    this.dragging = false;
    this.updateTable();
  }

  updateTable() {
    this.tableDirty = false;

    if (this.tableBoundary) this.scene.remove(this.tableBoundary);
    this.tableBoundary = undefined;
    this.scene.remove(this.tableMesh);
    let vertices: Vector2[] = [];
    let shape;
    switch (this.geometry) {
    case Geometry.SPHERICAL:
      let spherePoints = [];
      let np = new SpherePoint(new Vector3(0, 0, 1));
      let n = this.tableParams.polygonParams.n;
      for (let i = 0; i < n; i++) {
        let theta = i * 2 * Math.PI / n + Math.PI / 2;
        let ep = new SpherePoint(new Vector3(Math.cos(theta), Math.sin(theta), 0));
        let sp = sphericalLerp(np, ep, this.tableParams.polygonParams.r / (Math.PI / 2))
        spherePoints.push(sp);
      }
      this.sphericalTable = new SphericalPolygonTable(spherePoints);
      break;
    case Geometry.EUCLIDEAN:
      switch (this.tableParams.tableType) {
      case TableType.POLYGON:
        vertices = this.draggables.map(d => new Vector2(d.position.x, d.position.y));
        this.affineInnerTable = new AffinePolygonTable(vertices);
        this.affineOuterTable = new AffinePolygonTable(vertices);
        shape = this.affineOuterTable.shape(vertices.length);
        this.tableBoundary = new Line2(
          populateLineGeometry(new LineGeometry(), vertices.concat(vertices[0]), 0.5),
          this.tableBoundaryMaterial
        );
        break;
      case TableType.FLEXIGON:
        this.affineOuterTable = new AffineFlexigonTable(
          this.tableParams.flexigonParams.n,
          this.tableParams.flexigonParams.k
        );
        this.affineInnerTable = new AffineFlexigonTable(
          this.tableParams.flexigonParams.n,
          this.tableParams.flexigonParams.k
        );
        shape = this.affineOuterTable.shape(this.tableParams.flexigonParams.n * 128);
        break;
      case TableType.SEMIDISK:
        const y = this.tableParams.semidiskParams.beta;
        const x = Math.sqrt(1 - y * y);
        this.affineInnerTable = new AffinePiecewiseTable(
          [
            new Vector2(-x, y),
            new Vector2(x, y),
            new Vector2(0, 1),
          ],
          [0, 1, 1]);
        this.affineOuterTable = new AffinePiecewiseTable(
          [
            new Vector2(-x, y),
            new Vector2(x, y),
            new Vector2(0, 1),
          ],
          [0, 1, 1]);
        // this.affineOuterTable = new AffineSemidiskTable(this.tableParams.semidiskParams.beta + Math.PI / 2);
        // this.affineInnerTable = new AffineSemidiskTable(this.tableParams.semidiskParams.beta + Math.PI / 2);
        shape = this.affineOuterTable.shape(90);
        break;
      case TableType.ELLIPSE:
        this.affineOuterTable = new AffineEllipseTable(this.tableParams.ellipseParams.eccentricity);
        this.affineInnerTable = new AffineEllipseTable(this.tableParams.ellipseParams.eccentricity);
        shape = this.affineOuterTable.shape(360);
        break;
      case TableType.SUPERELLIPSE:
        this.affineInnerTable = new SuperellipseTable(this.tableParams.superellipseParams.p);
        this.affineOuterTable = new SuperellipseTable(this.tableParams.superellipseParams.p);
        shape = this.affineOuterTable.shape(360);
        const points = shape.getPoints(360);
        this.tableBoundary = new Line2(
          populateLineGeometry(new LineGeometry(), points.concat(points[0]), 0.5),
          this.tableBoundaryMaterial
        );
        break;
      case TableType.LENS:
        this.affineInnerTable = new AffinePiecewiseTable(
          [new Vector2(-1, 0), new Vector2(1, 0)],
          [this.tableParams.lensParams.k1, this.tableParams.lensParams.k2]);
        this.affineOuterTable = new AffinePiecewiseTable(
          [new Vector2(-1, 0), new Vector2(1, 0)],
          [this.tableParams.lensParams.k1, this.tableParams.lensParams.k2]);
        shape = this.affineOuterTable.shape(360);
      }
      const geometry = new THREE.ShapeGeometry(shape);
      this.tableMesh = new THREE.Mesh(geometry, this.tableFillMaterial);
      break;
    case Geometry.HYPERBOLIC:
      const hyperPoints = this.hyperbolicPoints();
      this.hyperbolicTable = new HyperbolicPolygonTable(hyperPoints);
      shape = this.hyperbolicTable.shape(this.model);
      const pts = this.hyperbolicTable.points(this.model);
      this.tableBoundary = new Line2(populateLineGeometry(new LineGeometry(), pts.concat(pts[0]), 0.5), this.tableBoundaryMaterial);
      break;
    default:
      throw Error('Unknown geometry type:' + this.billiardTypeParams.geometry);
    }

    switch (this.geometry) {
    case Geometry.SPHERICAL:
      const spts = this.sphericalTable.points(36, this.drawParams.stereograph);
      if (!this.drawParams.stereograph) {
        this.antiTable = this.sphericalTable.mesh(36, this.getColor('outer_table_fill'), this.drawParams.stereograph);
        this.antiTable.scale.set(-1, -1, -1);
        const aspts = spts.map(p => p.clone().multiplyScalar(-1));
        this.antiBoundary = new Line2(populateLineGeometry(new LineGeometry(), aspts.concat(aspts[0])), this.tableBoundaryMaterial);
      }
      this.tableMesh = this.sphericalTable.mesh(36, this.getColor('outer_table_fill'), this.drawParams.stereograph);
      this.tableBoundary = new Line2(populateLineGeometry(new LineGeometry(), spts.concat(spts[0])), this.tableBoundaryMaterial);
      break;
    case Geometry.EUCLIDEAN:
    case Geometry.HYPERBOLIC:
      const geometry = new THREE.ShapeGeometry(shape);
      this.tableMesh = new THREE.Mesh(geometry, this.tableFillMaterial);
      break;
    }

    if (this.duality === Duality.INNER && this.singularities) this.scene.remove(this.singularities);

    this.singularityDirty = true;
    this.orbitDirty = true;
    this.drawDirty = true;
  }

  updateSingularities() {
    this.scene.remove(this.singularities);
    this.singularities = new THREE.Object3D();
    // if (this.duality !== Duality.OUTER || this.generator === Generator.AREA || !this.drawParams.singularities) return;
    this.singularityDirty = false;
    let preimages: Straight[];
    let points: Vector2[];
    const si = this.dragging ? Math.min(this.drawParams.singularityIterations, 1) : this.drawParams.singularityIterations;
    switch (this.geometry) {
    case Geometry.SPHERICAL:
      const lsp: Vector3[] = [];
      const spherePreimages = this.sphericalTable.preimages(this.generator, si);
      this.sphereArcs = spherePreimages;
      for (let sp of spherePreimages) {
        const spp = sp.points(720, this.drawParams.stereograph);
        for (let i = 0; i < spp.length - 1; i++) {
          lsp.push(spp[i], spp[i + 1]);
        }
        if (this.animationRunning && this.grid !== null) {
          // const f: number = 1.0 - (1.0 - this.animationFrame / ANIMATION_FRAME_COUNT) * 0.2;
          const f = 1.0;
          this.csvGen.appendArc(sp.p1.coords.clone().multiplyScalar(f), sp.p2.coords.clone().multiplyScalar(f));
        }
      }
      const buffer = new Float32Array(lsp.length * 3);
      let i = 0;
      for (let p of lsp) {
        buffer[i] = p.x;
        buffer[i + 1] = p.y;
        buffer[i + 2] = p.z;
        i += 3;
      }

      const sg = new LineSegmentsGeometry().setPositions(buffer);
      this.singularities = new LineSegments2(
        sg,
        this.sphereSingularityMaterial
      );
      this.drawDirty = true;
      return;
    case Geometry.EUCLIDEAN:
      switch (this.tableParams.tableType) {
      case TableType.POLYGON:
      case TableType.FLEXIGON:
        preimages = this.affineOuterTable.preimages(this.generator, si);
        break;
      case TableType.SEMIDISK:
        preimages = this.affineOuterTable.preimages(this.generator, Math.max(si, 10));
        break;
      case TableType.ELLIPSE:
      case TableType.SUPERELLIPSE:
      case TableType.LENS:
        preimages = [];
        break;
      }
      points = [];
      for (let preimage of preimages) {
        points.push(preimage.start);
        if (preimage.infinite) {
          const diff = preimage.end.clone().sub(preimage.start);
          const far = preimage.start.clone().add(diff.normalize().multiplyScalar(100));
          points.push(far);
        } else {
          points.push(preimage.end);
        }
      }

      const geo = new LineSegmentsGeometry().setPositions(points.flatMap(v => [v.x, v.y, 0]));
      this.singularities = new LineSegments2(geo, this.singularityMaterial);
      break;
    case Geometry.HYPERBOLIC:
      this.drawHyperbolicPreimages(
        this.hyperbolicTable.preimages(this.generator, this.drawParams.singularityIterations)
      );
      break;
    default:
      throw Error('Unknown geometry');
    }

    this.drawDirty = true;
  }

  private drawHyperbolicPreimages(preimages: HyperGeodesic[]): void {
    this.marks = [];
    // console.log('drawing', preimages.length, 'preimages');
    this.scene.remove(this.singularities);
    const points = [];
    for (let preimage of preimages) {
      try {
        const segment = preimage.segment(HyperbolicModel.POINCARE) as ArcSegment;
        if (segment.length > 0.01) {
          this.marks.push({
            center: segment.center.toVector2(),
            radius: segment.radius,
            startAngle: segment.startAngle,
            endAngle: segment.endAngle,
          });
        }
      } catch {
      }
      const preimagePoints = preimage.interpolate(this.model, preimage.start, true).map(c => c.toVector2());
      for (let i = 0; i < preimagePoints.length - 1; i++) {
        points.push(preimagePoints[i]);
        points.push(preimagePoints[i + 1]);
      }
    }
    const buffer = new Float32Array(points.length * 3);
    let i = 0;
    for (let v of points) {
      buffer[i] = v.x;
      buffer[i + 1] = v.y;
      buffer[i + 2] = 0;
      i += 3;
    }
    const geo = new LineSegmentsGeometry().setPositions(buffer);
    this.singularities = new LineSegments2(geo, this.singularityMaterial);
    if (this.drawParams.singularities) this.scene.add(this.singularities);
  }

  euclideanOrbit() {
    let startPointPosition: Vector2;
    let nextPointPosition: Vector2;
    let geometry;
    let material;
    let it = this.dragging ? Math.min(this.iterations, 2) : this.iterations;
    if (this.moving) it = Math.min(it, Math.pow(2, 11));
    switch (this.duality) {
    case Duality.INNER:
      const chords = this.affineInnerTable.iterateInner(
        {time: this.gameParams.startTime, angle: this.gameParams.angle * Math.PI},
        this.generator,
        it,
      );
      if (chords.length === 0) {
        this.orbit = [];
        this.phaseDots = new Points();
        return;
      }
      if (chords.length > 1 && this.generator === Generator.AREA && this.drawParams.scaffold) {
        // Line segment from
        const p1 = this.affineInnerTable.point(chords[0].startTime);
        const p2 = this.affineInnerTable.point(chords[0].endTime);
        const h2 = this.affineInnerTable.heading(chords[0].endTime);
        const diff = new Vector2(Math.cos(h2), Math.sin(h2)).multiplyScalar(10);
        const p3 = this.affineInnerTable.point(chords[1].endTime);
        const sc = new Line2(new LineGeometry(), this.scaffoldMaterial);
        populateLineGeometry(sc.geometry, [p1, p3], 2);
        const tl = new Line2(new LineGeometry(), this.scaffoldMaterial);
        populateLineGeometry(tl.geometry, [p2.clone().add(diff), p2.clone().sub(diff)], 2);
        this.scaffold.push(sc, tl);
      }
      const points = chords.map(chord => chord.p1);
      points.push(chords[chords.length - 1].p2);

      this.phaseDots = new Points(
        new BufferGeometry().setFromPoints(
          chords.map(c => new Vector2(
            fixTime(c.startTime),
            normalizeAngle(c.startAngle, 0))
          )),
        this.phaseMaterial);

      startPointPosition = points[0];
      nextPointPosition = points[1];

      geometry = new THREE.BufferGeometry().setFromPoints(points);
      const orb = new THREE.Line(geometry, this.chordMaterial);
      orb.translateZ(2);
      this.orbit = [orb];
      break;
    case Duality.OUTER:
      let table = this.affineOuterTable;
      let orbit: Vector2[] = [];
      let centers: Vector2[] = [];
      let ac = null;
      switch (this.generator) {
      case Generator.LENGTH:
        const records = table.iterateOuterLength(this.affineOuterStart, it);
        orbit = records.orbit;
        centers = records.centers;
        ac = records.firstCircle;
        const fr = [];
        if (this.tableParams.tableType === TableType.POLYGON && this.tableParams.polygonParams.n === 4) {
          for (let o of orbit) {
            if (o.x > 1 && Math.abs(o.y) < 1) {
              this.runawayPoints.push(o.clone());
              fr.push(o.clone());
            }
          }
          // orbit = fr.length > 0 ? fr : [orbit[0]];
        }
        break;
      case Generator.AREA:
        orbit = table.iterateOuterArea(this.affineOuterStart, it);
        break;
      }
      if (this.generator === Generator.LENGTH && this.drawParams.scaffold && orbit.length > 1 && ac !== null) {
        const path = new THREE.Path();
        path.absellipse(ac.center.x, ac.center.y, ac.radius, ac.radius, 0, 2 * Math.PI, true, 0);
        const diskPoints = path.getPoints(Math.max(360));

        const lg = new LineGeometry();
        populateLineGeometry(lg, diskPoints.concat([diskPoints[0]]));
        this.scaffold.push(new Line2(lg, this.scaffoldMaterial));

        const rp = table.point(table.tangentTowardsPoint(orbit[0]));
        const fp = table.point(table.tangentFromPoint(orbit[0]));
        // const tp = table.rightTangentPoint(ac);
        const dr = orbit[0].clone().sub(rp).normalize().multiplyScalar(100);
        const df = orbit[0].clone().sub(fp).normalize().multiplyScalar(100);
        const rtl = new Line2(new LineGeometry(), this.scaffoldMaterial);
        const ftl = new Line2(new LineGeometry(), this.scaffoldMaterial);
        populateLineGeometry(rtl.geometry, [orbit[0].clone().add(dr), rp.clone().sub(dr)]);
        populateLineGeometry(ftl.geometry, [orbit[0].clone().add(df), fp.clone().sub(df)]);
        this.scaffold.push(
          rtl,
          ftl
        );
        // if (table instanceof AffineFlexigonTable) {
        //     const tl = table.rightTangentLine(ac);
        // }
        if (orbit.length > 1) {
          const tp = table.point(table.tangentFromPoint(orbit[1]));
          // const df = orbit[0].clone().sub(orbit[1]).normalize().multiplyScalar(100);
          const dt = orbit[1].clone().sub(tp).normalize().multiplyScalar(100);
          const ttl = new Line2(new LineGeometry(), this.scaffoldMaterial);
          populateLineGeometry(ttl.geometry, [orbit[1].clone().add(dt), tp.clone().sub(dt)]);
          this.scaffold.push(ttl);
        }
      }
      startPointPosition = this.affineOuterStart;
      nextPointPosition = orbit.length > 1 ? orbit[1] : startPointPosition;

      this.data = [];
      for (let i = 1; i < orbit.length - 2; i++) {
        const v1 = orbit[i - 1];
        const v2 = orbit[i + 1];
        const v1a = v1.angle();
        const v2a = v2.angle();
        const c1 = centers[i - 1] || new Vector2(1, 0);
        const c2 = centers[i + 1] || new Vector2(1, 0);
        const c1a = c1.angle();
        const c2a = c2.angle();
        this.data.push({
          r: orbit[i].length(),
          theta: orbit[i].angle(),
          dR: v2.length() - v1.length(),
          dTheta: normalizeAngle(v1a, v2a) - v2a,
          cr: centers[i]?.length() || 1,
          ctheta: orbit[i]?.angle() || 0,
          cdR: c2.length() - c1.length(),
          cdTheta: normalizeAngle(c1a, c2a) - c2a,
          center: c1.clone(),
          dCenter: c2.clone().sub(c1),
        })
      }
      this.orbit = [];
      const pts = new Points(new BufferGeometry().setFromPoints(orbit),
        this.outerOrbitPointMaterial);
      this.orbit = [pts];
      if (this.generator === Generator.LENGTH && this.drawParams.centers) {
        this.centers = [new THREE.Points(
          new BufferGeometry().setFromPoints(centers),
          new PointsMaterial({
            color: 0xffaa00,
            size: this.drawParams.orbitSize,
          })
        )];
      }
      if (this.drawParams.connectEvery == 0) {
        break;
      }
      // connectEvery > 0
      const seqs: Vector2[][] = [];
      const cseqs: Vector2[][] = [];
      for (let i = 0; i < this.drawParams.connectEvery; i++) {
        seqs.push([]);
        cseqs.push([]);
      }
      for (let i = 0; i < orbit.length; i++) {
        seqs[i % this.drawParams.connectEvery].push(orbit[i]);
      }
      for (let i = 0; i < centers.length; i++) {
        if (this.drawParams.centers) cseqs[i % this.drawParams.connectEvery].push(centers[i]);
      }
      for (let i = 0; i < 1; i++) {
        // for (let i = 0; i < seqs.length; i++) {
        geometry = new LineGeometry().setPositions(seqs[i].flatMap(v => [v.x, v.y, 0]));
        this.orbit.push(new Line2(geometry, this.outerOrbitLineMaterial));
      }
      if (this.drawParams.centers) {
        for (let i = 0; i < cseqs.length; i++) {
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(cseqs[i]);
          const lineMaterial = new LineBasicMaterial({
            color: 0x00aa44,
            linewidth: this.drawParams.orbitSize
          });
          this.centers.push(new THREE.Line(lineGeometry, lineMaterial));

          // const midpoints = [];
          // for (let j = 0; j < centers.length - 1; j++) {
          //   midpoints.push(centers[j].clone().add(centers[j + 1]).multiplyScalar(0.5));
          // }
          // this.centers.push(new Points(
          //   new BufferGeometry().setFromPoints(midpoints),
          //   new PointsMaterial({color: 0xaa00aa, size: 3})
          // ));
        }
      }
      break;
    }
    this.startPoint.position.set(startPointPosition.x, startPointPosition.y, 0.001);
    this.nextPoint.position.set(nextPointPosition.x, nextPointPosition.y, 0.001);
    this.nextPoint.visible = true;
  }

  hyperbolicOrbit() {
    let startPointPosition: Vector2;
    let nextPointPosition: Vector2;
    let geometry;
    let material;

    let points: Vector2[];
    switch (this.duality) {
    case Duality.INNER:
      const start = {time: this.gameParams.startTime, angle: this.gameParams.angle * Math.PI};

      if (this.drawParams.scaffold && this.generator === Generator.AREA) {
        const result = this.hyperbolicTable.innerArea(start, true);
        console.log('hypercycle:', result.hyperCycle);
        const cyclePoints = result.hyperCycle.interpolate(this.model);
        this.scaffold.push(
          new Line2(
            populateLineGeometry(new LineGeometry(), cyclePoints), this.scaffoldMaterial
          )
        );
      }

      const chords = this.hyperbolicTable.iterateInner(
        start,
        this.generator,
        this.iterations);
      points = [];
      for (let chord of chords) {
        if (chord.geodesic) points.push(...chord.geodesic.interpolate(this.model, chord.start).map(c => c.toVector2()));
      }

      if (chords.length === 0) {
        this.orbit = [];
        this.nextPoint = new THREE.Mesh();
        return;
      }
      geometry = populateLineGeometry(new LineGeometry(), points, 1);
      material = new THREE.LineBasicMaterial({color: CHORDS_COLOR});
      this.orbit = [new Line2(geometry, this.outerOrbitLineMaterial)];
      startPointPosition = chords[0].start.resolve(this.model).toVector2();
      nextPointPosition = chords[0].end.resolve(this.model).toVector2();
      this.startPoint.position.set(startPointPosition.x, startPointPosition.y, 0.001);
      this.nextPoint.position.set(nextPointPosition.x, nextPointPosition.y, 0.001);
      this.nextPoint.visible = true;
      break;
    case Duality.OUTER:
      let orbit;
      switch (this.generator) {
      case Generator.LENGTH:
        const records = this.hyperbolicTable.iterateOuterLength(this.hyperOuterStart, this.iterations);
        orbit = records.orbit;
        const circle = records.firstCircle;
        if (this.drawParams.scaffold && circle) {
          const circlePoints = circle.interpolate(this.model);
          this.scaffold.push(
            new Line2(
              populateLineGeometry(new LineGeometry(), circlePoints), this.scaffoldMaterial
            )
          );
        }
        break;
      case Generator.AREA:
        orbit = this.hyperbolicTable.iterateOuterArea(this.hyperOuterStart, this.iterations);
        break;
      }
      startPointPosition = this.hyperOuterStart.resolve(this.model).toVector2();
      this.startPoint.position.set(startPointPosition.x, startPointPosition.y, 0.001);
      if (orbit.length > 1) {
        nextPointPosition = orbit[1].resolve(this.model).toVector2();
        this.nextPoint.visible = true;
        this.nextPoint.position.set(nextPointPosition.x, nextPointPosition.y, 0.001);
      } else {
        this.nextPoint.visible = false;
      }
      // else nextPointPosition = orbit[0].resolve(this.model).toVector2();


      if (this.drawParams.connectEvery == 0) {
        // geometry = new THREE.CircleGeometry(0.005, 16);
        // material = new THREE.MeshBasicMaterial({color: OUTER_ORBIT_COLOR});
        // this.orbit = [new THREE.InstancedMesh(geometry, material, orbit.length)];
        // for (let i = 0; i < orbit.length; i++) {
        //     (this.orbit[0] as THREE.InstancedMesh)
        //         .setMatrixAt(i, new Matrix4().makeTranslation(
        //             orbit[i].resolve(this.model).x,
        //             orbit[i].resolve(this.model).y,
        //             0));
        // }
        // (this.orbit[0] as THREE.InstancedMesh).instanceMatrix.needsUpdate = true;
        this.orbit = [new THREE.Points(
          new BufferGeometry().setFromPoints(orbit.map(pt => pt.resolve(this.model).toVector2())),
          this.outerOrbitPointMaterial
        )];
        break;
      }
      if (orbit.length < 2) {
        this.orbit = [];
        break;
      }
      // connectEvery > 0
      points = [];
      for (let i = 0; i < orbit.length - 1; i++) {
        const o1 = orbit[i];
        const o2 = orbit[i + 1];
        const g = new HyperGeodesic(o1, o2);
        points.push(...g.interpolate(
          this.model,
          g.start,
          true).map(c => c.toVector2()));
      }
      geometry = new LineGeometry().setPositions(points.flatMap(p => [p.x, p.y, 0]));
      // material = new THREE.LineBasicMaterial({color: });
      this.orbit = [new Line2(geometry, this.outerOrbitLineMaterial)];
      break;
    default:
      throw Error('Unknown duality');
    }
  }

  sphericalOrbit() {
    switch (this.duality) {
    case Duality.INNER:
      const chords = this.sphericalTable.iterateInner({
        time: this.gameParams.startTime,
        angle: this.gameParams.angle * Math.PI,
      }, this.generator, this.iterations);
      const line = [];
      for (let chord of chords) {
        line.push(...new SphericalArc(chord.start, chord.end).points(36, this.drawParams.stereograph)
          .map(v => v.multiplyScalar(1.005)));
      }
      this.orbit = [
        new Line(
          new BufferGeometry().setFromPoints(line),
          new LineBasicMaterial({color: SPHERE_OUTER_ORBIT_COLOR}),
        )
      ];
      break;
    case Duality.OUTER:
      if (this.generator === Generator.LENGTH) return;
      let theta = this.affineOuterStart.x;
      let phi = this.affineOuterStart.y;
      let orbit = this.sphericalTable.iterateOuter(new SpherePoint(
        new Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.sin(phi) * Math.sin(theta),
          Math.cos(phi),
        )
      ), this.iterations);

      const ce = this.drawParams.connectEvery;
      if (ce === 0) {
        let vectors;
        if (this.drawParams.stereograph) {
          vectors = orbit[0].map(sp => sp.stereographic);
        } else {
          vectors = orbit[0].map(sp => sp.coords.clone().multiplyScalar(1.001));
        }
        this.orbit = [
          new Points(
            new BufferGeometry().setFromPoints(vectors),
            new PointsMaterial({color: SPHERE_OUTER_ORBIT_COLOR})
          )
        ];
      } else if (ce === 1) {
        const line = [];
        for (let i = 0; i < orbit[0].length - 1; i++) {
          line.push(...new SphericalArc(orbit[0][i], orbit[1][i]).points(36, this.drawParams.stereograph));
          line.push(...new SphericalArc(orbit[1][i], orbit[0][i + 1]).points(36, this.drawParams.stereograph));
        }
        this.orbit = [
          new Line(
            new BufferGeometry().setFromPoints(line),
            new LineBasicMaterial({color: SPHERE_OUTER_ORBIT_COLOR}),
          )
        ];
      } else {
        let paths: Vector3[][] = [];
        for (let i = 0; i < ce; i++) {
          paths.push([]);
        }
        for (let i = 0; i < orbit[0].length - 1; i++) {
          paths[i % ce].push(...new SphericalArc(orbit[0][i], orbit[0][i + 1]).points(36, this.drawParams.stereograph));
        }
        this.orbit = paths.map(path => new Line(
          new BufferGeometry().setFromPoints(path),
          new LineBasicMaterial({color: SPHERE_OUTER_ORBIT_COLOR}),
        ));
      }

      if (orbit.length === 0) return;
      let start = this.drawParams.stereograph ? orbit[0][0].stereographic : orbit[0][0].coords;
      this.startPoint.position.set(start.x, start.y, start.z);
      if (orbit[0].length > 1) {
        let end = this.drawParams.stereograph ? orbit[0][1].stereographic : orbit[0][1].coords;
        this.nextPoint.visible = true;
        this.nextPoint.position.set(end.x, end.y, end.z);
      } else {
        this.nextPoint.visible = false;
      }
      break;
    }
    return;
  }

  updateOrbit() {
    this.runawayPoints = [];
    this.orbitDirty = false;
    this.drawDirty = true;

    this.scaffold = [];
    this.centers = [];

    switch (this.geometry) {
    case Geometry.SPHERICAL:
      this.sphericalOrbit();
      break;
    case Geometry.EUCLIDEAN:
      this.euclideanOrbit();
      break;
    case Geometry.HYPERBOLIC:
      this.hyperbolicOrbit();
      break;
    default:
      throw Error('Unknown geometry');
    }

    this.drawDirty = true;
  }

  updateDraw() {
    this.drawDirty = false;
    this.scene.clear();
    if (this.mc) {
      console.log('you should see it now');
      this.scene.add(this.mc);
      this.scene.add(...this.lights);
      return;
    }
    if (this.tableBoundary) {
      this.scene.add(this.tableBoundary);
    }
    this.scene.add(this.tableMesh);

    if (this.tableParams.tableType === TableType.POLYGON) {
      if (this.draggables.length > 0) this.scene.add(...this.draggables);
    }

    switch (this.geometry) {
    case Geometry.EUCLIDEAN:
      break;
    case Geometry.HYPERBOLIC:
      this.scene.add(this.hyperbolicDisk);
      break;
    case Geometry.SPHERICAL:
      if (!this.drawParams.stereograph) {
        this.scene.add(this.antiTable);
        if (this.antiBoundary) this.scene.add(this.antiBoundary);
        this.scene.add(this.sphericalSphere);
        this.scene.add(...this.lights);
      }
      break;
    }
    if (this.duality === Duality.OUTER && this.drawParams.singularities) this.scene.add(this.singularities);

    if (this.drawParams.scaffold && this.scaffold.length > 0) this.scene.add(...this.scaffold);

    if (this.drawParams.orbit && this.orbit.length > 0) {
      this.scene.add(...this.orbit);
    }
    if (this.drawParams.start) {
      this.scene.add(this.startPoint);
      this.scene.add(this.nextPoint);
    }
    if (this.drawParams.centers) this.scene.add(...this.centers);
  }

  get geometry(): Geometry {
    return this.billiardTypeParams.geometry;
  }

  get duality(): Duality {
    return this.billiardTypeParams.duality;
  }

  get generator(): Generator {
    return this.billiardTypeParams.generator;
  }

  get model(): HyperbolicModel {
    return this.drawParams.model === 'Poincaré' ? HyperbolicModel.POINCARE : HyperbolicModel.KLEIN;
  }

  get iterations(): number {
    return Math.pow(2, this.gameParams.iterations);
  }

  private hyperbolicPoints(): HyperPoint[] {
    const points = [];
    const n = this.tableParams.polygonParams.n;
    const r = this.tableParams.polygonParams.r;
    const dtheta = Math.PI * 2 / n;
    const offset = Math.PI / n - Math.PI / 2;
    for (let i = 0; i < n; i++) {
      const theta = i * dtheta + offset;
      const c = Complex.polar(trueToPoincareDistance(r), theta);
      points.push(HyperPoint.fromPoincare(c));
    }
    return points;
  }

  protected readonly Duality = Duality;
}

function hyperbolicTilingRadius(n: number, k: number): number {
  const nint = (n - 2) * Math.PI / n;
  const kint = (k - 2) * Math.PI / k;
  if (2 * nint + 2 * kint <= 2 * Math.PI) throw Error('nonsense');

  const kext = 2 * n * Math.PI / k;

  const t = Math.tan(Math.PI / n) * Math.tan(kext / (2 * n));
  const po = Math.sqrt((1 - t) / (1 + t));
  const ko = poincareToKleinDistance(po);
  const kl = ko * Math.cos(Math.PI / n);
  return kleinToTrueDistance(kl);
}

function sphericalTilingRadius(n: number, k: number): number {
  if (1 / n + 1 / k <= 1 / 2) return -1;
  let m = Math.max(n, k);
  let l;
  switch (m) {
  case 3:
    l = Math.PI / 2;
    break;
  case 4:
    l = Math.PI / 3;
    break;
  case 5:
    l = Math.PI / 5;
    break;
  default:
    throw Error('nonsense');
  }
  // need radius of n-gon with side length l
  let a = Math.cos(l);
  let b = Math.cos(2 * Math.PI / n);
  return Math.acos(Math.abs(Math.sqrt((b - a) / (b - 1))));
}