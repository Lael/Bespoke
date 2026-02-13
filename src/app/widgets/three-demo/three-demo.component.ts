import {AfterViewInit, Component, ElementRef, inject, OnDestroy, ViewChild} from '@angular/core';
import * as THREE from 'three';
import {Color, ColorRepresentation, Vector2, WebGLRenderer} from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js'
import {CommonModule} from "@angular/common";
import {COLOR_MODE_TRANSITION_TIME, Colorable, ColorMode, ColorScheme} from "../../demos/color-scheme";
import {MatDialog} from "@angular/material/dialog";
import {PREVIEW_RENDERER} from "./preview-renderer";

export enum RunningContext {
  STANDARD,
  PREVIEW,
}

@Component({
  selector: 'three-demo',
  imports: [CommonModule],
  templateUrl: './three-demo.component.html',
  styleUrls: ['./three-demo.component.sass']
})
export abstract class ThreeDemoComponent implements AfterViewInit, OnDestroy {
  previewRenderer = inject(PREVIEW_RENDERER, {optional: true});
  runningContext: RunningContext = RunningContext.STANDARD;
  renderer: WebGLRenderer;

  helpDialogOpen = false;
  readonly helpDialog = inject(MatDialog);

  perspectiveCamera: THREE.PerspectiveCamera;
  orthographicCamera: THREE.OrthographicCamera;
  useOrthographic = false;
  orthographicDiagonal: number = 1;

  scene: THREE.Scene;

  @ViewChild('render_container', {static: true})
  hostElement?: ElementRef;

  showStats: boolean = true;
  stats: Stats;

  private resized = true;
  resolution = new Vector2(800, 800);

  keysPressed = new Map<string, boolean>();
  keysJustPressed = new Set<string>;
  private old: number;

  // Color management
  colorModeFraction: number;
  colorMode: ColorMode;
  colorScheme: ColorScheme = new ColorScheme();
  materialRegistry: Map<Colorable, string> = new Map();

  initPromise: Promise<any> | null = null;
  isLoaded = true;

  constructor() {
    if (this.previewRenderer) {
      this.runningContext = RunningContext.PREVIEW;
      this.renderer = this.previewRenderer;
    } else {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    this.scene = new THREE.Scene();
    window.addEventListener('resize', this.onResize.bind(this));

    const aspect = window.innerWidth / window.innerHeight;
    this.perspectiveCamera = new THREE.PerspectiveCamera(36, aspect, 0.25, 2000);
    this.perspectiveCamera.position.set(0, 0, 10);

    this.orthographicCamera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1);
    this.orthographicCamera.position.set(0, 0, 10);

    document.addEventListener('mousedown', this.mousedown.bind(this));
    document.addEventListener('mousemove', this.mousemove.bind(this));
    document.addEventListener('mouseup', this.mouseup.bind(this));
    document.addEventListener('keydown', this.keydown.bind(this));
    document.addEventListener('keyup', this.keyup.bind(this));
    document.addEventListener('focusout', this.focusout.bind(this));
    document.addEventListener('visibilitychange', this.focusout.bind(this));

    this.stats = new Stats();
    this.old = Date.now();

    this.colorMode = systemMode();
    this.colorModeFraction = this.colorMode;

    this.colorScheme.register('clear', 0xffffff, 0x000000);
    this.renderer.setClearColor(this.getColor('clear'));
    // this.colorScheme.register('clear', 0xf0f1eb, 0x000000);
  }

  loadShader(url: string): Promise<string> {
    const loader = new THREE.FileLoader();
    return new Promise((resolve, reject) => {
      loader.load(url,
        data => resolve(data as string),
        undefined,
        err => reject(err)
      );
    });
  }

  onResize() {
    this.resized = true;
  }

  ngOnDestroy(): void {
    if (this.showStats) {
      try {
        document.body.removeChild(this.stats.dom);
      } catch (e) {

      }
    }

    this.scene.clear();
    this.renderer.dispose();

    try {
      this.hostElement?.nativeElement.removeChild(this.renderer.domElement);
    } catch (e) {

    }

    document.removeEventListener('mousedown', this.mousedown.bind(this));
    document.removeEventListener('mousemove', this.mousemove.bind(this));
    document.removeEventListener('mouseup', this.mouseup.bind(this));
    document.removeEventListener('keydown', this.keydown.bind(this));
    document.removeEventListener('keyup', this.keyup.bind(this));
    document.removeEventListener('focusout', this.focusout.bind(this));
    document.removeEventListener('visibilitychange', this.focusout.bind(this));

    window.removeEventListener('resize', this.onResize.bind(this));
  }

  mousedown(e: MouseEvent) {

  }

  mousemove(e: MouseEvent) {

  }

  mouseup(e: MouseEvent) {

  }

  keydown(e: KeyboardEvent) {
    this.keysPressed.set(e.code, true);
  }

  keyup(e: KeyboardEvent) {
    this.keysPressed.set(e.code, false);
    this.keysJustPressed.add(e.code);
    this.keysJustPressed.add(e.key);
  }

  keyHeld(code: string): boolean {
    return this.keysPressed.get(code) === true;
  }

  keyJustPressed(code: string): boolean {
    return this.keysJustPressed.has(code);
  }

  focusout() {
    this.keysPressed.clear();
  }

  printScreen(width?: number, height?: number) {
    const win = window.open('', '');
    if (!win) {
      console.error('Failed to open a new window for the screenshot');
      return;
    }
    win.document.title = "Screenshot";
    const img = new Image();
    // store settings
    const oldPixelRatio = this.renderer.getPixelRatio();
    const w = width ? width : 2 * this.hostElement?.nativeElement.offsetWidth || 0
    const h = height ? height : 2 * this.hostElement?.nativeElement.offsetHeight || 0;
    this.resolution.set(w, h);
    this.renderer.setSize(w, h);
    this.perspectiveCamera.aspect = w / h;
    this.perspectiveCamera.updateMatrix();
    this.perspectiveCamera.updateProjectionMatrix();
    this.updateOrthographicCamera(w, h);
    this.renderer.render(this.scene, this.camera);
    img.src = this.renderer.domElement.toDataURL();
    win.document.body.appendChild(img);
    this.renderer.setPixelRatio(oldPixelRatio);
    this.renderer.setSize(w, h);
    this.resized = true;
  }

  abstract frame(dt: number): void;

  ngAfterViewInit(): void {
    if (this.runningContext === RunningContext.PREVIEW) {
      return;
    }
    if (!this.hostElement) {
      console.error('Missing container for renderer');
      return;
    }
    if (this.showStats) {
      document.body.appendChild(this.stats.dom);
    }
    const w = this.hostElement?.nativeElement.offsetWidth || 0;
    const h = this.hostElement?.nativeElement.offsetHeight || 0;
    this.renderer.setSize(w, h);
    this.hostElement.nativeElement.appendChild(this.renderer.domElement);
    this.old = Date.now();
    this.animate();
    console.log('starting loop');
  }

  renderPreview(w: number, h: number, mode: ColorMode) {
    if (this.runningContext === RunningContext.PREVIEW) {
      this.colorModeFraction = mode == ColorMode.Light ? 0 : 1;
      this.frame(0);
      this.resize(w, h);
      this.renderer.render(this.scene, this.camera);
    }
  }

  resize(w: number, h: number) {
    this.resized = false;
    this.resolution.set(w, h);
    if (this.runningContext !== RunningContext.PREVIEW) this.renderer.setSize(w, h);
    this.perspectiveCamera.aspect = w / h;
    this.perspectiveCamera.updateProjectionMatrix();
    this.updateOrthographicCamera(w, h);
    // for (let child of this.scene.children) {
    //   if (child instanceof Line2 || child instanceof LineSegments2) {
    //     child.material.resolution.set(w, h);
    //   }
    // }
  }

  animate() {
    if (this.resized) {
      this.resize(this.hostElement?.nativeElement.offsetWidth || 0, this.hostElement?.nativeElement.offsetHeight || 0);
    }
    this.stats.update();
    const now = Date.now();

    this.colorMode = systemMode();
    const dt = (now - this.old) / 1000;
    switch (this.colorMode) {
    case ColorMode.Light:
      this.colorModeFraction = Math.max(0, this.colorModeFraction - dt / COLOR_MODE_TRANSITION_TIME);
      break;
    case ColorMode.Dark:
      this.colorModeFraction = Math.min(1, this.colorModeFraction + dt / COLOR_MODE_TRANSITION_TIME);
      break;
    }

    for (let [material, colorKey] of this.materialRegistry) {
      material.color = this.getColor(colorKey);
    }

    this.frame(dt);
    this.old = now;
    this.render();
    this.keysJustPressed.clear();
    window.requestAnimationFrame(this.animate.bind(this));
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  get camera() {
    return this.useOrthographic ? this.orthographicCamera : this.perspectiveCamera;
  }

  updateOrthographicCamera(width?: number, height?: number) {
    const w = width ? width : this.hostElement?.nativeElement.offsetWidth || 0;
    const h = height ? height : this.hostElement?.nativeElement.offsetHeight || 0;

    const aspect = w / h;
    this.orthographicCamera.position.z = 100;
    this.orthographicCamera.left = -this.orthographicDiagonal * aspect;
    this.orthographicCamera.right = this.orthographicDiagonal * aspect;
    this.orthographicCamera.top = this.orthographicDiagonal;
    this.orthographicCamera.bottom = -this.orthographicDiagonal;
    this.orthographicCamera.updateProjectionMatrix();
  }

  registerColor(key: string, light: ColorRepresentation, dark: ColorRepresentation) {
    this.colorScheme.register(key, light, dark);
  }

  getColor(key: string): Color {
    return this.colorScheme.getColor(
      key,
      (1 - Math.cos(Math.PI * this.colorModeFraction)) / 2
    );
  }

  registerMaterial(material: Colorable, colorKey: string) {
    this.materialRegistry.set(material, colorKey);
  }

  get isPreview() {
    return this.runningContext === RunningContext.PREVIEW;
  }
}

function systemMode(): ColorMode {
  return (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) ? ColorMode.Dark : ColorMode.Light;
}
