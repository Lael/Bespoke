import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";
import {PolygonPickerComponent} from "../../widgets/polygon-picker.component";
import {
    BufferGeometry,
    CircleGeometry,
    Line,
    LineBasicMaterial,
    LineSegments,
    Matrix3,
    Mesh,
    MeshBasicMaterial,
    Path,
    Vector2
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {LineSegment} from "../../../math/geometry/line-segment";
import {normalizeAngle} from "../../../math/math-helpers";
import {ArcSegment} from "../../../math/geometry/arc-segment";

@Component({
  selector: 'wavefront',
  templateUrl: 'wavefront.component.html',
  styleUrls: ['../../widgets/three-demo/three-demo.component.sass', 'wavefront.component.sass'],
  standalone: true,
  imports: [CommonModule, PolygonPickerComponent]
})
export class WavefrontComponent extends ThreeDemoComponent {
  orbitControls: OrbitControls;

  vertices: Vector2[] = [];
  polygonDirty: boolean = true;
  t: number = 0;
  unfoldingDirty: boolean = true;

  originDot: Mesh;
  circle: Line;
  waves: Line[] = [];
  polygon: Line | undefined = undefined;
  cones: Cone[] = [];
  unfolding: LineSegments | undefined = undefined;

  constructor() {
    super();
    this.useOrthographic = true;
    this.updateOrthographicCamera();
    this.renderer.setClearColor(0x123456);
    this.orbitControls = new OrbitControls(this.orthographicCamera, this.renderer.domElement);
    this.orbitControls.enableRotate = false;
    this.orbitControls.zoomToCursor = true;

    this.originDot = new Mesh(new CircleGeometry(0.025), new MeshBasicMaterial({color: 0xffff88}));
    let p = new Path();
    p.absarc(0, 0, 1, 0, 2 * Math.PI);
    this.circle = new Line(
      new BufferGeometry().setFromPoints(p.getPoints(360)),
      new LineBasicMaterial({color: 0xffff88})
    );
  }

  frame(dt: number): void {
    this.processKeyboardInput(dt);
    if (this.polygonDirty) {
      if (this.vertices.length > 2) {
        this.polygon = new Line(
          new BufferGeometry().setFromPoints(this.vertices.concat([this.vertices[0]])),
          new LineBasicMaterial({color: 0xffffff})
        );
      }
    }
    if (this.unfoldingDirty) {
      let pts = [];
      let cones = this.unfold();
      const centers = [new Vector2()];
      for (let c of cones) {
        for (let i = 0; i < c.polygon.length; i++) {
          pts.push(c.polygon[i]);
          pts.push(c.polygon[(i + 1) % c.polygon.length]);
        }
        centers.push(new Vector2().applyMatrix3(c.matrix));
      }
      this.unfolding = new LineSegments(
        new BufferGeometry().setFromPoints(pts),
        new LineBasicMaterial({color: 0xffffff}));
      this.waves = [];
      for (let z of centers) {
        const path = new Path();
        path.absarc(z.x, z.y, this.t, 0, 2 * Math.PI);
        this.waves.push(new Line(
          new BufferGeometry().setFromPoints(path.getPoints(360)),
          new LineBasicMaterial({color: 0xffff88})
        ));
      }
    }
    if (this.polygonDirty || this.unfoldingDirty) {
      this.polygonDirty = false;
      this.unfoldingDirty = false;
      this.scene.clear();
      if (!!this.polygon) this.scene.add(this.polygon);
      this.scene.add(this.originDot);
      if (this.waves.length > 0) this.scene.add(...this.waves);
      if (this.unfolding !== undefined) this.scene.add(this.unfolding);
    }
  }

  onNewVertices(vertices: Vector2[]) {
    this.vertices = vertices;
    this.polygonDirty = true;
    this.cones = [];
    this.unfolding = undefined;
  }

  unfold(): Cone[] {
    console.log(this.cones);
    let n = this.vertices.length;
    let cones: Cone[] = [];
    let frontier: Cone[] = [];
    // if (this.cones.length === 0) {
    for (let i = 0; i < n; i++) {
      let v1 = this.vertices[i];
      let v2 = this.vertices[(i + 1) % n];
      if (sideDistance(v1, v2) < this.t) {
        const matrix = reflectionMatrix(v1, v2);
        let c = {
          lo: v1.angle(),
          hi: normalizeAngle(v2.angle(), v1.angle()),
          matrix,
          polygon: reflectPolygon(v1, v2, this.vertices),
        };
        frontier.push(c);
        if (polygonIntersectsCircle(c.polygon, this.t)) cones.push(c)
      }
    }
    // } else {
    //     frontier = this.cones;
    //     for (let c of frontier) {
    //         if (polygonIntersectsCircle(c.polygon, this.t)) {
    //             cones.push(c);
    //         }
    //     }
    // }
    while (frontier.length > 0) {
      let newFrontier = [];
      for (let f of frontier) {
        for (let i = 0; i < n; i++) {
          let v1 = f.polygon[i];
          let v2 = f.polygon[(i + 1) % n];
          if (sideDistance(v1, v2) < this.t && sideVisible(f.lo, f.hi, v1, v2)) {
            const matrix = f.matrix.clone().premultiply(reflectionMatrix(v1, v2));
            let lo = normalizeAngle(Math.max(
              f.lo,
              normalizeAngle(v1.angle(), f.lo - Math.PI),
            ));
            let hi = normalizeAngle(
              Math.min(f.hi, normalizeAngle(v2.angle(), f.hi - Math.PI)),
              lo);
            let c = {
              lo,
              hi,
              matrix,
              polygon: reflectPolygon(v1, v2, f.polygon),
            };
            newFrontier.push(c);
            if (polygonIntersectsCircle(c.polygon, this.t)) {
              cones.push(c);
            }
          }
        }
      }
      frontier = newFrontier;
    }
    return cones;
  }

  private polygonImage(m: Matrix3): Vector2[] {
    return this.vertices.map(v => v.clone().applyMatrix3(m));
  }

  private clipCircle(center: Vector2): ArcSegment[] {
    const segments: ArcSegment[] = [];
    const n = this.vertices.length;
    for (let i = 0; i < n; i++) {
      const v1 = this.vertices[i];
      const v2 = this.vertices[(i + 1) % n];

    }
    return segments;
  }

  private processKeyboardInput(dt: number) {
    let ti = 0;
    if (this.keyHeld('BracketRight')) ti += dt;
    if (this.keyHeld('BracketLeft')) ti -= dt;
    if (this.keyHeld('ShiftLeft')) ti /= 10;
    if (this.keyHeld('AltLeft')) ti /= 100;
    this.t += ti;
    if (ti !== 0) this.unfoldingDirty = true;
    if (this.t < 0) this.t = 0;
    this.circle.scale.set(this.t, this.t, 1);
  }
}

function sideDistance(v1: Vector2, v2: Vector2): number {
  let ls = new LineSegment(v1, v2);
  let proj = ls.line.project(new Vector2());
  if (ls.containsPoint(proj)) return proj.modulus();
  return Math.min(v1.length(), v2.length());
}

function sideDistanceSq(v1: Vector2, v2: Vector2): number {
  let ls = new LineSegment(v1, v2);
  let proj = ls.line.project(new Vector2());
  if (ls.containsPoint(proj)) return proj.modulusSquared();
  return Math.min(v1.lengthSq(), v2.lengthSq());
}

function reflectPolygon(v1: Vector2, v2: Vector2, polygon: Vector2[]): Vector2[] {
  let l = new LineSegment(v1, v2).line;
  let reflected = [];
  for (let v of polygon) {
    reflected.push(
      v.clone().addScaledVector(v.clone().sub(l.project(v)), -2)
    );
  }
  return reflected.reverse();
}

function sideVisible(lo: number, hi: number, v1: Vector2, v2: Vector2): boolean {
  if (v1.cross(v2) <= 0) return false;
  let a1 = normalizeAngle(v1.angle(), lo - Math.PI);
  let a2 = normalizeAngle(v2.angle(), hi - Math.PI);
  if (lo < a1 && a1 < hi) return true;
  if (lo < a2 && a2 < hi) return true;
  return (a1 <= lo && hi <= a2);
}

function polygonIntersectsCircle(vertices: Vector2[], radius: number): boolean {
  const r2 = radius * radius;
  const n = vertices.length;
  let inside = false;
  let outside = false;
  for (let i = 0; i < n; i++) {
    let v1 = vertices[i];
    let v2 = vertices[(i + 1) % n];
    if (sideDistanceSq(v1, v2) < r2) inside = true;
    if (v1.lengthSq() > r2) outside = true;
  }
  return inside && outside;
}

function reflectionMatrix(v1: Vector2, v2: Vector2): Matrix3 {
  let t = new Matrix3().makeTranslation(v1);
  let tBack = new Matrix3().makeTranslation(new Vector2(-v1.x, -v1.y));
  let theta = 2 * v2.clone().sub(v1).angle();
  let c = Math.cos(theta);
  let s = Math.sin(theta);
  let r = new Matrix3(
    c, s, 0,
    s, -c, 0,
    0, 0, 1,
  );
  return t.multiply(r).multiply(tBack);
}

interface Cone {
  lo: number,
  hi: number,
  matrix: Matrix3,
  polygon: Vector2[],
}

// @Component({
//     selector: 'wavefront',
//     templateUrl: '../../widgets/three-demo/three-demo.component.html',
//     styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
//     standalone: true,
//     imports: [CommonModule]
// })
// export class WavefrontComponent extends PolygonPickerComponent {
//     origin: Vector2 = new Vector2();
//     originDot: Mesh | undefined = undefined;
//
//
//     constructor() {
//         super();
//         this.renderer.setClearColor(0x123456);
//     }
//
//     override reset(n: number = 3, skip: number = 0, offset: number = 0.1234) {
//         super.reset(n, skip, offset);
//         console.log('reset');
//         if (this.originDot === undefined) {
//             this.originDot = new Mesh(
//                 new CircleGeometry(0.025),
//                 new MeshBasicMaterial({color: 0xffffaa})
//             );
//             this.originDot.name = 'origin';
//             this.originDot.position.set(this.origin?.x || 0, this.origin?.y || 0, 0);
//         }
//         this.draggables.push(this.originDot);
//         console.log(this.draggables);
//     }
//
//     override dragEnd() {
//         super.dragEnd();
//         if (this.originDot === undefined) {
//             this.originDot = new Mesh(
//                 new CircleGeometry(0.025),
//                 new MeshBasicMaterial({color: 0xffffaa})
//             );
//             this.originDot.name = 'origin';
//             this.originDot.position.x = this.origin.x;
//             this.originDot.position.y = this.origin.y;
//         }
//         this.draggables.push(this.originDot);
//     }
//
//     override drag(event: any) {
//         if (event.object.name === 'origin') {
//             console.log('dragging origin');
//             this.origin.x = event.object.position.x;
//             this.origin.y = event.object.position.y;
//         } else {
//             super.drag(event);
//         }
//         if (this.originDot !== undefined) {
//             this.origin.x = this.originDot.position.x;
//             this.origin.y = this.originDot.position.y;
//         }
//         this.markDirty();
//     }
//
//     override frame(dt: number) {
//         let wasDirty = this.dirty;
//         super.frame(dt);
//         if (wasDirty) {
//             // do wavefront stuff
//             this.computeUnfolding();
//         }
//     }
//
//     override get polygonColor() {
//         return 0xffffff;
//     }
//
//     private computeUnfolding() {
//         let corridors: Cone[] = [];
//     }
// }
//
// interface Cone {
//     lo: number;
//     hi: number;
// }