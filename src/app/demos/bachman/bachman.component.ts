import {AfterViewInit, Component, OnDestroy} from "@angular/core";
import {PolygonPickerComponent, PolygonRestriction} from "../../widgets/polygon-picker.component";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Points,
  PointsMaterial,
  SRGBColorSpace,
  Vector2
} from "three";
import {CommonModule} from "@angular/common";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial.js";
import {GUI} from "dat.gui";
import {LineSegment} from "../../../math/geometry/line-segment";
import {Complex} from "../../../math/complex/complex";
import {EuclideanPolygon} from "../../../math/geometry/euclidean-polygon";
import {randInt} from "three/src/math/MathUtils.js";

const IMAGE_EDGE_WIDTH: number = 1;
const FILL_DEPTH: number = 50;
const FILL_RESOLUTION: number = 500;

@Component({
  selector: 'bachman',
  templateUrl: '../../widgets/three-demo/three-demo.component.html',
  styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
  standalone: true,
  imports: [CommonModule]
})
export class BachmanComponent extends PolygonPickerComponent implements AfterViewInit, OnDestroy {

  n = 5;
  iterations = 1;
  vertexOnly: boolean = false;
  convex: boolean = true;
  connectEvery: number = 0;
  start: Vector2 = new Vector2(0.01, 0.02);
  factor: number = 2;
  // factor: Complex = new Complex(1 + 1 / Math.cos(Math.PI / 5), 0);
  orbit: Vector2[] = [this.start.clone()];
  orbitDirty = false;
  orbitPointsMaterial = new PointsMaterial();
  orbitLineMaterial = new LineBasicMaterial();

  points: Points = new Points();
  lines: LineSegments | null = null;

  edgeMat: LineMaterial;

  gui: GUI;

  filling: boolean = false;
  fillJobs: Vector2[] = [];
  fillResults: [Vector2, number][] = [];
  fillPoints: Points | null = null;


  constructor() {
    super();
    this.scene.add(this.points);

    this.registerColor('clear', 0xffffff, 0x0a2933);
    this.registerColor('orbit', 0x880088, 0xff88ff);

    this.restriction = this.convex ? PolygonRestriction.CONVEX : PolygonRestriction.NONE;
    this.useOrthographic = true;
    this.reset(this.n, 0, 0);
    this.gui = new GUI();
    this.updateGUI();

    this.edgeMat = new LineMaterial({
      color: this.getColor('edge'),
      linewidth: IMAGE_EDGE_WIDTH,
      resolution: this.resolution
    });
  }

  updateGUI() {
    this.gui.destroy();
    this.gui = new GUI();
    this.gui.add(this, 'n').min(2).max(24).step(1).onFinishChange(() => {
      this.reset(this.n, 0, 0);
      this.markDirty();
      this.updateGUI();
    })
    this.gui.add(this, 'iterations', 0, 20, 1)
      .name('log2(iters)').onFinishChange(() => {
      this.markDirty();
    });
    this.gui.add(this, 'factor', 1, 4, 0.01)
      .name('Factor').onChange(() => {
      this.markDirty();
    });
    this.gui.add(this, 'convex').name('Convex').onFinishChange(() => {
      this.restriction = this.convex ? PolygonRestriction.CONVEX : PolygonRestriction.NONE;
      this.markDirty();
    });
    this.gui.add(this, 'vertexOnly').name('Vertex Only').onFinishChange(() => {
      this.markDirty();
    });
    this.gui.add(this, 'connectEvery', 0, 5, 1)
      .name('Connect every').onFinishChange(() => {
      this.markDirty();
    });
    this.gui.open();
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.gui.destroy();
  }

  override frame(dt: number) {
    this.orbitPointsMaterial.color.set(this.getColor('orbit'));
    this.orbitLineMaterial.color.set(this.getColor('orbit'));
    this.orbitDirty = this.orbitDirty || this.dirty;
    this.mat.color.set(this.getColor('handle'));
    this.edgeMat.resolution.set(this.resolution.x, this.resolution.y);
    super.frame(dt);
    this.processKeyboardInput(dt);

    const start = Date.now();

    if (this.orbitDirty) {
      this.iterate();
      this.scene.remove(this.points);
      if (this.lines !== null) this.scene.remove(this.lines);
      if (this.fillPoints !== null) this.scene.remove(this.fillPoints);
      this.points = new Points(new BufferGeometry().setFromPoints(this.orbit), this.orbitPointsMaterial);
      if (this.connectEvery > 0) {
        const ls = [];
        for (let i = 0; i < this.orbit.length - this.connectEvery; i++) {
          ls.push(this.orbit[i], this.orbit[i + this.connectEvery]);
        }
        this.lines = new LineSegments(new BufferGeometry().setFromPoints(ls), this.orbitLineMaterial);
      } else {
        this.lines = null;
      }
      if (this.lines !== null) this.scene.add(this.lines);
      this.scene.add(this.points);
      this.orbitDirty = false;
      if (this.filling) this.startFilling();
    }

    if (this.filling && this.fillJobs.length > 0) {
      do {
        const job = this.fillJobs.pop();
        if (!job) break;
        this.fillResults.push([job, this.executeFillJob(job)]);
      } while (Date.now() - start < 50);
      if (randInt(0, 20) !== 0 && this.fillJobs.length > 0) return;
      if (this.fillPoints !== null) this.scene.remove(this.fillPoints);
      const geometry = new BufferGeometry();
      const positions = [];
      const colors = [];
      const color = new Color();
      for (let [pt, l] of this.fillResults) {
        positions.push(pt.x, pt.y, 0);
        color.setRGB(1 - l, 1 - l, 1 - l, SRGBColorSpace);
        colors.push(color.r, color.g, color.b);
      }
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
      geometry.computeBoundingSphere();
      const material = new PointsMaterial({vertexColors: true});

      this.fillPoints = new Points(geometry, material);
      this.scene.add(this.fillPoints);
    }
  }

  executeFillJob(job: Vector2): number {
    let i = 0;
    let z = job.clone();
    for (; i < FILL_DEPTH; i++) {
      if (z.length() > 10) break;
      z = this.step(z);
    }
    return i / FILL_DEPTH;
  }

  stopFilling() {
    console.log('stop');
    this.filling = false;
    this.fillJobs = [];
    this.fillResults = [];
    if (this.fillPoints) this.scene.remove(this.fillPoints);
    this.fillPoints = null;
  }

  startFilling() {
    console.log('start');
    this.filling = true;
    this.fillJobs = [];
    this.fillResults = [];
    this.fillPoints = null;
    const vertices = this.vertices;
    const p = new EuclideanPolygon(vertices);
    const ll = vertices[0].clone();
    const ur = vertices[0].clone();
    for (let v of vertices) {
      ll.x = Math.min(ll.x, v.x);
      ll.y = Math.min(ll.y, v.y);
      ur.x = Math.max(ur.x, v.x);
      ur.y = Math.max(ur.y, v.y);
    }
    const w = Math.ceil((ur.x - ll.x) * FILL_RESOLUTION);
    const h = Math.ceil((ur.y - ll.y) * FILL_RESOLUTION);
    for (let i = 0; i <= w; i++) {
      for (let j = 0; j <= h; j++) {
        const job = new Vector2(ll.x + i / FILL_RESOLUTION, ll.y + j / FILL_RESOLUTION);
        if (p.contains(job)) this.fillJobs.push(job);
      }
    }
    shuffle(this.fillJobs);
  }

  override processKeyboardInput(dt: number) {
    if (this.keyJustPressed('Escape')) this.stopFilling();
    else if (this.keyJustPressed('KeyF')) this.startFilling();

    const pointDiff = new Vector2();
    if (this.keysPressed.get('ArrowLeft')) pointDiff.x -= 1;
    if (this.keysPressed.get('ArrowRight')) pointDiff.x += 1;
    if (this.keysPressed.get('ArrowUp')) pointDiff.y += 1;
    if (this.keysPressed.get('ArrowDown')) pointDiff.y -= 1;
    if (pointDiff.length() === 0) return;
    pointDiff.normalize();
    if (this.keysPressed.get('ShiftLeft')) pointDiff.multiplyScalar(0.1);
    if (this.keysPressed.get('AltLeft')) pointDiff.multiplyScalar(0.01);
    this.start.add(pointDiff.multiplyScalar(0.5 * dt / this.camera.zoom));
    this.orbitDirty = true;
  }

  iterate() {
    this.orbitDirty = true;
    let z = this.start.clone();
    this.orbit = [z];
    for (let i = 0; i < Math.pow(2, this.iterations); i++) {
      z = this.step(z);
      this.orbit.push(z);
    }
    console.log(this.orbit);
  }

  step(z: Vector2): Vector2 {
    const cp = this.vertexOnly ? closestVertex(z, this.vertices) : closestOnPolygon(z, this.vertices);
    const diff = Complex.fromVector2(z).minus(cp);
    return cp.plus(diff.times(new Complex(this.factor, 1))).toVector2();
  }
}

function closestVertex(p: Vector2, vertices: Vector2[]): Complex {
  if (vertices.length === 0) throw Error('no vertices');
  let m = Number.POSITIVE_INFINITY;
  let best: Vector2 = p.clone();
  for (let v of vertices) {
    let d = v.distanceTo(p);
    if (d < m) {
      m = d;
      best = v.clone();
    }
  }
  return Complex.fromVector2(best);
}

function closestOnPolygon(p: Vector2, vertices: Vector2[]): Complex {
  const n = vertices.length;
  let m = Number.POSITIVE_INFINITY;
  let best: Vector2 = p.clone();
  for (let i = 0; i < n; i++) {
    const ls = new LineSegment(vertices[i], vertices[(i + 1) % n]);
    const cp = closestOnSegment(p, ls);
    const d = cp.distanceTo(p);
    if (d < m) {
      m = d;
      best = cp;
    }
  }
  return Complex.fromVector2(best);
}

function closestOnSegment(p: Vector2, ls: LineSegment): Vector2 {
  let proj = ls.line.project(p).toVector2();
  if (ls.containsPoint(proj)) return proj;
  return (proj.distanceToSquared(ls.start) < proj.distanceToSquared(ls.end) ? ls.start : ls.end).toVector2();
}

function shuffle(array: any[]) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}