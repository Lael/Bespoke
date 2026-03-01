import {Component} from "@angular/core";
import {ThreeDemoComponent} from "./three-demo/three-demo.component";
import {Polyhedron} from "../../math/geometry/polyhedron";
import {DoubleSide, MeshBasicMaterial} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

@Component({
  templateUrl: './three-demo/three-demo.component.html',
  standalone: true,
  styleUrl: './three-demo/three-demo.component.sass'
})
export class PolyhedronPickerComponent extends ThreeDemoComponent {

  polyhedron: Polyhedron = Polyhedron.ICOSAHEDRON;
  oc: OrbitControls

  vertexMaterial: MeshBasicMaterial = new MeshBasicMaterial();
  edgeMaterial: MeshBasicMaterial = new MeshBasicMaterial({
    side: DoubleSide,
  });
  faceMaterial: MeshBasicMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0.5,
    side: DoubleSide,
  });

  dirty: boolean = true;

  constructor() {
    super();

    this.registerColor('clear', 0xF0F1EB, 0x000000);
    this.registerColor('vertex', 0x888800, 0xaaaa00);
    this.registerColor('edge', 0x000000, 0xffffff);
    this.registerColor('face', 0x00aaaa, 0x00aaaa);

    this.oc = new OrbitControls(this.camera, this.renderer.domElement);

    this.scene.add(this.polyhedron.drawable(this.vertexMaterial, this.edgeMaterial, this.faceMaterial));
  }

  override frame(_: number): void {
    this.vertexMaterial.color.set(this.getColor('vertex'));
    this.edgeMaterial.color.set(this.getColor('edge'));
    this.faceMaterial.color.set(this.getColor('face'));
    this.renderer.setClearColor(this.getColor('clear'));
    this.renderer.clear();
  }
}