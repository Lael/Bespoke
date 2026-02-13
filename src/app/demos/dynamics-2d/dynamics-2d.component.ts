import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {Complex} from "../../../math/complex/complex";
import {BufferGeometry, LineBasicMaterial, LineSegments, Points, PointsMaterial} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {AffineGeodesic, AffinePoint} from "../../../math/geometry/geometry";
import {AffineCircle} from "../../../math/geometry/affine-circle";
import {GUI} from "dat.gui";

const REAL_LINE = new AffineGeodesic(
  new AffinePoint(new Complex(1, 0)),
  new AffinePoint(new Complex(-1, 0)),
  true, true,
);

const SINGULARITY_COLOR = 0xff4400;

@Component({
  selector: 'dynamics-2d',
  templateUrl: '../../widgets/three-demo/three-demo.component.html',
  styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
  standalone: true,
  imports: [CommonModule]
})
export class Dynamics2dComponent extends ThreeDemoComponent {
  orbitControls: OrbitControls;
  t = 0.25 * Math.PI;
  start: Complex = new Complex(0, 0);
  iterations = 15;
  preimageIterations = 250;
  dirty = true;
  preimageDirty: boolean = true;
  orbit: Complex[] = [];
  points: Points = new Points();
  preimages: AffineGeodesic[] = [];
  singularities = new LineSegments();
  clear: boolean = true;

  gui: GUI | null = null;

  constructor() {
    super();
    this.renderer.setClearColor(0xffffff)
    this.useOrthographic = true;
    this.updateOrthographicCamera();
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableRotate = false;
    this.orbitControls.zoomToCursor = true;
    this.updatePreimages();
    this.updateSingularities();
    this.updateGUI();
  }

  updateGUI() {
    if (this.isPreview) return;
    if (this.gui) this.gui.destroy();
    this.gui = new GUI();

    this.gui.add(this, 'iterations', 0, 25, 1)
      .name('log2(iters)')
      .onChange(() => {
        this.dirty = true;
      });
    this.gui.add(this, 'preimageIterations', 0, 500, 1)
      .name('Preimages')
      .onChange(() => {
        this.preimageDirty = true;
      });
  }

  processKeyboardInput(dt: number) {
    let dx = 0;
    let dy = 0;
    let dz = 0;
    let speed = 1;
    if (this.keyHeld('KeyW')) dy += 1;
    if (this.keyHeld('KeyS')) dy -= 1;
    if (this.keyHeld('KeyA')) dx -= 1;
    if (this.keyHeld('KeyD')) dx += 1;
    if (this.keyHeld('KeyQ')) dz -= 1;
    if (this.keyHeld('KeyE')) dz += 1;
    if (dz !== 0 || this.keyJustPressed('KeyC')) this.scene.clear();
    if (dx === 0 && dy === 0 && dz == 0) return;
    if (this.keyHeld('ShiftLeft')) speed *= 0.1;
    if (this.keyHeld('AltLeft')) speed *= 0.01;

    if (!(dx === 0 && dy === 0)) {
      this.start = this.start.plus(new Complex(dx, dy).normalize(dt * speed / this.camera.zoom * 0.1));
    }
    this.t += dz * dt * speed;
    if (dz !== 0) {
      this.updatePreimages();
      this.preimageDirty = true;
    }
    this.dirty = true;
  }

  override frame(dt: number) {
    this.processKeyboardInput(dt);

    if (this.dirty || this.preimageDirty) {
      this.scene.clear();
      if (this.dirty) {
        this.dirty = false;
        this.iterate();
        this.points = new Points(
          new BufferGeometry().setFromPoints(this.orbit.map(z => z.toVector2())),
          new PointsMaterial({color: 0x000000})
          // new PointsMaterial({color: new Color().setRGB(randFloat(0, 1), randFloat(0, 1), randFloat(0, 1))})
        );
      }
      this.scene.add(this.points);
      // let c1 = new Mesh(new CircleGeometry(1 + Math.cos(this.t)), new MeshBasicMaterial({color: 0xaaaaaa}));
      // let c2 = new Mesh(new CircleGeometry(1 + Math.cos(this.t)), new MeshBasicMaterial({color: 0xaaaaaa}));
      // c1.position.set(-Math.sin(this.t), 1 + Math.cos(this.t), 0);
      // c2.position.set(Math.sin(this.t), -1 - Math.cos(this.t), 0);
      // this.scene.add(c1, c2);
      if (this.preimageDirty) {
        this.updateSingularities();
        this.preimageDirty = false;
      }
      this.scene.add(this.singularities);
    }
    this.dirty = false;

  }

  updateSingularities() {
    let ls = [];
    let circle = new AffineCircle(new Complex(), 10);
    for (let p of this.preimages) {
      ls.push(...p.endpoints(circle))
    }
    this.singularities = new LineSegments(new BufferGeometry().setFromPoints(ls), new LineBasicMaterial({color: SINGULARITY_COLOR}));
  }

  iterate() {
    this.orbit = [];
    let z = this.start;
    for (let i = 0; i < Math.pow(2, this.iterations); i++) {
      this.orbit.push(z);
      z = this.transformation(z);
    }
  }

  updatePreimages() {
    this.preimages = [REAL_LINE];
    let current = [REAL_LINE];
    for (let i = 0; i < this.preimageIterations; i++) {
      let frontier = [];
      for (let p of current) {
        if (p.p1.distance(p.p2) < 0.0001 / this.orthographicCamera.zoom && !(p.infForward || p.infReverse)) {
          continue;
        }
        frontier.push(...this.preimage(p));
      }
      current = frontier;
      this.preimages.push(...current);
    }
    console.log(this.preimages.length);
  }


  transformation(z: Complex): Complex {
    // f(z) = exp(it)(z+2sin(t)) if Im(z)>0 and f(z) = exp(it)(z-2sin(t)) if Im(z)<0
    if (z.y >= 0) {
      return new Complex(0, this.t).exp().times(z.plus(new Complex(2 * Math.sin(this.t))));
    } else {
      return new Complex(0, this.t).exp().times(z.minus(new Complex(2 * Math.sin(this.t))));
    }
  }

  inverse(z: Complex): Complex {
    let unrotated = z.times(new Complex(0, -this.t).exp());
    if (unrotated.y >= 0) return unrotated.minus(new Complex(2 * Math.sin(this.t)));
    else return unrotated.plus(new Complex(2 * Math.sin(this.t)));
  }

  preimage(g: AffineGeodesic): AffineGeodesic[] {
    let unrotated = new AffineGeodesic(g.p1.rotate(-this.t), g.p2.rotate(-this.t), g.infForward, g.infReverse);
    let pieces = unrotated.split([REAL_LINE]);
    return pieces.map(p => {
      let dx = p.mid().resolve().y < 0 ? 2 * Math.sin(this.t) : -2 * Math.sin(this.t);
      return p.translate(new Complex(dx, 0));
    });
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    if (this.gui) this.gui.destroy();
  }
}