import {AfterViewInit, Component, ElementRef, ViewChild} from "@angular/core";
import {CommonModule} from "@angular/common";
import {GUI} from "dat.gui";
import * as THREE from "three";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Matrix3,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Points,
  PointsMaterial,
  SphereGeometry,
  Vector2,
  Vector3
} from "three";
import {Line} from "../../../math/geometry/line";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial.js";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {DragControls} from "three/examples/jsm/controls/DragControls.js";
import {polar} from "../../../math/math-helpers";
import {LineSegmentsGeometry} from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import {LineSegments2} from "three/examples/jsm/lines/LineSegments2.js";
import {Line2} from "three/examples/jsm/lines/Line2.js";
import {LineGeometry} from "three/examples/jsm/lines/LineGeometry.js";
import colormap from "colormap";

class ProjectiveTwistedPolygon {
  n: number;
  vertices: Vector2[];
  homography: Matrix3;
  homInverse: Matrix3;

  constructor(v: Vector2[]) {
    const n = v.length - 4;
    if (n < 1) throw Error('not enough vertices');
    this.n = n;
    this.vertices = v;
    this.homography = fourToFour(
      [v[0], v[1], v[2], v[3]],
      [v[n], v[n + 1], v[n + 2], v[n + 3]],
    );
    this.homInverse = this.homography.clone().invert();
  }

  getVertex(idx: number): Vector2 {
    const q = Math.floor(idx / this.n);
    let r = idx % this.n;
    if (r < 0) r += this.n;
    let v = this.vertices[r].clone();
    const m = q < 0 ? this.homInverse : this.homography;
    for (let i = 0; i < Math.abs(q); i++) {
      v = applyProjectiveTransformation(v, m);
    }
    return v;
  }

  pentagram(): ProjectiveTwistedPolygon {
    const lines: Line[] = [];
    for (let i = -1; i < this.n + 4; i++) {
      lines.push(Line.throughTwoPoints(this.getVertex(i), this.getVertex(i + 2)));
    }
    const points: Vector2[] = [];
    for (let i = 0; i < this.n + 4; i++) {
      points.push(lines[i].intersectLine(lines[i + 1]).toVector2());
    }
    return new ProjectiveTwistedPolygon(points);
  }

  applyHomography(homography: Matrix3) {
    return new ProjectiveTwistedPolygon(this.vertices.map(v => applyProjectiveTransformation(v, homography)));
  }

  coordinates() {
    const coords = [];
    for (let i = 0; i < this.n; i++) {
      const vim2 = this.getVertex(i - 2);
      const vim1 = this.getVertex(i - 1);
      const vi = this.getVertex(i);
      const vip1 = this.getVertex(i + 1);
      const vip2 = this.getVertex(i + 2);

      try {
        const lm2 = Line.throughTwoPoints(vim2, vim1);
        const lm1 = Line.throughTwoPoints(vim1, vi);
        const lp1 = Line.throughTwoPoints(vi, vip1);
        const lp2 = Line.throughTwoPoints(vip1, vip2);

        const sm = lm2.intersectLine(lp1).toVector2();
        const sp = lm1.intersectLine(lp2).toVector2();
        const c = lm2.intersectLine(lp2).toVector2();

        coords.push(new Vector2(
          crossRatio(vim2, vim1, sm, c),
          crossRatio(vip2, vip1, sp, c),
        ));
      } catch (e) {
        coords.push(new Vector2());
      }
    }
    return coords;
  }
}

@Component({
  selector: 'pentagram',
  templateUrl: 'pentagram.component.html',
  styleUrls: ['../../widgets/three-demo/three-demo.component.sass', 'pentagram.component.sass'],
  standalone: true,
  imports: [CommonModule]
})
export class PentagramComponent extends ThreeDemoComponent implements AfterViewInit {
  diagonals: Vector2[] = [];
  images: Vector2[][] = [];
  coordinates: Vector2[][] = [];
  dirty: boolean = true;

  // Settings
  gui: GUI = new GUI();
  twisted: boolean = false;
  n: number = 7;
  nVertices: number = 10;
  iters: number = 0;

  rescale: boolean = false;
  fixCenter: boolean = false;
  skipEveryOther: boolean = false;
  fixFour: boolean = false;
  drawDiagonals: boolean = true;
  drawEdges: boolean = true;
  drawVertices: boolean = false;
  drawCoordinates: boolean = false;
  correctIndices: boolean = true;

  draggables: Mesh[] = [];
  dragControls: DragControls;
  orbitControls: OrbitControls;

  polygon: Line2 = new Line2();

  // coordinate view
  coordScene: THREE.Scene;
  coordRenderer: THREE.WebGLRenderer;
  coordCamera: THREE.OrthographicCamera;

  @ViewChild('coordinate_container', {static: true})
  coordHostElement?: ElementRef;
  coordOrbit: OrbitControls;

  projection: number[] = [];

  readonly EDGE_WIDTH: number = 1.5;
  private oldZoom: number;

  private dotMat = new MeshBasicMaterial();
  private dotGeo = new SphereGeometry(0.01);
  private diagMat = new LineBasicMaterial();
  private pointMat = new PointsMaterial();
  private imageMat = new LineMaterial({
    linewidth: this.EDGE_WIDTH,
    resolution: this.resolution
  });
  private polygonMat = new LineMaterial({
    linewidth: 2,
    resolution: this.resolution
  });

  constructor() {
    super();
    this.useOrthographic = true;
    this.updateOrthographicCamera();
    this.oldZoom = this.camera.zoom;
    this.orbitControls = new OrbitControls(this.orthographicCamera, this.renderer.domElement);
    this.orbitControls.enableRotate = false;
    this.orbitControls.zoomToCursor = true;

    this.reset();
    this.updateGUI();

    this.dragControls = new DragControls(this.draggables, this.camera, this.renderer.domElement);

    this.dragControls.addEventListener('drag', this.markDirty.bind(this));
    this.dragControls.addEventListener('dragend', this.markDirty.bind(this));

    this.coordScene = new THREE.Scene();
    this.coordRenderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    this.coordRenderer.setPixelRatio(window.devicePixelRatio);
    this.coordRenderer.setClearColor(0xffffff);

    this.coordCamera = new OrthographicCamera();
    this.coordCamera.position.z = 100;

    this.coordOrbit = new OrbitControls(this.coordCamera, this.coordRenderer.domElement);
    this.coordOrbit.enableRotate = false;
    this.coordOrbit.zoomToCursor = true;

    this.colorScheme.register('handle', 0xff0000, 0xff0000);
    this.colorScheme.register('vertex', 0x990044, 0x990044);
    this.colorScheme.register('edge', 0x000000, 0xffffff);
  }

  reset() {
    while (this.draggables.length > 0) {
      this.draggables.pop();
    }
    if (this.twisted) {
      for (let i = 0; i < this.n + 4; i++) {
        const v = polar(0.5 + i / (this.n + 3), i * 2 * Math.PI / (this.n + 4));
        this.draggables.push(this.dot(v));
      }
    } else {
      for (let i = 0; i < this.n; i++) {
        const v = polar(1, i * 2 * Math.PI / this.n);
        this.draggables.push(this.dot(v));
      }
    }
    this.randomizeProjection();
  }

  private dot(v: Vector2): Mesh {
    const d = new Mesh(this.dotGeo, this.dotMat);
    d.translateX(v.x);
    d.translateY(v.y);
    return d;
  }

  markDirty() {
    this.dirty = true;
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

  updateGUI() {
    this.gui.destroy();
    this.gui = new GUI();
    const polyFolder = this.gui.addFolder('Polygon');
    polyFolder.add(this, 'n', 1, 12, 1).onFinishChange(() => {
      this.reset();
      this.updateGUI();
      this.markDirty();
    });
    polyFolder.add(this, 'twisted').name('Twist').onFinishChange(() => {
      this.reset();
      this.updateGUI();
      this.markDirty();
    })
    if (this.twisted) {
      polyFolder.add(this, 'nVertices', 0, 10, 1).name('Extend').onChange(() => {
        this.markDirty()
      });
    }
    const iterFolder = this.gui.addFolder('Iteration');
    const normFolder = this.gui.addFolder('Normalization');
    const drawFolder = this.gui.addFolder('Draw');
    iterFolder.add(this, 'iters', 0, 20, 1).name('log2(iters)').onChange(() => {
      this.markDirty();
    });
    normFolder.add(this, 'rescale').name('Fix area')
      .onChange(() => this.markDirty());
    normFolder.add(this, 'fixCenter').name('Fix position')
      .onChange(() => this.markDirty());
    drawFolder.add(this, 'skipEveryOther').name('Skip odd images')
      .onChange(() => this.markDirty());
    normFolder.add(this, 'fixFour').name('Renormalize?')
      .onChange(() => this.markDirty());
    drawFolder.add(this, 'drawDiagonals').name('Draw diagonals')
      .onChange(() => this.markDirty());
    drawFolder.add(this, 'drawEdges').name('Draw edges')
      .onChange(() => this.markDirty());
    drawFolder.add(this, 'drawVertices').name('Draw vertices')
      .onChange(() => this.markDirty());
    drawFolder.add(this, 'drawCoordinates').name('Plot coordinates')
      .onChange(() => {
        this.markDirty();
        this.updateGUI();
      });
    if (this.drawCoordinates) {
      drawFolder.add(this, 'randomizeProjection').name('Randomize projection');
    }
    polyFolder.open();
    iterFolder.open();
    normFolder.open();
    drawFolder.open();
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

  override frame(_: number) {
    const f = this.oldZoom / this.camera.zoom;
    this.dotGeo.scale(f, f, 1)
    this.oldZoom = this.camera.zoom;

    this.renderer.setClearColor(this.getColor('clear'));
    this.coordRenderer.setClearColor(this.getColor('clear'));

    this.diagMat.color = this.getColor('edge');
    this.pointMat.color = this.getColor('vertex');
    this.dotMat.color = this.getColor('vertex');
    this.imageMat.color = this.getColor('edge');
    this.imageMat.resolution = this.resolution;
    this.polygonMat.color = this.getColor('edge');
    this.polygonMat.resolution = this.resolution;

    if (this.dirty) {
      this.dirty = false;
      this.scene.clear();
      this.scene.add(...this.draggables);
      const vertices = [];
      if (this.twisted) {
        this.iterateTwisted();
        let tp = new ProjectiveTwistedPolygon(this.vertices);
        for (let i = -this.nVertices; i < this.nVertices + this.n + 4; i++) {
          vertices.push(tp.getVertex(i));
        }
      } else {
        this.iterate();
        vertices.push(...this.vertices, this.vertices[0]);
      }
      this.polygon = new Line2(
        new LineGeometry().setPositions(vertices.flatMap(v => [v.x, v.y, 0])),
        this.polygonMat,
      );
      this.scene.add(this.polygon);
      if (this.drawDiagonals && !this.rescale && !this.fixFour) {
        const diagonals = new LineSegments(
          new BufferGeometry().setFromPoints(this.diagonals),
          this.diagMat,
        );
        this.scene.add(diagonals);
      }
      if (this.drawEdges) {
        const ls = [];
        for (let i = this.skipEveryOther ? 1 : 0; i < this.images.length; i += this.skipEveryOther ? 2 : 1) {
          const image = this.images[i];
          if (this.twisted) {
            for (let j = 0; j < image.length - 1; j++) {
              ls.push(image[j], image[(j + 1)]);
            }
          } else {
            for (let j = 0; j < image.length; j++) {
              ls.push(image[j], image[(j + 1) % image.length]);
            }
          }
        }
        const images: LineSegments2 = new LineSegments2(
          new LineSegmentsGeometry().setPositions(ls.flatMap(v => [v.x, v.y, 0])),
          this.imageMat);
        this.scene.add(images);
      }
      if (this.drawVertices) {
        const colorOffset: number = this.fixFour ? 4 : 0;
        const scheme = colormap({
          colormap: 'temperature',
          nshades: Math.max(this.n - colorOffset, 9),
          format: 'float',
          alpha: 1
        }).map(c => new Color().setRGB(c[0], c[1], c[2]));

        const positions = [];
        const colors = [];
        for (let i = this.skipEveryOther ? 1 : 0; i < this.images.length; i += this.skipEveryOther ? 2 : 1) {
          const image = this.images[i];
          for (let j = this.fixFour ? 4 : 0; j < image.length; j++) {
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
          new PointsMaterial({size: 1, vertexColors: true})
        );
        this.scene.add(points);
      }
      if (this.drawCoordinates) {
        this.coordScene.clear();

        let center = this.projectCoordinates(this.coordinates[0]);
        const points = [new Vector2()];
        for (let i = this.skipEveryOther ? 1 : 0; i < this.images.length; i += this.skipEveryOther ? 2 : 1) {
          const image = this.images[i];
          let c = this.projectCoordinates(this.coordinates[i]);
          // points.push(new Vector2(c[0].x, c[1].x));
          points.push(c.sub(center));
          // sumPoints.push(c.reduce((acc, v) => acc.add(v), new Vector2()).sub(initialSum));
        }
        const coordinatePlot = new Points(
          new BufferGeometry().setFromPoints(points),
          this.pointMat,
        );
        this.coordScene.add(coordinatePlot);
        console.log('drawing coords', this.coordCamera);
        this.coordRenderer.render(this.coordScene, this.coordCamera);
      }
    } else {
      this.coordRenderer.render(this.coordScene, this.coordCamera);
    }
  }

  iterate() {
    let vertices = this.vertices;
    let n = vertices.length;
    this.images = [];
    this.diagonals = [];
    this.coordinates = [];
    const initialArea = algebraicArea(vertices);
    const initialCenter = vertices.reduce(
      (acc, v) => acc.add(v),
      new Vector2()
    ).multiplyScalar(1 / n);

    const pins: [Vector2, Vector2, Vector2, Vector2] = [vertices[0], vertices[1], vertices[2], vertices[3]];
    for (let iter = 0; iter < Math.pow(2, this.iters); iter++) {
      try {
        const offset = this.correctIndices ? -iter % 2 : 0;
        const dls = [];
        for (let i = 0; i < n; i++) {
          const v1 = vertices[(i + n + offset) % n];
          const v2 = vertices[(i + n + offset + 2) % n];
          this.diagonals.push(v1.clone(), v2.clone());
          dls.push(Line.throughTwoPoints(v1, v2));
        }
        const nv: Vector2[] = [];
        for (let i = 0; i < n; i++) {
          const l1 = dls[(i + n - 1) % n];
          const l2 = dls[i];
          nv.push(l1.intersectLine(l2).toVector2());
        }
        vertices = nv;
        if (this.fixFour) {
          vertices = normalizePolygon(pins, vertices);
        } else if (this.rescale) {
          const ratio = Math.sqrt(initialArea / algebraicArea(vertices));
          vertices.map(v => v.multiplyScalar(ratio));

          if (this.fixCenter) {
            const center = vertices.reduce(
              (acc, v) => acc.add(v),
              new Vector2()
            ).multiplyScalar(1 / n);
            const diff = initialCenter.clone().sub(center);
            vertices.map(v => v.add(diff));
          }
        }
        this.images.push(vertices);
        this.coordinates.push(coordinates(vertices));
      } catch (e) {
        break;
      }
    }
  }

  iterateTwisted() {
    this.images = [];
    this.diagonals = [];
    this.coordinates = [];

    let tp = new ProjectiveTwistedPolygon(this.vertices);
    const pins: [Vector2, Vector2, Vector2, Vector2] = [tp.vertices[0], tp.vertices[1], tp.vertices[2], tp.vertices[3]];
    for (let iter = 0; iter < Math.pow(2, this.iters); iter++) {
      for (let i = -1; i < tp.n + 4; i++) {
        this.diagonals.push(tp.getVertex(i), tp.getVertex(i + 2))
      }
      try {
        let image = tp.pentagram();
        if (this.fixFour) {
          const homography = fourToFour(image.vertices, pins);
          image = image.applyHomography(homography);
        }
        this.images.push([...image.vertices]);
        this.coordinates.push(image.coordinates());
        tp = image;
      } catch (e) {
        break;
      }
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    try {
      this.gui.destroy();
      this.coordHostElement?.nativeElement.removeChild(this.renderer.domElement);
      this.coordRenderer.dispose();
    } catch (e) {

    }
  }

  private projectCoordinates(coordinates: Vector2[]) {
    return coordinates.reduce(
      (acc, coord, i) => acc.add(
        new Vector2(
          coord.x * this.projection[2 * i],
          coord.y * this.projection[2 * i + 1],
        )
      ),
      new Vector2()
    );
  }

  get vertices(): Vector2[] {
    const objects = this.dragControls.getObjects();
    return objects.map(o => new Vector2(o.position.x, o.position.y));
  }
}

function coordinates(polygon: Vector2[]) {
  const coords = [];
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const vim2 = polygon[(i + n - 2) % n].clone();
    const vim1 = polygon[(i + n - 1) % n].clone();
    const vi = polygon[i].clone();
    const vip1 = polygon[(i + n + 1) % n].clone();
    const vip2 = polygon[(i + n + 2) % n].clone();

    try {
      const lm2 = Line.throughTwoPoints(vim2, vim1);
      const lm1 = Line.throughTwoPoints(vim1, vi);
      const lp1 = Line.throughTwoPoints(vi, vip1);
      const lp2 = Line.throughTwoPoints(vip1, vip2);

      const sm = lm2.intersectLine(lp1).toVector2();
      const sp = lm1.intersectLine(lp2).toVector2();
      const c = lm2.intersectLine(lp2).toVector2();

      coords.push(new Vector2(
        crossRatio(vim2, vim1, sm, c),
        crossRatio(vip2, vip1, sp, c),
      ));
    } catch (e) {
      coords.push(new Vector2());
    }
  }
  return coords;
}

function crossRatio(v1: Vector2, v2: Vector2, v3: Vector2, v4: Vector2): number {
  return Math.sqrt(
    (v1.distanceToSquared(v2) * v3.distanceToSquared(v4)) /
    (v1.distanceToSquared(v3) * v2.distanceToSquared(v4)));
}

function algebraicArea(polygon: Vector2[]): number {
  let a = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    let v1 = polygon[i];
    let v2 = polygon[(i + 1) % n];
    a += v1.cross(v2);
  }
  return Math.abs(a) / 2;
}

function normalizePolygon(pins: [Vector2, Vector2, Vector2, Vector2], polygon: Vector2[]): Vector2[] {
  const proj = fourToFour(polygon, pins);
  return polygon.map(v => applyProjectiveTransformation(v, proj));
}

function applyProjectiveTransformation(v: Vector2, proj: Matrix3): Vector2 {
  const im = new Vector3(v.x, v.y, 1).applyMatrix3(proj);
  return new Vector2(im.x / im.z, im.y / im.z);
}

function fourToBasis(v1: Vector2, v2: Vector2, v3: Vector2, v4: Vector2): Matrix3 {
  const c = new Vector3(
    v4.x,
    v4.y,
    1
  ).applyMatrix3(new Matrix3(
    v1.x, v2.x, v3.x,
    v1.y, v2.y, v3.y,
    1, 1, 1
  ).invert());
  return new Matrix3(
    c.x * v1.x, c.y * v2.x, c.z * v3.x,
    c.x * v1.y, c.y * v2.y, c.z * v3.y,
    c.x, c.y, c.z,
  ).multiplyScalar(1 / c.z);
}

function fourToFour(src: Vector2[], dst: Vector2[]): Matrix3 {
  // Build the 8x8 system: Ax = b
  const A = [];
  const b = [];

  for (let i = 0; i < 4; i++) {
    const {x: x, y: y} = src[i];
    const {x: u, y: v} = dst[i];

    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(u);
    b.push(v);
  }

  const h = solveLinearSystem(A, b);
  const H = new Matrix3();
  H.set(
    h[0], h[1], h[2],
    h[3], h[4], h[5],
    h[6], h[7], 1
  );

  return H;
}

// Example using simple Gaussian elimination:
function solveLinearSystem(A: number[][], b: number[]) {
  // A is m x n (8x8), b is m
  const n = b.length;
  const M = A.map((row, i) => row.concat(b[i]));

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(M[j][i]) > Math.abs(M[maxRow][i])) {
        maxRow = j;
      }
    }
    [M[i], M[maxRow]] = [M[maxRow], M[i]];

    // Eliminate
    for (let j = i + 1; j < n; j++) {
      const factor = M[j][i] / M[i][i];
      for (let k = i; k <= n; k++) {
        M[j][k] -= factor * M[i][k];
      }
    }
  }

  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = sum / M[i][i];
  }
  return x;
}

function sumOfSquares(v: number[]): number {
  return v.reduce((acc, el) => acc + el * el, 0);
}