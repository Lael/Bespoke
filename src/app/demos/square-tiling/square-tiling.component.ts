import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {
    ArrowHelper,
    BufferGeometry,
    Color,
    InstancedMesh,
    LineBasicMaterial,
    LineSegments,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    Vector2,
    Vector3
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import tileData from './tiling.json';
import colormap from 'colormap';

interface SquareTiling {
  a: number,
  b: number,
  l: number,
  v: number[][],
}

interface SquareTile {
  k: number,
  x: number,
  y: number,
}

interface TilingSpecifics {
  meshLo: number,
  variant: number,
}

@Component({
  selector: 'square-tiling',
  templateUrl: '../../widgets/three-demo/three-demo.component.html',
  styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
  standalone: true,
  imports: [CommonModule]
})
export class SquareTilingComponent extends ThreeDemoComponent {
  orbitControls: OrbitControls;

  rectangles: InstancedMesh;
  tempColors: Color[];
  bwColors: Color[];
  iColors: Color[];
  grid: LineSegments;

  tilings: (SquareTiling | undefined)[][];
  specifics: (TilingSpecifics | undefined)[][];
  n = 51;
  maxTiles = 1;
  a = 1;
  b = 1;
  // gui: dat.GUI;
  dirty = true;
  selection: [number, number] | undefined = undefined;
  selectionBox: Mesh;
  arrow: ArrowHelper = new ArrowHelper();

  constructor() {
    super();
    this.useOrthographic = true;
    this.updateOrthographicCamera();
    this.tilings = new Array(this.n).fill([]).map(() => new Array(this.n).fill(undefined));
    this.specifics = new Array(this.n).fill([]).map(() => new Array(this.n).fill(undefined));
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableZoom = true;
    this.orbitControls.zoomToCursor = true;
    this.orbitControls.enableRotate = false;
    let totalTiles = 0;
    for (let st of tileData) {
      if (st.a < this.n && st.b < this.n) {
        this.tilings[st.a - 1][st.b - 1] = st;
        this.tilings[st.b - 1][st.a - 1] = st;
        if (this.maxTiles < st.l) {
          this.maxTiles = st.l;
        }
        totalTiles += st.l * ((st.a === st.b) ? 1 : 2);
      }
    }

    // this.gui = new GUI();
    // this.updateGUI();
    let x = 0;
    let y = 0;
    this.tempColors = colormap({
      colormap: 'temperature',
      nshades: this.maxTiles,
      format: 'float',
      alpha: 1
    }).map(c => new Color().setRGB(c[0], c[1], c[2]));
    this.bwColors = colormap({
      colormap: 'greys',
      nshades: this.maxTiles,
      format: 'float',
      alpha: 1
    }).map(c => new Color().setRGB(c[0], c[1], c[2]));
    this.iColors = colormap({
      colormap: 'jet',
      nshades: this.maxTiles,
      format: 'float',
      alpha: 1
    }).map(c => new Color().setRGB(c[0], c[1], c[2]));
    this.rectangles = new InstancedMesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({color: 0xffffff}), totalTiles);

    let si = 0;
    for (let a = 1; a <= this.n; a++) {
      y = 0;
      for (let b = 1; b <= this.n; b++) {
        let t = this.tilings[a - 1][b - 1];
        if (!!t/*  && !(a / b > 2 || b / a > 2) */) {
          this.specifics[a - 1][b - 1] = {
            meshLo: si,
            variant: 0,
          };
          let tiling: SquareTile[] = parseTiling(a, b, t.v[0]);
          let m = Math.min(a, b);
          let greedy = false;
          let splits = false;
          for (let v of t.v) {
            for (let k of v) {
              if (k === m) {
                greedy = true;
              }
              if (tilingSplits(a, b, parseTiling(a, b, v))) splits = true;
            }
            if (greedy || splits) break;
          }
          let boring = greedy || splits;

          let mx = Math.max(a, b);
          let mn = Math.min(a, b);
          let g = gcd(mn, mx);
          let k = mx / mn + 3 * Math.log2(mn / g);
          if (!boring) console.log(`Real: ${t.l}, Kenyon: ${k}`);
          if (t.l > k) console.log('  C too low');

          for (let st of tiling) {
            let scale = st.k - 0.1;
            let sx = x + (a + 1) / 2 + st.x + st.k / 2;
            let sy = y + (b + 1) / 2 + st.y + st.k / 2;
            this.rectangles.setMatrixAt(si, new Matrix4().makeScale(scale, scale, 1).premultiply(new Matrix4().makeTranslation(new Vector3(sx, sy, 0))));
            this.rectangles.setColorAt(si,
              boring ? this.bwColors[st.k - 1] : this.tempColors[st.k - 1]
            );
            si += 1;
          }
        }
        y += b + 0.5;
      }
      x += a + 0.5;
    }
    this.rectangles.instanceMatrix.needsUpdate = true;
    if (this.rectangles.instanceColor) this.rectangles.instanceColor.needsUpdate = true;


    let ls: Vector2[] = [];
    for (let i = 0; i <= x; i++) {
      ls.push(new Vector2(i, 0), new Vector2(i, y));
    }
    for (let i = 0; i <= y; i++) {
      ls.push(new Vector2(0, i), new Vector2(x, i));
    }
    this.grid = new LineSegments(
      new BufferGeometry().setFromPoints(ls),
      new LineBasicMaterial({color: 0x000000, transparent: true}));
    this.orthographicCamera.zoom = Math.sqrt(2) / x;
    this.updateOrthographicCamera();

    this.selectionBox = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({color: 0xff0000}));
  }

  rectangleCenter(a: number, b: number): Vector2 {
    return new Vector2(a * (a + 2) / 2, b * (b + 2) / 2);
  }


  override frame(_: number) {
    this.processKeyboardInput();
    (this.grid.material as LineBasicMaterial).opacity = Math.min(1, this.camera.zoom * 5);

    this.selectionBox.visible = (this.selection != undefined);
    if (!!this.selection) {
      this.selectionBox.scale.set(this.selection[0] + 2, this.selection[1] + 2, 1);
      let p = this.rectangleCenter(this.selection[0], this.selection[1]);
      this.selectionBox.position.set(p.x, p.y, -1);
    }
    // this.grid.visible = this.camera.zoom > 0.025;
    if (!this.dirty) {
      return;
    }
    this.dirty = false;
    this.scene.clear();
    this.scene.add(this.rectangles);
    this.scene.add(this.grid);
    this.scene.add(this.selectionBox);
    // this.scene.add(this.arrow);
  }

  processKeyboardInput() {
    if (this.keyJustPressed('Space')) {
      this.incrementVariant();
    }
  }

  incrementVariant() {
    if (!this.selection) return;
    let [a, b] = this.selection;
    let s = this.specifics[a - 1][b - 1];
    if (!s) return;
    let t = this.tilings[a - 1][b - 1];
    if (!t) return;
    let i = (s.variant + 1) % t.v.length;
    s.variant = i;
    let rc = this.rectangleCenter(a, b);
    let tiling: SquareTile[] = parseTiling(a, b, t.v[i]);
    let boring = (a % b == 0 || b % a == 0);
    for (let si = 0; si < t.l; si++) {
      let st = tiling[si];
      let scale = st.k - 0.1;
      let sx = rc.x - a / 2 + st.x + st.k / 2;
      let sy = rc.y - b / 2 + st.y + st.k / 2;
      this.rectangles.setMatrixAt(si + s.meshLo, new Matrix4().makeScale(scale, scale, 1).premultiply(new Matrix4().makeTranslation(new Vector3(sx, sy, 0))));
      this.rectangles.setColorAt(si + s.meshLo, boring ? this.bwColors[st.k - 1] : this.tempColors[st.k - 1]);
    }
    this.rectangles.instanceMatrix.needsUpdate = true;
    if (this.rectangles.instanceColor) this.rectangles.instanceColor.needsUpdate = true;
  }

  override mousedown(e: MouseEvent) {
    let w = this.mouseToWorld(e);
    // a2 + a - 2x = 0
    // (-1 ± √(1+8x)) / 2
    let a = Math.floor(0.5 * (Math.sqrt(8 * w.x + 1) - 1));
    let b = Math.floor(0.5 * (Math.sqrt(8 * w.y + 1) - 1));
    if (a > 0 && a <= this.n
      && b > 0 && b <= this.n
      && !!this.tilings[a - 1][b - 1]) {
      this.selection = [a, b];
    } else {
      this.selection = undefined;
    }
    this.updateArrow();
  }

  updateArrow() {
    if (this.selection === undefined) {
      this.arrow.visible = false;
      return;
    }
    this.arrow.visible = true;
    let [a, b] = this.selection;
    let rc1 = this.rectangleCenter(a, b);
    let t = this.getTarget(a, b);
    if (t === undefined) {
      this.arrow.visible = false;
      return;
    }
    this.arrow.position.set(rc1.x, rc1.y, 1);
    let rc2 = this.rectangleCenter(t[0], t[1]);
    let d = rc2.clone().sub(rc1);
    this.arrow.setDirection(new Vector3(d.x, d.y, 0));
    this.arrow.setLength(d.length());
  }

  getTarget(a: number, b: number): [number, number] | undefined {
    let st = this.tilings[a - 1][b - 1];
    let sp = this.specifics[a - 1][b - 1];
    if (st === undefined || sp === undefined) return undefined;
    let v = st.v[sp.variant];
    if (v.length === 1) return undefined;
    for (let k of v) {
      if (k === a) {
        return [a, b - k];
      }
      if (k === b) {
        return [a - k, b];
      }
    }
    return undefined;
  }

  mouseToWorld(e: MouseEvent): Vector2 {
    const v = new Vector3(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1,
      0,
    );
    v.unproject(this.camera);
    return new Vector2(v.x, v.y);
  }

  // private updateGUI() {
  //     this.gui.destroy();
  //     this.gui = new GUI();
  //     let tf = this.gui.addFolder('Tiling');
  //     tf.add(this, 'a', 1, this.n, 1).onFinishChange(() => {
  //         this.updateGUI();
  //     });
  //     tf.add(this, 'b', 1, this.n, 1).onFinishChange(() => {
  //         this.updateGUI();
  //     });
  //     tf.open();
  // }
}

function tileContainsCell(t: SquareTile, x: number, y: number): boolean {
  return t.x <= x && t.x + t.k > x && t.y <= y && t.y + t.k > y;
}

function parseTiling(a: number, b: number, v: number[]): SquareTile[] {
  let width = Math.max(a, b);
  let tiles: SquareTile[] = [];
  let x = 0;
  let y = 0;
  for (let k of v) {
    tiles.push({x, y, k});
    x += k;
    let move = true;
    while (move) {
      move = false;
      for (let t of tiles) {
        if (tileContainsCell(t, x, y)) {
          x += t.k;
          move = true;
          break;
        }
      }
      if (x >= width) {
        move = true;
        y += 1;
        x = 0;
      }
    }
  }
  if (a < b) {
    return tiles.map(t => {
      return {
        k: t.k,
        x: t.y, // Transpose
        y: t.x, // Transpose
      };
    });
  } else {
    return tiles;
  }
}

function tilingSplits(a: number, b: number, tiles: SquareTile[]): boolean {
  for (let i = 1; i < a; i++) {
    let splits = true;
    for (let tile of tiles) {
      if (tile.x < i && tile.x + tile.k > i) splits = false;
    }
    if (splits) return true;
  }
  for (let i = 1; i < b; i++) {
    let splits = true;
    for (let tile of tiles) {
      if (tile.y < i && tile.y + tile.k > i) splits = false;
    }
    if (splits) return true;
  }
  return false
}

function gcd(a: number, b: number): number {
  if (b === 0) {
    return a
  }

  return gcd(b, a % b)
}