import {Component, OnDestroy} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {CircleGeometry, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, ShaderMaterial, Vector2} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {DragControls} from "three/examples/jsm/controls/DragControls.js";
import {Complex} from "../../../math/complex/complex";
import {Line2} from "three/examples/jsm/lines/Line2.js";
import {LineGeometry} from "three/examples/jsm/lines/LineGeometry.js";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial.js";
import {Pane} from "tweakpane";
import {ColorMode} from "../color-scheme";

const MAX_VERTICES: number = 12;

const VERTEX_SHADER = "varying vec3 vPosition;// what we pass to fragment\n" +
  "\n" +
  "void main() {\n" +
  "    vPosition = position;// position is the built-in attribute (local/object space)\n" +
  "    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n" +
  "}";

const FRAGMENT_SHADER = "varying vec3 vPosition;\n" +
  "\n" +
  "#define MAX_VERTICES 12\n" +
  "#define FAR_AWAY 100.0\n" +
  "\n" +
  "uniform int uVertexCount;\n" +
  "uniform vec2 uVertices[MAX_VERTICES];\n" +
  "uniform float uLambda;\n" +
  "uniform int uIterations;\n" +
  "uniform bool uDark;\n" +
  "\n" +
  "vec2 closestPoint(vec2 p, vec2 v1, vec2 v2) {\n" +
  "    vec2 d = v2 - v1;\n" +
  "    float denom = dot(d, d);\n" +
  "    if (denom <= 0.0) return v1;\n" +
  "\n" +
  "    float t = dot(p - v1, d) / denom;\n" +
  "    t = clamp(t, 0.0, 1.0);\n" +
  "    return v1 + t * d;\n" +
  "}\n" +
  "\n" +
  "vec2 furthestPoint(vec2 p) {\n" +
  "    float bestD = 0.0;\n" +
  "    vec2 bestP = p;\n" +
  "    for (int i = 0; i < uVertexCount; i++) {\n" +
  "        float d = length(p - uVertices[i]);\n" +
  "        if (d > bestD) {\n" +
  "            bestD = d;\n" +
  "            bestP = uVertices[i];\n" +
  "        }\n" +
  "    }\n" +
  "    return bestP;\n" +
  "}\n" +
  "\n" +
  "vec2 iterate(vec2 p) {\n" +
  "    float bestD = 1e6;\n" +
  "    vec2 bestCP = p;\n" +
  "    for (int i = 0; i < uVertexCount; i++) {\n" +
  "        vec2 v1 = uVertices[i];\n" +
  "        vec2 v2 = uVertices[(i + 1) % uVertexCount];\n" +
  "        vec2 cp = closestPoint(p, v1, v2);\n" +
  "        float d = length(cp - p);\n" +
  "        if (d < bestD) {\n" +
  "            bestD = d;\n" +
  "            bestCP = cp;\n" +
  "        }\n" +
  "    }\n" +
  "    return bestCP + uLambda * (p - bestCP);\n" +
  "    //    vec2 bestP = furthestPoint(p);\n" +
  "    //    return bestP + uLambda * (p - bestP);\n" +
  "}\n" +
  "\n" +
  "vec3 cosPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d){\n" +
  "    return a + b*cos(6.28318*(c*t+d));\n" +
  "}\n" +
  "\n" +
  "vec3 color(float t) {\n" +
  "    return cosPalette(t, vec3(0.2, 0.7, 0.4), vec3(0.6, 0.9, 0.2), vec3(0.6, 0.8, 0.7), vec3(0.5, 0.1, 0.0));\n" +
  "}\n" +
  "\n" +
  "void main() {\n" +
  "    vec2 p = vPosition.xy;\n" +
  "\n" +
  "    int i = 0;\n" +
  "    for (; i < uIterations; i++) {\n" +
  "        if (length(p) > FAR_AWAY) {\n" +
  "            break;\n" +
  "        }\n" +
  "        vec2 next = iterate(p);\n" +
  "        p = next;\n" +
  "    }\n" +
  "    //    float factor = clamp(length(p), 0.0, 1.0);\n" +
  "    //    if (length(p) > 1) factor = 1.0;\n" +
  "    //    else factor = 0.0;\n" +
  "    float factor = float(i) / float(uIterations);\n" +
  "    if (uDark) factor = 1. - factor; \n" +
  "\n" +
  "    gl_FragColor = vec4(vec3(factor), 1.0);\n" +
  "}";

@Component({
  selector: 'sourdough',
  templateUrl: '../../widgets/three-demo/three-demo.component.html',
  styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
  standalone: true,
  imports: [CommonModule]
})
export class SourdoughComponent extends ThreeDemoComponent implements OnDestroy {
  // Params
  iterations: number = 30;
  lambda: number = -3;
  n: number = 5;

  private oc: OrbitControls;
  private draggables: Object3D[] = [];
  private dc: DragControls;

  private shaderMaterial: ShaderMaterial = new ShaderMaterial({
    uniforms: {
      uVertexCount: {value: this.vertices.length},
      uVertices: {value: this.paddedVertices},
      uLambda: {value: this.lambda},
      uIterations: {value: this.iterations},
      uDark: {value: this.colorMode === ColorMode.Light}
    }
  });
  private billboard: Mesh = new Mesh(new PlaneGeometry(20, 20), this.shaderMaterial);

  private dotInnerGeo = new CircleGeometry(0.015);
  private dotOuterGeo = new CircleGeometry(0.02);
  private dotInnerMat = new MeshBasicMaterial({color: 0xaa2244});
  private dotOuterMat = new MeshBasicMaterial({color: 0xffffff});
  private oldZoom = 1;

  edgeGeo = new LineGeometry();
  edgeMat = new LineMaterial();
  edges = new Line2(this.edgeGeo, this.edgeMat);

  orbit: boolean = false;

  pane?: Pane;

  constructor() {
    super();
    console.log('constructor');
    this.useOrthographic = true;
    this.orthographicDiagonal = 2;
    this.updateOrthographicCamera();
    this.oldZoom = this.camera.zoom;
    // this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    this.oc = new OrbitControls(this.camera, this.renderer.domElement);
    this.oc.enableRotate = false;
    this.oc.zoomToCursor = true;

    this.dc = new DragControls(this.draggables, this.camera, this.renderer.domElement);
    // this.dc.addEventListener("dragstart", (e) => {
    //   const obj = e.object; // what raycaster hit
    //   if (obj instanceof Group) {
    //     return;
    //   } else if (obj.parent) {
    //     console.log('hit group');
    //     e.object = obj.parent;
    //   }
    // });

    this.regularPolygon(this.n);

    // this.initPromise = Promise.all([vertPromise, fragPromise]).then(([vertexShader, fragmentShader]) => {
    //   this.shaderMaterial.vertexShader = vertexShader;
    //   this.shaderMaterial.fragmentShader = fragmentShader;
    //   return this.renderer.compileAsync(this.scene, this.camera);
    // });

    // this.billboard.frustumCulled = true;
    if (!this.isPreview) {
      this.initPane();
    }

    this.scene.add(this.billboard);
    this.scene.add(...this.draggables);
    this.scene.add(this.edges);

    this.shaderMaterial.vertexShader = VERTEX_SHADER;
    this.shaderMaterial.fragmentShader = FRAGMENT_SHADER;
    this.shaderMaterial.needsUpdate = true;

    this.initPromise = this.renderer.compileAsync(this.scene, this.camera).then(() => {
      const start = Date.now();
      this.renderer.render(this.scene, this.camera);
      const end = Date.now();
      console.log(`Rendering first frame took ${end - start}ms`);
    });
  }

  initShaders() {
    return Promise.all([
      this.loadShader('assets/shaders/sourdough.vert'),
      this.loadShader('assets/shaders/sourdough.frag')
    ]).then(([vertexShader, fragmentShader]) => {
      this.shaderMaterial.vertexShader = vertexShader;
      this.shaderMaterial.fragmentShader = fragmentShader;
      this.shaderMaterial.needsUpdate = true;
      return this.renderer.compileAsync(this.scene, this.camera);
    });
  }

  initPane() {
    this.pane = new Pane();
    this.pane.addBinding(this, 'iterations', {min: 10, max: 50, step: 1});
    this.pane.addBinding(this, 'lambda', {min: -10, max: 10, step: 0.01});
    this.pane.addBinding(this, 'n', {min: 3, max: MAX_VERTICES, step: 1})
      .on('change', () => {
        this.regularPolygon(this.n);
      });
    this.pane.addBinding(this, 'orbit');
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    if (this.pane) this.pane.dispose();
    this.dc.dispose();
    this.shaderMaterial.dispose();
  }

  regularPolygon(n: number) {
    this.scene.clear();
    this.draggables.length = 0;
    for (let i = 0; i < n; i++) {
      this.draggables.push(this.dot(Complex.polar(1, i / n * Math.PI * 2 + Math.PI / 2).toVector2()))
    }
    this.scene.add(...this.draggables, this.billboard, this.edges);
  }

  override frame(_: number) {
    this.edgeMat.resolution = this.resolution;
    this.edgeMat.color.set(0xaa2244);
    this.edgeMat.linewidth = 3;
    this.edges.geometry = new LineGeometry().setPositions([...this.vertices, this.vertices[0]].flatMap(v => [v.x, v.y, 0.5]));
    // this.scene.clear();
    const zoom = this.camera.zoom;
    const dz = this.oldZoom / zoom;
    this.dotInnerGeo.scale(dz, dz, 1);
    this.dotOuterGeo.scale(dz, dz, 1);
    this.oldZoom = zoom;

    this.shaderMaterial.uniforms['uVertexCount'].value = this.vertices.length;
    this.shaderMaterial.uniforms['uVertices'].value = this.paddedVertices;
    this.shaderMaterial.uniforms['uIterations'].value = this.iterations;
    this.shaderMaterial.uniforms['uLambda'].value = this.lambda;
    this.shaderMaterial.uniforms['uDark'].value = this.colorMode === ColorMode.Light;
  }

  dot(p: Vector2): Object3D {
    const dOuter = new Mesh(this.dotOuterGeo, this.dotOuterMat);
    const dInner = new Mesh(this.dotInnerGeo, this.dotInnerMat);
    const handle = new Mesh(this.dotOuterGeo, new MeshBasicMaterial({transparent: true, opacity: 0.0}));
    dOuter.translateZ(1);
    dInner.translateZ(2);
    handle.translateZ(3);
    handle.attach(dInner);
    handle.attach(dOuter);
    handle.translateX(p.x);
    handle.translateY(p.y);
    return handle;
  }

  get vertices(): Vector2[] {
    return this.draggables.map(d => new Vector2(d.position.x, d.position.y));
  }

  get paddedVertices(): Vector2[] {
    const array = new Array(MAX_VERTICES).fill(new Vector2());
    for (let i = 0; i < this.vertices.length; i++) {
      array[i] = this.vertices[i];
    }
    return array;
  }
}