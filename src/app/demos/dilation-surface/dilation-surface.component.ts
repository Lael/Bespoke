import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {CircleGeometry, Mesh, MeshBasicMaterial, Vector2} from "three";
import {DragControls} from "three/examples/jsm/controls/DragControls.js";
import {clamp} from "three/src/math/MathUtils.js";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial.js";
import {Line2} from "three/examples/jsm/lines/Line2.js";
import {LineGeometry} from "three/examples/jsm/lines/LineGeometry.js";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {Triangle} from "../../../math/geometry/triangle";
import {LineSegments2} from "three/examples/jsm/lines/LineSegments2.js";
import {Line} from "../../../math/geometry/line";
import {LineSegment} from "../../../math/geometry/line-segment";
import {LineSegmentsGeometry} from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import {GUI} from "dat.gui";

interface Intersection {
  pt: Vector2;
  idx: number;
}

const SPEED: number = 0.25;

@Component({
  selector: 'dilation-surface',
  templateUrl: '../../widgets/three-demo/three-demo.component.html',
  styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
  standalone: true,
  imports: [CommonModule]
})
export class DilationSurfaceComponent extends ThreeDemoComponent {
  vertexDragControls: DragControls;
  sliderDragControls: DragControls;
  orbitControls: OrbitControls;

  orbitDirty = true;
  iters: number = 1;
  startX: number = 0.54;

  ratioA: number = 0.5;
  ratioB: number = 0.5;
  ratioC: number = 0.5;

  vertexA = new Vector2(0, 0.75);
  vertexB = new Vector2(-Math.sqrt(3) / 2, -0.75);
  vertexC = new Vector2(Math.sqrt(3) / 2, -0.75);

  sliderA = this.vertexB.clone().lerp(this.vertexC, this.ratioA);
  sliderB = this.vertexC.clone().lerp(this.vertexA, this.ratioB);
  sliderC = this.vertexA.clone().lerp(this.vertexB, this.ratioC);

  vertexMat = new MeshBasicMaterial();
  edgeMat = new LineMaterial({linewidth: 2, resolution: this.resolution});
  startMat = new LineMaterial({linewidth: 2, resolution: this.resolution});
  upMat = new LineMaterial({linewidth: 0.5, resolution: this.resolution});
  downMat = new LineMaterial({linewidth: 0.5, resolution: this.resolution});
  sliderAMat = new MeshBasicMaterial();
  sliderBMat = new MeshBasicMaterial();
  sliderCMat = new MeshBasicMaterial();

  vertices: Mesh[] = [];
  sliders: Mesh[] = [];
  polygon: Line2;
  orbit: LineSegments2[] = [];

  gui: GUI = new GUI();

  constructor() {
    super();
    this.useOrthographic = true;

    this.registerColor('sliderA', 0xffaa00, 0xffaa00);
    this.registerColor('sliderB', 0xaa0000, 0xff0000);
    this.registerColor('sliderC', 0x00aa00, 0x00ff00);
    this.registerColor('vertex', 0x000000, 0xffffff);
    this.registerColor('edge', 0x444444, 0xbbbbbb);
    this.registerColor('up', 0x880088, 0x880088);
    this.registerColor('down', 0x008888, 0x008888);

    const geometry = new CircleGeometry(0.0125, 36);

    for (let p of [this.vertexA, this.vertexB, this.vertexC]) {
      let dot = new Mesh(geometry, this.vertexMat);
      dot.position.set(p.x, p.y, 0.1);
      this.vertices.push(dot);
    }
    this.scene.add(...this.vertices);

    const polygonGeometry = new LineGeometry();
    polygonGeometry.setPositions([this.vertexA, this.vertexB, this.vertexC, this.vertexA].flatMap(v => [v.x, v.y, 0.05]));
    this.polygon = new Line2(polygonGeometry, this.edgeMat);
    this.scene.add(this.polygon);

    const dotA = new Mesh(geometry, this.sliderAMat);
    const dotB = new Mesh(geometry, this.sliderBMat);
    const dotC = new Mesh(geometry, this.sliderCMat);
    dotA.position.set(this.sliderA.x, this.sliderA.y, 0.1);
    dotB.position.set(this.sliderB.x, this.sliderB.y, 0.1);
    dotC.position.set(this.sliderC.x, this.sliderC.y, 0.1);
    this.sliders.push(dotA, dotB, dotC);
    this.scene.add(...this.sliders);
    this.vertexDragControls = new DragControls(this.vertices, this.camera, this.renderer.domElement);
    this.vertexDragControls.addEventListener('drag', this.dragVertex.bind(this));

    this.sliderDragControls = new DragControls(this.sliders, this.camera, this.renderer.domElement);
    this.sliderDragControls.addEventListener('drag', this.dragSlider.bind(this));

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableRotate = false;
    this.orbitControls.enablePan = true;
    this.orbitControls.zoomToCursor = true;

    this.gui.add(this, 'iters', 0, 14, 1).name('log2(iters)').onChange(() => this.orbitDirty = true);
    this.gui.open();
  }

  dragVertex() {
    this.vertexA.set(this.vertices[0].position.x, this.vertices[0].position.y);
    this.vertexB.set(this.vertices[1].position.x, this.vertices[1].position.y);
    this.vertexC.set(this.vertices[2].position.x, this.vertices[2].position.y);

    const newA = this.vertexB.clone().lerp(this.vertexC, this.ratioA);
    this.sliderA.set(newA.x, newA.y);
    const newB = this.vertexC.clone().lerp(this.vertexA, this.ratioB);
    this.sliderB.set(newB.x, newB.y);
    const newC = this.vertexA.clone().lerp(this.vertexB, this.ratioC);
    this.sliderC.set(newC.x, newC.y);

    this.sliders[0].position.set(this.sliderA.x, this.sliderA.y, 0.1);
    this.sliders[1].position.set(this.sliderB.x, this.sliderB.y, 0.1);
    this.sliders[2].position.set(this.sliderC.x, this.sliderC.y, 0.1);

    this.polygon.geometry
      .setPositions([this.vertexA, this.vertexB, this.vertexC, this.vertexA].flatMap(v => [v.x, v.y, 0.05]));

    this.orbitDirty = true;
  }

  dragSlider() {
    this.sliderA.set(this.sliders[0].position.x, this.sliders[0].position.y);
    this.sliderB.set(this.sliders[1].position.x, this.sliders[1].position.y);
    this.sliderC.set(this.sliders[2].position.x, this.sliders[2].position.y);

    this.ratioA = ratio(this.sliderA, this.vertexB, this.vertexC);
    this.ratioB = ratio(this.sliderB, this.vertexC, this.vertexA);
    this.ratioC = ratio(this.sliderC, this.vertexA, this.vertexB);

    const newA = this.vertexB.clone().lerp(this.vertexC, this.ratioA);
    this.sliderA.set(newA.x, newA.y);
    const newB = this.vertexC.clone().lerp(this.vertexA, this.ratioB);
    this.sliderB.set(newB.x, newB.y);
    const newC = this.vertexA.clone().lerp(this.vertexB, this.ratioC);
    this.sliderC.set(newC.x, newC.y);

    this.sliders[0].position.set(this.sliderA.x, this.sliderA.y, 0.1);
    this.sliders[1].position.set(this.sliderB.x, this.sliderB.y, 0.1);
    this.sliders[2].position.set(this.sliderC.x, this.sliderC.y, 0.1);

    this.orbitDirty = true;
  }

  processKeyboardInput(dt: number) {
    let dx = 0;
    let mult = 1;
    if (this.keyHeld('ArrowLeft')) dx -= 1;
    if (this.keyHeld('ArrowRight')) dx += 1;
    if (this.keyHeld('ShiftLeft') || this.keyHeld('ShiftRight')) mult /= 10;
    if (this.keyHeld('AltLeft') || this.keyHeld('AltRight')) mult /= 100;
    if (dx !== 0) {
      this.startX += dx * dt * SPEED * mult;
      this.orbitDirty = true;
    }
  }

  frame(dt: number): void {
    this.processKeyboardInput(dt);

    this.renderer.setClearColor(this.getColor('clear'));
    this.vertexMat.color.set(this.getColor('vertex'));
    this.edgeMat.color.set(this.getColor('edge'));
    this.startMat.color.set(this.getColor('up'));
    this.upMat.color.set(this.getColor('up'));
    this.downMat.color.set(this.getColor('down'));
    // this.edgeMat.resolution.set(this.resolution.x, this.resolution.y);
    this.sliderAMat.color.set(this.getColor('sliderA'));
    this.sliderBMat.color.set(this.getColor('sliderB'));
    this.sliderCMat.color.set(this.getColor('sliderC'));

    if (this.orbitDirty) {
      this.orbitDirty = false;
      this.iterate();
    }
  }

  intersect(line: Line): Intersection[] {
    const candidates = [];
    let i = 0;
    for (let ls of [
      new LineSegment(this.vertexB, this.vertexC),
      new LineSegment(this.vertexC, this.vertexA),
      new LineSegment(this.vertexA, this.vertexB)]) {
      const inter = ls.intersectLine(line);
      if (!!inter) {
        candidates.push({
          idx: i,
          pt: inter.toVector2(),
        });
      }
      i++;
    }
    return candidates.sort((a, b) => a.pt.y - b.pt.y);
  }

  iterate() {
    if (this.orbit.length > 0) this.scene.remove(...this.orbit);
    const tri = new Triangle(this.vertexA, this.vertexB, this.vertexC);
    let x = this.startX;
    let ups = [];
    let downs = [];
    for (let i = 0; i < Math.pow(2, this.iters); i++) {
      let pts = this.intersect(new Line(1, 0, -x));
      console.log(pts);
      if (pts.length > 2) {
        console.warn('hit a vertex!');
      }
      if (pts.length !== 2) {
        break;
      }
      let intersection: Intersection | null = null;
      if (i % 2 === 0) {
        ups.push(...pts.map(i => i.pt));
        intersection = pts[1];
        // reflect pts[1]
        // choose which side
        // reflect
        // set x
      } else {
        downs.push(...pts.map(i => i.pt));
        // reflect pts[0]
        intersection = pts[0];
      }
      if (intersection === null) {
        break;
      }
      let r;
      let newR;
      let p = new Vector2();
      switch (intersection?.idx) {
      case 0:
        r = ratio(intersection.pt, this.vertexB, this.vertexC);
        newR = reflect(r, this.ratioA);
        p = this.vertexB.clone().lerp(this.vertexC, newR);
        break;
      case 1:
        r = ratio(intersection.pt, this.vertexC, this.vertexA);
        newR = reflect(r, this.ratioB);
        p = this.vertexC.clone().lerp(this.vertexA, newR);
        break;
      case 2:
        r = ratio(intersection.pt, this.vertexA, this.vertexB);
        newR = reflect(r, this.ratioC);
        p = this.vertexA.clone().lerp(this.vertexB, newR);
        break;
      }
      x = p.x;
    }
    this.orbit = [];
    if (ups.length > 1) {
      const startGeo = new LineSegmentsGeometry();
      startGeo.setPositions([ups[0], ups[1]].flatMap(v => [v.x, v.y, 0]));
      this.orbit.push(new LineSegments2(startGeo, this.startMat));
      if (ups.length > 3) {
        const upGeo = new LineSegmentsGeometry();
        upGeo.setPositions(ups.flatMap(v => [v.x, v.y, 0]).slice(6));
        this.orbit.push(new LineSegments2(upGeo, this.upMat));
      }
    }
    if (downs.length > 1) {
      const downGeo = new LineSegmentsGeometry();
      downGeo.setPositions(downs.flatMap(v => [v.x, v.y, 0]));
      this.orbit.push(new LineSegments2(downGeo, this.downMat));
    }
    if (this.orbit.length > 0) this.scene.add(...this.orbit);
  }
}

function ratio(slider: Vector2, v1: Vector2, v2: Vector2): number {
  const l2 = v1.distanceToSquared(v2);
  const dp = slider.clone().sub(v1).dot(v2.clone().sub(v1));
  return clamp(dp / l2, 0.01, 0.99);
}

function reflect(x: number, r: number): number {
  const scale = x < r ? (1 - r) / r : r / (1 - r);
  return r - scale * (x - r);
}