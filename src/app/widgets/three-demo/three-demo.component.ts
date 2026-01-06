import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';
import * as THREE from 'three';
import {Color, ColorRepresentation, Vector2} from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js'
import {CommonModule} from "@angular/common";
import {Line2} from "three/examples/jsm/lines/Line2.js";
import {LineSegments2} from "three/examples/jsm/lines/LineSegments2.js";

// [light, dark]
declare type ColorPair = [Color, Color];

export class ColorScheme {
  private map: Map<string, ColorPair> = new Map();

  constructor() {
  }

  register(key: string, light: ColorRepresentation, dark: ColorRepresentation) {
    this.map.set(key, [new Color(light), new Color(dark)]);
  }

  getColor(key: string, alpha: number): Color {
    const pair = this.map.get(key);
    if (pair === undefined) throw Error(`Color ${key} not registered in color scheme`);
    const light = pair[0];
    const dark = pair[1];
    if (alpha === 0) {
      // console.log(key, light);
      return light;
    }
    if (alpha === 1) {
      // console.log(key, dark);
      return dark;
    }
    // console.log(key, interpolated);
    return new Color().lerpColors(light, dark, alpha);
  }
}

enum ColorMode {
  Light,
  Dark,
}

const COLOR_MODE_TRANSITION_TIME: number = 0.25;

interface Colorable {
  color: ColorRepresentation
}

@Component({
  selector: 'three-demo',
  imports: [CommonModule],
  templateUrl: './three-demo.component.html',
  styleUrls: ['./three-demo.component.sass']
})
export abstract class ThreeDemoComponent implements AfterViewInit, OnDestroy {
  perspectiveCamera: THREE.PerspectiveCamera;
  orthographicCamera: THREE.OrthographicCamera;
  useOrthographic = false;
  orthographicDiagonal: number = 1;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;

  @ViewChild('render_container', {static: true})
  hostElement?: ElementRef;

  stats: Stats;

  private resized = true;
  resolution = new Vector2(800, 800);

  showHelp = false;
  helpTitle = 'Demo';
  helpText = '';
  shortcuts: string[][] = [];

  keysPressed = new Map<string, boolean>();
  keysJustPressed = new Set<string>;
  private old: number;

  // Color management
  colorModeFraction: number;
  colorMode: ColorMode;
  colorScheme: ColorScheme = new ColorScheme();
  materialRegistry: Map<Colorable, string> = new Map();

  constructor() {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    // this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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
    document.body.appendChild(this.stats.dom);
    this.old = Date.now();

    this.colorMode = systemMode();
    this.colorModeFraction = this.colorMode;

    this.colorScheme.register('clear', 0xffffff, 0x000000);
    // this.colorScheme.register('clear', 0xf0f1eb, 0x000000);
    this.renderer.setClearColor(this.getColor('clear'));
  }

  onResize() {
    this.resized = true;
  }

  ngOnDestroy(): void {
    document.body.removeChild(this.stats.dom);
    this.hostElement?.nativeElement.removeChild(this.renderer.domElement);
    this.renderer.dispose();
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
    if (!this.hostElement) {
      console.error('Missing container for renderer');
      return;
    }
    const w = this.hostElement?.nativeElement.offsetWidth || 0;
    const h = this.hostElement?.nativeElement.offsetHeight || 0;
    this.renderer.setSize(w, h);
    this.hostElement.nativeElement.appendChild(this.renderer.domElement);
    this.old = Date.now();
    this.animate();
  }

  animate() {
    if (this.resized) {
      this.resized = false;
      const w = this.hostElement?.nativeElement.offsetWidth || 0;
      const h = this.hostElement?.nativeElement.offsetHeight || 0;
      this.resolution.set(w, h);
      this.renderer.setSize(w, h);
      this.perspectiveCamera.aspect = w / h;
      this.perspectiveCamera.updateProjectionMatrix();
      this.updateOrthographicCamera();
      for (let child of this.scene.children) {
        if (child instanceof Line2 || child instanceof LineSegments2) {
          child.material.resolution.set(w, h);
        }
      }
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
}

function systemMode(): ColorMode {
  return (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) ? ColorMode.Dark : ColorMode.Light;
}