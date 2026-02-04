import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {GUI} from "dat.gui";
import * as THREE from "three";
import {
  BufferGeometry,
  CircleGeometry,
  Color,
  Float32BufferAttribute,
  LineDashedMaterial,
  LineSegments,
  Matrix3,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Points,
  PointsMaterial,
  Vector2
} from "three";
import {DragControls} from "three/examples/jsm/controls/DragControls.js";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial.js";
import {affinity, applyAffinity, polar} from "../../../math/math-helpers";
import {Line} from "../../../math/geometry/line";
import {LineSegments2} from "three/examples/jsm/lines/LineSegments2.js";
import {LineSegmentsGeometry} from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import colormap from "colormap";
import {LineGeometry} from "three/examples/jsm/lines/LineGeometry.js";
import {Line2} from "three/examples/jsm/lines/Line2.js";

const DASH_SCALE: number = 50;

class AffineTwistedPolygon {
  n: number;
  vertices: Vector2[];
  affinity: Matrix3;
  affInverse: Matrix3;

  constructor(v: Vector2[]) {
    const n = v.length - 3;
    if (n < 1) throw Error('not enough vertices');
    this.n = n;
    this.vertices = v;
    this.affinity = affinity(
      [v[0], v[1], v[2]],
      [v[n], v[n + 1], v[n + 2]],
    );
    this.affInverse = this.affinity.clone().invert();
  }

  getVertex(idx: number): Vector2 {
    const q = Math.floor(idx / this.n);
    let r = idx % this.n;
    if (r < 0) r += this.n;
    let v = this.vertices[r].clone();
    const m = q < 0 ? this.affInverse : this.affinity;
    for (let i = 0; i < Math.abs(q); i++) {
      v = applyAffinity(m, v);
    }
    return v;
  }

  symplectagon(): AffineTwistedPolygon {
    const lines: Line[] = [];
    for (let i = -1; i < this.n + 3; i++) {
      lines.push(Line.srcDir(this.getVertex(i + 1), this.getVertex(i + 2).sub(this.getVertex(i))));
    }
    const points: Vector2[] = [];
    for (let i = 0; i < this.n + 3; i++) {
      points.push(lines[i].intersectLine(lines[i + 1]).toVector2());
    }
    return new AffineTwistedPolygon(points);
  }

  applyAffinity(m: Matrix3): AffineTwistedPolygon {
    return new AffineTwistedPolygon(this.vertices.map(v => applyAffinity(m, v)));
  }

  coordinates(): Vector2[] {
    const lines = [];
    for (let i = -1; i < this.n + 1; i++) {
      lines.push(Line.throughTwoPoints(this.getVertex(i), this.getVertex(i + 1)))
    }
    const stars = [];
    for (let i = 0; i < this.n; i++) {
      stars.push(lines[i].intersectLine(lines[i + 2]).toVector2());
    }
    const coords = [];
    for (let i = 0; i < this.n; i++) {
      const s = stars[i];
      const dm = this.getVertex(i).sub(this.getVertex(i - 1));
      const dp = this.getVertex(i + 2).sub(this.getVertex(i + 1));
      const l = s.clone().sub(this.getVertex(i));
      const r = this.getVertex(i + 1).sub(s);
      const alpha = l.dot(dm) / dm.dot(dm);
      const beta = r.dot(dp) / dp.dot(dp);
      coords.push(new Vector2(alpha, beta));
    }
    return coords;
  }
}

interface LengthCoords {
  alphas: number[],
  betas: number[],
}

@Component({
  selector: 'twisted-polygon',
  templateUrl: 'twisted-polygon.component.html',
  styleUrls: ['../../widgets/three-demo/three-demo.component.sass', 'twisted-polygon.component.sass'],
  standalone: true,
  imports: [CommonModule]
})
export class TwistedPolygonComponent extends ThreeDemoComponent implements AfterViewInit, OnDestroy {
  orbitControls: OrbitControls;
  dragControls: DragControls;
  gui: GUI = new GUI();
  oldZoom: number;
  images: Vector2[][] = [];
  coordinates: Vector2[][] = [];

  dirty: boolean = true;

  private handleMat = new MeshBasicMaterial();
  private vertexMat = new MeshBasicMaterial();
  private initialEdgeMat = new LineMaterial({
    linewidth: 2,
    resolution: this.resolution,
    color: 0x000000,
  });
  private edgeMat = new LineMaterial({
    linewidth: 1,
    resolution: this.resolution,
    color: 0x000000,
  });
  private diagMat = new LineDashedMaterial({
    linewidth: 1,
    color: 0x000000,
    dashSize: 1,
    gapSize: 1,
    scale: DASH_SCALE,
  })
  private dotGeo = new CircleGeometry(0.01);
  private pointMat = new PointsMaterial({size: 2});

  n: number = 2; // we need n+3 handles
  nVertices: number = 0;
  handles: Mesh[] = [];
  iterations: number = 1;
  initialEdges: Line2 = new Line2();
  edges: LineSegments2 = new LineSegments2();
  diagonals: LineSegments = new LineSegments();

  fixThree: boolean = false;
  drawEdges: boolean = true;
  drawVertices: boolean = false;
  drawCoordinates: boolean = false;

  projection: number[] = [];

  // coordinate view
  coordScene: THREE.Scene;
  coordRenderer: THREE.WebGLRenderer;
  coordCamera: THREE.OrthographicCamera;

  @ViewChild('coordinate_container', {static: true})
  coordHostElement?: ElementRef;
  coordOrbit: OrbitControls;

  constructor() {
    super();

    // Set up camera
    this.useOrthographic = true;
    this.updateOrthographicCamera();
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableRotate = false;
    this.orbitControls.zoomToCursor = true;
    this.oldZoom = this.camera.zoom;

    this.reset();

    // Set up DragControls
    this.dragControls = new DragControls(this.handles, this.camera, this.renderer.domElement);
    this.dragControls.addEventListener('drag', this.markDirty.bind(this));
    this.dragControls.addEventListener('dragend', this.markDirty.bind(this));

    this.updateGUI();

    this.colorScheme.register('handle', 0x990044, 0x990044);
    this.colorScheme.register('vertex', 0x000000, 0xffffff);
    this.colorScheme.register('edge', 0x000000, 0xffffff);


    this.coordScene = new THREE.Scene();
    this.coordRenderer = new THREE.WebGLRenderer({
      antialias: true,
    });

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.coordRenderer.setPixelRatio(window.devicePixelRatio);
    this.coordRenderer.setClearColor(0xffffff);

    this.coordCamera = new OrthographicCamera();
    this.coordCamera.position.z = 100;

    this.coordOrbit = new OrbitControls(this.coordCamera, this.coordRenderer.domElement);
    this.coordOrbit.enableRotate = false;
    this.coordOrbit.zoomToCursor = true;

    this.randomizeProjection();
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.gui.destroy();
    this.coordHostElement?.nativeElement.removeChild(this.renderer.domElement);
    this.coordRenderer.dispose();
  }


  updateGUI() {
    this.gui.destroy();
    this.gui = new GUI();
    this.gui.add(this, 'n', 1, 10, 1).onChange(() => {
      this.reset();
      this.dirty = true;
    });
    this.gui.add(this, 'iterations', 0, 20, 1).name('log2(iters)')
      .onChange(() => {
        this.dirty = true;
      });
    this.gui.add(this, 'fixThree').name('Normalize')
      .onChange(() => {
        this.dirty = true;
      });
    this.gui.add(this, 'drawEdges').name('Draw edges')
      .onChange(() => {
        this.dirty = true;
      });
    this.gui.add(this, 'drawVertices').name('Draw vertices')
      .onChange(() => {
        this.dirty = true;
      });
    this.gui.add(this, 'drawCoordinates').name('Plot coordinates')
      .onChange(() => {
        this.markDirty();
        this.updateGUI();
      });
    if (this.drawCoordinates) {
      this.gui.add(this, 'randomizeProjection').name('Randomize projection');
    }
    // this.gui.add(this, 'nVertices', 0, 100, 10).onChange(() => {
    //     this.dirty = true;
    // })
  }

  override ngAfterViewInit() {
    if (!this.coordHostElement) {
      console.error('Missing container for coordinate renderer');
      return;
    }
    this.coordRenderer.setSize(400, 400);
    this.coordOrbit = new OrbitControls(this.coordCamera, this.coordRenderer.domElement);
    this.coordOrbit.enableRotate = false;
    this.coordOrbit.zoomToCursor = true;
    this.coordHostElement.nativeElement.appendChild(this.coordRenderer.domElement);
    super.ngAfterViewInit();
  }

  reset() {
    while (this.handles.length > 0) {
      this.handles.pop();
    }
    for (let i = 0; i < this.n + 3; i++) {
      const v = polar(0.5 + 0.05 * i / (this.n + 3), i * 2 * Math.PI / (this.n + 3));
      this.handles.push(this.handle(v));
    }
    this.randomizeProjection();
  }

  markDirty() {
    this.dirty = true;
  }

  get vertices(): Vector2[] {
    return this.handles.map(h => new Vector2(h.position.x, h.position.y));
  }

  private handle(v: Vector2): Mesh {
    const d = new Mesh(this.dotGeo, this.handleMat);
    d.translateX(v.x);
    d.translateY(v.y);
    d.translateZ(0.1);
    return d;
  }

  override frame(_: number) {
    const f = this.oldZoom / this.camera.zoom;
    this.dotGeo.scale(f, f, 1)
    this.oldZoom = this.camera.zoom;

    this.renderer.setClearColor(this.getColor('clear'));
    this.coordRenderer.setClearColor(this.getColor('clear'));

    this.handleMat.color = new Color(this.getColor('handle'));
    this.vertexMat.color = new Color(this.getColor('vertex'));
    this.initialEdgeMat.color = new Color(this.getColor('edge'));
    this.initialEdgeMat.resolution = this.resolution;
    this.edgeMat.color = new Color(this.getColor('edge'));
    this.edgeMat.resolution = this.resolution;
    this.diagMat.color = new Color(this.getColor('edge'));
    this.pointMat.color = this.getColor('vertex');

    // this.diagMat.resolution = this.resolution;
    //
    // this.fixDiagonal();
    // this.diagMat.scale /= f;

    if (!this.dirty) {
      this.coordRenderer.render(this.coordScene, this.coordCamera);
      return;
    }
    this.scene.clear();
    this.dirty = false;
    this.iterate();

    const tp = new AffineTwistedPolygon(this.vertices);
    const points = []
    for (let i = -this.nVertices; i < this.nVertices + this.n + 2; i++) {
      points.push(
        tp.getVertex(i),
        tp.getVertex(i + 1)
      );
    }

    for (let image of this.images) {
      for (let i = 0; i < image.length - 1; i++) {
        points.push(image[i], image[i + 1]);
      }
    }
    if (this.drawVertices) {
      const colorOffset: number = this.fixThree ? 3 : 0;
      const scheme = colormap({
        colormap: 'temperature',
        nshades: Math.max(this.n - colorOffset, 9),
        format: 'float',
        alpha: 1
      }).map(c => new Color().setRGB(c[0], c[1], c[2]));

      const positions = [];
      const colors = [];
      for (let i = 0; i < this.images.length; i++) {
        const image = this.images[i];
        for (let j = this.fixThree ? 3 : 0; j < image.length; j++) {
          positions.push(
            this.images[i][j].x,
            this.images[i][j].y,
            0
          );
          const color = scheme[j - colorOffset];
          colors.push(color.r, color.g, color.b);
        }
      }
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
      geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
      geo.computeBoundingSphere();
      const points = new Points(
        geo,
        new PointsMaterial({size: 2, vertexColors: true})
      );
      this.scene.add(points);
    }

    this.initialEdges = new Line2(new LineGeometry().setPositions(
      this.vertices.flatMap(v => [v.x, v.y, 0])
    ), this.initialEdgeMat);
    if (this.drawEdges) {
      this.edges = new LineSegments2(new LineSegmentsGeometry().setPositions(
        points.flatMap((p => [p.x, p.y, 0]))
      ), this.edgeMat);
      this.scene.add(this.edges);
    }
    this.scene.add(this.initialEdges);
    this.scene.add(...this.handles);

    this.coordScene.clear();
    if (this.drawCoordinates && this.coordinates.length > 0) {
      const coordPoints = [];
      const center = this.project(this.coordinates[0]);
      console.log(this.coordinates[0], this.projection);
      for (let coord of this.coordinates) {
        coordPoints.push(this.project(coord));
      }
      const pts = new Points(
        new BufferGeometry().setFromPoints(coordPoints),
        this.pointMat,
      );
      pts.translateX(-center.x);
      pts.translateY(-center.y);
      this.coordScene.add(pts);
    }
    this.coordRenderer.render(this.coordScene, this.coordCamera);
  }

  project(coord: Vector2[]): Vector2 {
    return coord.reduce(
      (acc, coord, i) => acc.add(
        new Vector2(
          coord.x * this.projection[2 * i],
          coord.y * this.projection[2 * i + 1],
        )
      ),
      new Vector2()
    );
  }

  iterate() {
    this.images = [];
    this.coordinates = [];
    let tp = new AffineTwistedPolygon(this.vertices);
    const pins = [tp.vertices[0].clone(), tp.vertices[1].clone(), tp.vertices[2].clone()];
    for (let iter = 0; iter < Math.pow(2, this.iterations); iter++) {
      try {
        let image = tp.symplectagon();
        if (this.fixThree) {
          const m = affinity(image.vertices, pins);
          image = image.applyAffinity(m);
        }
        this.images.push([...image.vertices]);
        this.coordinates.push(image.coordinates());
        tp = image;
      } catch (e) {
        break;
      }
    }
  }

  randomizeProjection(): void {
    this.markDirty();
    let v: number[];
    let ss = 0;
    do {
      v = [];
      for (let i = 0; i < 2 * this.n; i++) {
        v.push(Math.random() * 2 - 1);
      }
      ss = sumOfSquares(v);
    } while (ss > 1);
    v.map(el => el / Math.sqrt(ss));
    this.projection = v;
  }
}

function sumOfSquares(v: number[]): number {
  return v.reduce((acc, el) => acc + el * el, 0);
}