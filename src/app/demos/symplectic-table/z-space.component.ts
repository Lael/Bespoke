import {Component, Input, OnChanges, SimpleChanges} from "@angular/core";
import {BufferGeometry, Color, Group, Line, LineBasicMaterial, Points, PointsMaterial, Vector2, Vector3} from "three";
import {CommonModule} from "@angular/common";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";


const IMAGE_EDGE_WIDTH = 1;
const FINAL_EDGE_WIDTH = 2;
const ITERATE_COLOR = 0x880088;
const FINAL_COLOR = 0x008800;

@Component({
  selector: 'z-space',
  templateUrl: '../../widgets/three-demo/three-demo.component.html',
  styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
  standalone: true,
  imports: [CommonModule]
})
export class ZSpaceComponent extends ThreeDemoComponent implements OnChanges {

  @Input() iterates?: Vector2[][];
  orbitControls: OrbitControls;
  dirty = true;

  constructor() {
    super();
    this.useOrthographic = true;
    this.updateOrthographicCamera();
    this.renderer.setClearColor(new Color(0));
    this.orbitControls = new OrbitControls(this.orthographicCamera, this.renderer.domElement);
    this.orbitControls.enableRotate = false;
    this.orbitControls.zoomToCursor = true;
  }

  override frame() {
    if (!this.dirty) return;
    this.dirty = false;
    this.scene.clear();
    // console.clear()
    if (this.iterates === undefined || this.iterates.length == 0) return;
    let n = this.iterates[0].length;
    if (n !== 5) return;
    const z125: Vector3[] = [];
    const z345: Vector3[] = [];
    for (let i = 0; i < this.iterates.length - 1; i += 1) {
      let iterate = this.iterates[i];
      let next = this.iterates[i + 1];
      let a = area(iterate);
      const zs = [0, 0, 0, 0, 0];
      for (let j = 0; j < 5; j++) {
        // side-diagonal
        // let s = iterate[(j + 3) % 5].clone().sub(iterate[(j + 2) % 5]);
        // let d = iterate[(j + 4) % 5].clone().sub(iterate[(j + 1) % 5]);
        // zs[j] = s.cross(d) / a;
        // ear area
        // let s1 = iterate[(j) % 5].clone().sub(iterate[(j + 4) % 5]);
        // let s2 = iterate[(j + 1) % 5].clone().sub(iterate[(j) % 5]);
        // zs[j] = s1.cross(s2) / (2 * a);
        // ear area ratio
        // let s1 = iterate[(j) % 5].clone().sub(iterate[(j + 4) % 5]);
        // let s2 = iterate[(j + 1) % 5].clone().sub(iterate[(j) % 5]);
        // let s3 = iterate[(j + 2) % 5].clone().sub(iterate[(j + 1) % 5]);
        // zs[j] = Math.log(s2.cross(s3) / s1.cross(s2));
        // let v = iterate[j];
        // let i1 = next[j];
        // let i2 = i % 2 == 0 ? next[(j + n - 1) % n] : next[(j + 1) % n];
        // let mid = i1.clone().add(i2).multiplyScalar(0.5);
        // let dm = mid.clone().sub(v);
        // let side = mid.clone().sub(i1);
        // zs[j] = dm.lengthSq() / side.lengthSq();
        // pentagram

      }
      let ss = 0;
      zs.map(z => {
        ss += z * z;
        return z * z;
      });

      // let phi = (1 + Math.sqrt(5)) / 2;
      z125.push(new Vector3(zs[0], zs[1], 0));
      z345.push(new Vector3(zs[2], zs[3], 0));
      console.log(zs, ss);
    }

    let g12 = new Group();
    // g12.add(new Mesh(new PlaneGeometry(4, 4), new MeshBasicMaterial({color: 0x444444})));
    g12.add(new Line(new BufferGeometry().setFromPoints(z125), new LineBasicMaterial({color: 0xffffff})));
    g12.add(new Points(new BufferGeometry().setFromPoints(z125), new PointsMaterial({size: 2, color: 0xffffff})));
    // g12.translateY(2.5);
    this.scene.add(g12);

    // let g34 = new Group();
    // // g34.add(new Mesh(new PlaneGeometry(4, 4), new MeshBasicMaterial({color: 0x444444})));
    // g34.add(new Line(new BufferGeometry().setFromPoints(z345), new LineBasicMaterial({color: 0xffffff})));
    // g34.add(new Points(new BufferGeometry().setFromPoints(z345), new PointsMaterial({size: 2, color: 0xffffff})));
    // g34.translateY(-2.5);
    // this.scene.add(g34);

  }

  ngOnChanges(changes: SimpleChanges): void {
    this.dirty = true;
  }
}

function area(vertices: Vector2[]) {
  let n = vertices.length;
  let a = 0;
  for (let i = 0; i < n; i++) {
    a += vertices[i].cross(vertices[(i + 1) % n]);
  }
  return a / 2;
}