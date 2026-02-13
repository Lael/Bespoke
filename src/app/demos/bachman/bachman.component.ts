// import {AfterViewInit, Component, OnDestroy} from "@angular/core";
// import {PolygonPickerComponent, PolygonRestriction} from "../../widgets/polygon-picker.component";
// import {
//   BufferGeometry,
//   Color,
//   Float32BufferAttribute,
//   LineBasicMaterial,
//   LineSegments,
//   Mesh,
//   PlaneGeometry,
//   Points,
//   PointsMaterial,
//   ShaderMaterial,
//   Vector2,
//   Vector3,
// } from "three";
// import {CommonModule} from "@angular/common";
// import {LineMaterial} from "three/examples/jsm/lines/LineMaterial.js";
// import {GUI} from "dat.gui";
// import {LineSegment} from "../../../math/geometry/line-segment";
//
// const IMAGE_EDGE_WIDTH: number = 1;
// const FILL_DEPTH: number = 50;
// const FILL_RESOLUTION: number = 500;
//
// @Component({
//   selector: 'bachman',
//   templateUrl: '../../widgets/three-demo/three-demo.component.html',
//   styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
//   standalone: true,
//   imports: [CommonModule]
// })
// export class BachmanComponent extends PolygonPickerComponent implements AfterViewInit, OnDestroy {
//   n = 3;
//   fractalSteps: number = 20;
//
//   iterations = 12;
//   convex: boolean = true;
//   connectEvery: number = 0;
//   start: Vector3 = new Vector3(0.01, 0.02, 0);
//   lambda: number = 1 + 1 / Math.cos(Math.PI / 3);
//
//
//   orbit: Vector3[] = [this.start.clone()];
//   orbitDirty = false;
//   orbitPointsMaterial = new PointsMaterial({vertexColors: true});
//   orbitLineMaterial = new LineBasicMaterial();
//
//   edgeMat: LineMaterial;
//   billboard: Mesh;
//
//   gui: GUI;
//
//
//   vertexShader = '';
//   fragmentShader = '';
//
//
//   constructor() {
//     super();
//     // this.scene.add(this.points);
//
//     this.billboard = new Mesh(new PlaneGeometry(2, 2, 1, 1), new ShaderMaterial({
//       uniforms: {},
//       vertexShader: document.getElementById('vertexShader').textContent || "",
//     }));
//
//     this.registerColor('clear', 0xffffff, 0x0a2933);
//     this.registerColor('orbit', 0x880088, 0xff88ff);
//
//     this.restriction = this.convex ? PolygonRestriction.CONVEX : PolygonRestriction.NONE;
//     this.useOrthographic = true;
//     this.reset(this.n, 0, 0);
//     this.gui = new GUI();
//     this.updateGUI();
//
//     this.edgeMat = new LineMaterial({
//       color: this.getColor('edge'),
//       linewidth: IMAGE_EDGE_WIDTH,
//       resolution: this.resolution
//     });
//   }
//
//   updateGUI() {
//     this.gui.destroy();
//     this.gui = new GUI();
//     this.gui.add(this, 'n').min(2).max(24).step(1).onFinishChange(() => {
//       this.reset(this.n, 0, 0);
//       this.markDirty();
//       this.updateGUI();
//     })
//     this.gui.add(this, 'iterations', 0, 20, 1)
//       .name('log2(iters)').onFinishChange(() => {
//       this.markDirty();
//     });
//     this.gui.add(this, 'factor', -4, 4, 0.01)
//       .name('Factor').onChange(() => {
//       this.markDirty();
//     });
//     this.gui.add(this, 'convex').name('Convex').onFinishChange(() => {
//       this.restriction = this.convex ? PolygonRestriction.CONVEX : PolygonRestriction.NONE;
//       this.markDirty();
//     });
//     // this.gui.add(this, 'vertexOnly').name('Vertex Only').onFinishChange(() => {
//     //   this.markDirty();
//     // });
//     this.gui.add(this, 'connectEvery', 0, 5, 1)
//       .name('Connect every').onFinishChange(() => {
//       this.markDirty();
//     });
//     this.gui.open();
//   }
//
//   override ngOnDestroy() {
//     super.ngOnDestroy();
//     this.gui.destroy();
//   }
//
//   override frame(dt: number) {
//     // this.orbitPointsMaterial.color.set(this.getColor('orbit'));
//     this.orbitLineMaterial.color.set(this.getColor('orbit'));
//     this.orbitDirty = this.orbitDirty || this.dirty;
//     this.mat.color.set(this.getColor('handle'));
//     this.edgeMat.resolution = this.resolution;
//     super.frame(dt);
//     this.processKeyboardInput(dt);
//
//     const start = Date.now();
//
//     if (this.orbitDirty) {
//       this.iterate();
//       this.scene.remove(this.points);
//       if (this.lines !== null) this.scene.remove(this.lines);
//       // if (this.fillPoints !== null) this.scene.remove(this.fillPoints);
//       const geo = new BufferGeometry();
//       const positions = this.orbit.flatMap(v => [v.x, v.y, v.z]);
//       const colors = this.orbit.flatMap(v => {
//         // if (v.z !== this.n) return [1, 1, 1];
//         const color = new Color().setHSL((v.z - 0.15) / this.n, 0.75, 0.5);
//         return [color.r, color.g, color.b];
//       })
//       geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
//       geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
//       this.points = new Points(geo, this.orbitPointsMaterial);
//       if (this.connectEvery > 0) {
//         const ls = [];
//         for (let i = 0; i < this.orbit.length - this.connectEvery; i++) {
//           ls.push(this.orbit[i], this.orbit[i + this.connectEvery]);
//         }
//         this.lines = new LineSegments(new BufferGeometry().setFromPoints(ls), this.orbitLineMaterial);
//       } else {
//         this.lines = null;
//       }
//       if (this.lines !== null) this.scene.add(this.lines);
//       this.scene.add(this.points);
//       this.orbitDirty = false;
//       // if (this.filling) this.startFilling();
//     }
//
//     // if (this.filling && this.fillJobs.length > 0) {
//     //   do {
//     //     const job = this.fillJobs.pop();
//     //     if (!job) break;
//     //     this.fillResults.push([job, this.executeFillJob(job)]);
//     //   } while (Date.now() - start < 50);
//     //   if (randInt(0, 20) !== 0 && this.fillJobs.length > 0) return;
//     //   if (this.fillPoints !== null) this.scene.remove(this.fillPoints);
//     //   const geometry = new BufferGeometry();
//     //   const positions = [];
//     //   const colors = [];
//     //   const color = new Color();
//     //   for (let [pt, l] of this.fillResults) {
//     //     positions.push(pt.x, pt.y, 0);
//     //     color.setRGB(1 - l, 1 - l, 1 - l, SRGBColorSpace);
//     //     colors.push(color.r, color.g, color.b);
//     //   }
//     //   geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
//     //   geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
//     //   geometry.computeBoundingSphere();
//     //   const material = new PointsMaterial({vertexColors: true});
//     //
//     //   this.fillPoints = new Points(geometry, material);
//     //   this.scene.add(this.fillPoints);
//     // }
//   }
//
//   // executeFillJob(job: Vector2): number {
//   //   let i = 0;
//   //   let z = job.clone();
//   //   for (; i < FILL_DEPTH; i++) {
//   //     if (z.length() > 10) break;
//   //     const z3 = this.step(new Vector3(z.x, z.y, 0));
//   //     z = new Vector2(z3.x, z3.y);
//   //   }
//   //   return i / FILL_DEPTH;
//   // }
//
//   // stopFilling() {
//   //   console.log('stop');
//   //   this.filling = false;
//   //   this.fillJobs = [];
//   //   this.fillResults = [];
//   //   if (this.fillPoints) this.scene.remove(this.fillPoints);
//   //   this.fillPoints = null;
//   // }
//   //
//   // startFilling() {
//   //   console.log('start');
//   //   this.filling = true;
//   //   this.fillJobs = [];
//   //   this.fillResults = [];
//   //   this.fillPoints = null;
//   //   const vertices = this.vertices;
//   //   const p = new EuclideanPolygon(vertices);
//   //   const ll = vertices[0].clone();
//   //   const ur = vertices[0].clone();
//   //   for (let v of vertices) {
//   //     ll.x = Math.min(ll.x, v.x);
//   //     ll.y = Math.min(ll.y, v.y);
//   //     ur.x = Math.max(ur.x, v.x);
//   //     ur.y = Math.max(ur.y, v.y);
//   //   }
//   //   const w = Math.ceil((ur.x - ll.x) * FILL_RESOLUTION);
//   //   const h = Math.ceil((ur.y - ll.y) * FILL_RESOLUTION);
//   //   for (let i = 0; i <= w; i++) {
//   //     for (let j = 0; j <= h; j++) {
//   //       const job = new Vector2(ll.x + i / FILL_RESOLUTION, ll.y + j / FILL_RESOLUTION);
//   //       if (p.contains(job)) this.fillJobs.push(job);
//   //     }
//   //   }
//   //   shuffle(this.fillJobs);
//   // }
//
//   override processKeyboardInput(dt: number) {
//     // if (this.keyJustPressed('Escape')) this.stopFilling();
//     // else if (this.keyJustPressed('KeyF')) this.startFilling();
//
//     const pointDiff = new Vector3();
//     if (this.keysPressed.get('ArrowLeft')) pointDiff.x -= 1;
//     if (this.keysPressed.get('ArrowRight')) pointDiff.x += 1;
//     if (this.keysPressed.get('ArrowUp')) pointDiff.y += 1;
//     if (this.keysPressed.get('ArrowDown')) pointDiff.y -= 1;
//     if (pointDiff.length() === 0) return;
//     pointDiff.normalize();
//     if (this.keysPressed.get('ShiftLeft')) pointDiff.multiplyScalar(0.1);
//     if (this.keysPressed.get('AltLeft')) pointDiff.multiplyScalar(0.01);
//     this.start.add(pointDiff.multiplyScalar(0.5 * dt / this.camera.zoom));
//     this.orbitDirty = true;
//   }
//
//   iterate() {
//     this.orbitDirty = true;
//     let z = new Vector3(this.start.x, this.start.y, 0);
//     this.orbit = [z];
//     for (let i = 0; i < Math.pow(2, this.iterations); i++) {
//       z = this.step(z);
//       this.orbit.push(z);
//     }
//     // console.log(this.orbit);
//   }
//
//   step(z: Vector3): Vector3 {
//     // const cp = this.vertexOnly ? closestVertex(z, this.vertices) : closestOnPolygon(z, this.vertices);
//     const cp = closestOnPolygon(z, this.vertices);
//     const index = cp.z;
//     const diff = z.clone().sub(cp);
//     const p2 = new Vector2(cp.x, cp.y).addScaledVector(new Vector2(diff.x, diff.y), this.factor);
//     return new Vector3(p2.x, p2.y, index);
//   }
// }
//
// function closestVertex(p: Vector3, vertices: Vector2[]): Vector3 {
//   if (vertices.length === 0) throw Error('no vertices');
//   let m = Number.POSITIVE_INFINITY;
//   let best: Vector3 = p.clone();
//   for (let i = 1; i <= vertices.length; i++) {
//     const v = vertices[i - 1];
//     let d = v.distanceTo(p);
//     if (d < m) {
//       m = d;
//       best = new Vector3(v.x, v.y, i);
//     }
//   }
//   return best;
// }
//
// function closestOnPolygon(p: Vector3, vertices: Vector2[]): Vector3 {
//   const n = vertices.length;
//   let m = Number.POSITIVE_INFINITY;
//   let best: Vector3 = p.clone();
//   const p2 = new Vector2(p.x, p.y);
//   for (let i = 0; i < n; i++) {
//     const ls = new LineSegment(vertices[i], vertices[(i + 1) % n]);
//     const cp = closestOnSegment(p2, ls);
//     const d = cp.distanceTo(p);
//     if (d < m) {
//       m = d;
//       best = new Vector3(cp.x, cp.y, i + 1);
//     }
//   }
//   return best;
// }
//
// function closestOnSegment(p: Vector2, ls: LineSegment): Vector2 {
//   let proj = ls.line.project(p).toVector2();
//   if (ls.containsPoint(proj)) return proj;
//   return (proj.distanceToSquared(ls.start) < proj.distanceToSquared(ls.end) ? ls.start : ls.end).toVector2();
// }