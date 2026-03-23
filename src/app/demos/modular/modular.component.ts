import {AfterViewInit, Component, ElementRef, inject, OnInit, ViewChild} from "@angular/core";
import {AngularSplitModule} from "angular-split";
import {MatButtonModule} from "@angular/material/button";
import {MatIcon} from "@angular/material/icon";
import {MatTableModule} from "@angular/material/table";
import {MatTooltipModule} from "@angular/material/tooltip";
import {PaneDemo} from "../pane-demo";
import {MatDialog} from "@angular/material/dialog";
import {
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector4,
  WebGLRenderer
} from "three";
import {Pane} from "../../widgets/pane";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {Gui} from "../../widgets/settings/settings";
import {Previewable} from "../../app.routes";
import {SettingsPanelComponent} from "../../widgets/settings/settings-panel.component";
import {HelpDialogComponent, HelpDialogData} from "../../widgets/help-dialog/help-dialog.component";
import {ColorMode} from "../color-scheme";
import {DragControls} from "three/examples/jsm/controls/DragControls";

@Component({
  selector: 'modular',
  templateUrl: 'modular.component.html',
  styleUrl: 'modular.component.scss',
  standalone: true,
  imports: [AngularSplitModule, SettingsPanelComponent, MatButtonModule, MatIcon, MatTableModule, MatTooltipModule],
})
export class ModularComponent extends PaneDemo implements Previewable, OnInit, AfterViewInit {
  private dialog = inject(MatDialog);
  time: number = 0;
  depth: number = 2;
  model: number = 0;
  dot: Mesh = new Mesh(new SphereGeometry(0.02), new MeshBasicMaterial({color: 0xff0000}));
  dc!: DragControls;

  @ViewChild('container')
  containerRef?: ElementRef<HTMLDivElement>;
  container: HTMLDivElement | null = null;

  @ViewChild('canvas')
  canvasRef?: ElementRef<HTMLCanvasElement>;

  @ViewChild('pane')
  paneRef?: ElementRef<HTMLDivElement>;
  pane!: Pane;

  dialogIsOpen: boolean = false;
  showSettings: boolean = true;

  standardRenderer!: WebGLRenderer;

  private shaderMaterial: ShaderMaterial = new ShaderMaterial({
    uniforms: {
      uDark: {value: this.colorMode === ColorMode.Dark},
      uTime: {value: this.time},
      uDepth: {value: this.depth},
      uModel: {value: this.model},
      uHighlight: {
        value: new Vector2(
          this.dot.position.x,
          this.dot.position.y,
        )
      },
    }
  });
  private billboard: Mesh = new Mesh(new PlaneGeometry(20, 20), this.shaderMaterial);

  gui = new Gui();

  helpData: HelpDialogData = {
    title: 'Modular Tiling',
    description: 'Some words',
    sections: [],
    keyBindings: [],
  };

  constructor() {
    super();

    this.registerColor('clear', 0xffffff, 0x000000);

    if (this.previewRenderer) {
      this.pane = this.createPane(undefined, new Vector4(0, 0, 1, 1));
      this.pane.scene.add(this.billboard);
    }
    this.initPromise = this.initShaders();
  }

  initShaders() {
    return Promise.all([
      this.loadShader('assets/shaders/modular.vert'),
      this.loadShader('assets/shaders/modular.frag')
    ]).then(([vertexShader, fragmentShader]) => {
      this.shaderMaterial.vertexShader = vertexShader;
      this.shaderMaterial.fragmentShader = fragmentShader;
      this.shaderMaterial.needsUpdate = true;
      return this.renderer.compileAsync(this.pane.scene, this.pane.camera);
    });
  }

  ngAfterViewInit() {
    if (this.previewRenderer) return;

    if (!this.containerRef) throw Error('no container');
    this.container = this.containerRef.nativeElement;
    if (!this.canvasRef?.nativeElement) throw Error('no canvas');
    if (!this.paneRef?.nativeElement) throw Error('no pane');
    this.standardRenderer = new WebGLRenderer({
      alpha: true,
      canvas: this.canvasRef.nativeElement,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.standardRenderer.setPixelRatio(window.devicePixelRatio);

    this.pane = this.createPane(this.paneRef, new Vector4(0, 0, 1, 1));
    this.pane.scene.add(this.billboard, this.dot);
    this.dc = new DragControls([this.dot], this.pane.camera, this.renderer.domElement);

    window.requestAnimationFrame(this.run.bind(this));
  }

  ngOnInit() {
    this.gui.add(this, 'depth', 1, 100, 1).name('Depth');
    this.gui.add(this, 'model', 0, 2, 1).name('Model');
    this.gui.add(this, 'openMainHelp').name('Help');
    // this.gui.onChange(() => {
    //   this.containerRef?.nativeElement.focus();
    // });
  }

  openMainHelp() {
    this.dialogIsOpen = true;
    this.dialog.open(HelpDialogComponent, {
      data: this.helpData,
    }).afterClosed().subscribe((_) => {
      this.dialogIsOpen = false;
    });
  }

  createPane(ref: ElementRef<HTMLDivElement> | undefined, defaults: Vector4): Pane {
    const scene = new Scene();
    const pane = new Pane(
      scene,
      defaults,
      true,
      ref,
    );
    pane.orbitControls = new OrbitControls(pane.camera, ref?.nativeElement || this.renderer.domElement);
    pane.orbitControls.enablePan = true;
    pane.orbitControls.enableRotate = false;
    pane.orbitControls.zoomToCursor = true;

    this.panes.push(pane);
    return pane;
  }

  pointDelta(keys: string[]): Vector2 {
    let dx = 0;
    let dy = 0;
    if (this.keyHeld(keys[0])) dy += 1;
    if (this.keyHeld(keys[1])) dy -= 1;
    if (this.keyHeld(keys[2])) dx += 1;
    if (this.keyHeld(keys[3])) dx -= 1;
    if (dx !== 0 || dy !== 0) return new Vector2(dx, dy).normalize();
    return new Vector2();
  }

  handleInput(dt: number) {
    if (this.keyJustPressed('?')) {
      if (!this.dialogIsOpen) this.openMainHelp();
      else this.dialog.closeAll();
    }

    if (this.dialogIsOpen) return;

    let multiplier = 1;
    if (this.keyHeld('ShiftLeft') || this.keyHeld('ShiftRight')) multiplier *= 0.1;
    if (this.keyHeld('AltLeft') || this.keyHeld('AltRight')) multiplier *= 0.01;
    const speed = 0.5 / this.pane.camera.zoom;
    const dv = this.pointDelta(['ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft'])
      .multiplyScalar(dt * multiplier * speed);
    this.dot.translateX(dv.x);
    this.dot.translateY(dv.y);
  }

  frame(dt: number): void {
    // this.time += dt;
    this.handleInput(dt);
    this.shaderMaterial.uniforms['uDark'].value = this.colorMode === ColorMode.Light;
    this.shaderMaterial.uniforms['uTime'].value = this.time;
    this.shaderMaterial.uniforms['uDepth'].value = this.depth;
    this.shaderMaterial.uniforms['uModel'].value = this.model;
    this.shaderMaterial.uniforms['uHighlight'].value = new Vector2(
      this.dot.position.x,
      this.dot.position.y,
    );
  }

  override draw() {
    if (!this.container) throw Error('no container');

    const cs = getComputedStyle(this.container);
    const containerBB = this.container.getBoundingClientRect();
    const pl = parseFloat(cs.paddingLeft);
    const pr = parseFloat(cs.paddingRight);
    const pt = parseFloat(cs.paddingTop);
    const pb = parseFloat(cs.paddingBottom);
    const w = containerBB.width - (pl + pr);
    const h = containerBB.height - (pt + pb);

    this.render(new Vector4(pl, pb, w, h));
  }

  get renderer(): WebGLRenderer {
    return this.previewRenderer || this.standardRenderer;
  }
}