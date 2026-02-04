import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";
import {BufferGeometry, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, Shape, SphereGeometry, Vector2} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {DragControls} from "three/examples/jsm/controls/DragControls.js";

@Component({
  selector: 'summer',
  templateUrl: '../../widgets/three-demo/three-demo.component.html',
  styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
  standalone: true,
  imports: [CommonModule]
})
export class SummerComponent extends ThreeDemoComponent {
  orbitControls: OrbitControls;
  dragControls: DragControls;

  draggables: Mesh[] = [];
  circles: Line[] = [];
  dirty: boolean = true;
  draggingIndex: number = -1;

  private dotMat = new MeshBasicMaterial();
  private dotGeo = new SphereGeometry(0.01);
  private circleMat = new LineBasicMaterial();

  axis: Line = new Line(
    new BufferGeometry().setFromPoints([new Vector2(-100, 0), new Vector2(100, 0)]),
    this.circleMat);

  private oldZoom: number;

  constructor() {
    super();
    this.useOrthographic = true;
    this.updateOrthographicCamera();
    this.oldZoom = this.camera.zoom;
    this.orbitControls = new OrbitControls(this.orthographicCamera, this.renderer.domElement);
    this.orbitControls.enableRotate = false;
    this.orbitControls.zoomToCursor = true;

    this.colorScheme.register('handle', 0xff0000, 0xff0000);
    this.colorScheme.register('vertex', 0x990044, 0x990044);
    this.colorScheme.register('circle', 0x000000, 0xffffff);

    this.draggables.push(this.dot(new Vector2(2, 2)));
    this.draggables.push(this.dot(new Vector2(-1, 1)));

    this.dragControls = new DragControls(this.draggables, this.camera, this.renderer.domElement);
    this.dragControls.addEventListener('dragstart', (e) => {
      this.draggingIndex = e.object == this.draggables[0] ? 0 : 1;
      this.dirty = true;
    });
    this.dragControls.addEventListener('drag', () => {
      this.dirty = true;
    });
    this.dragControls.addEventListener('dragend', () => {
      this.draggingIndex = -1;
      this.dirty = true;
    });

    this.scene.add(...this.draggables);
    this.scene.add(this.axis);
  }

  private dot(v: Vector2): Mesh {
    const d = new Mesh(this.dotGeo, this.dotMat);
    d.translateX(v.x);
    d.translateY(v.y);
    return d;
  }

  private circle(v: Vector2): Line {
    const shape = new Shape().absarc(v.x, v.y, v.y, 0, 2 * Math.PI);
    return new Line(new BufferGeometry().setFromPoints(shape.getPoints(180)), this.circleMat);
  }

  // Ford: tangent at p/q, curvature 2q^2

  override frame(_: number) {
    this.renderer.setClearColor(this.getColor('clear'));
    this.dotMat.color = this.getColor('vertex');
    this.circleMat.color = this.getColor('circle');

    const f = this.oldZoom / this.camera.zoom;
    this.dotGeo.scale(f, f, 1)
    this.oldZoom = this.camera.zoom;

    if (this.dirty) {
      if (this.circles.length > 0) this.scene.remove(...this.circles);
      const vertices = this.draggables.map(d => new Vector2(d.position.x, d.position.y));
      this.circles = [];
      for (let v of vertices) this.circles.push(this.circle(v));
      this.scene.add(...this.circles);
      this.dirty = false;
    }
  }
}