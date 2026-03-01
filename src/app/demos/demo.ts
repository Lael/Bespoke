import {inject} from "@angular/core";
import {Previewable} from "../app.routes";
import {PREVIEW_RENDERER} from "../widgets/three-demo/preview-renderer";
import {COLOR_MODE_TRANSITION_TIME, Colorable, ColorMode, ColorScheme, systemMode} from "./color-scheme";
import * as THREE from "three";
import {Color, ColorRepresentation, Vector2, WebGLRenderer} from "three";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial.js";

export enum RunningContext {
  STANDARD,
  PREVIEW,
}

export abstract class Demo implements Previewable {
  previewRenderer: WebGLRenderer | null = inject(PREVIEW_RENDERER, {optional: true});
  runningContext: RunningContext = RunningContext.STANDARD;
  initPromise: Promise<any> | null = null;

  // Color management
  colorModeFraction: number;
  colorMode: ColorMode;
  colorScheme: ColorScheme = new ColorScheme();
  colorableRegistry: Map<Colorable, string> = new Map();

  resolution: Vector2 = new Vector2(800, 800);
  lineMatRegistry: Set<LineMaterial> = new Set();

  old: number = Date.now();

  // Input
  keysPressed = new Map<string, boolean>();
  keysJustPressed = new Set<string>;

  protected constructor() {
    if (this.previewRenderer) {
      this.runningContext = RunningContext.PREVIEW;
    }

    this.colorMode = systemMode();
    this.colorModeFraction = this.colorMode;

    document.addEventListener('mousedown', this.mousedown.bind(this));
    document.addEventListener('mousemove', this.mousemove.bind(this));
    document.addEventListener('mouseup', this.mouseup.bind(this));
    document.addEventListener('keydown', this.keydown.bind(this));
    document.addEventListener('keyup', this.keyup.bind(this));
    document.addEventListener('focusout', this.focusout.bind(this));
    document.addEventListener('visibilitychange', this.focusout.bind(this));
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

  focusout() {
    this.keysPressed.clear();
  }

  keyHeld(code: string): boolean {
    return this.keysPressed.get(code) === true;
  }

  keyJustPressed(code: string): boolean {
    return this.keysJustPressed.has(code);
  }

  abstract frame(dt: number): void;

  abstract renderPreview(w: number, h: number, mode: ColorMode): void;

  draw(): void {
  }

  abstract get renderer(): WebGLRenderer;

  run() {
    const now = Date.now();
    const dt = (now - this.old) / 1000;
    this.old = now;

    this.updateColorScheme(dt);
    this.updateColors();

    this.frame(dt);
    this.draw();
    this.keysJustPressed.clear();
    window.requestAnimationFrame(this.run.bind(this));
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

  registerColor(key: string, light: ColorRepresentation, dark: ColorRepresentation) {
    this.colorScheme.register(key, light, dark);
  }

  getColor(key: string): Color {
    return this.colorScheme.getColor(
      key,
      (1 - Math.cos(Math.PI * this.colorModeFraction)) / 2
    );
  }

  registerColorable(material: Colorable, colorKey: string) {
    this.colorableRegistry.set(material, colorKey);
  }

  registerLineMat(lineMat: LineMaterial) {
    this.lineMatRegistry.add(lineMat);
  }

  updateColorScheme(dt: number) {
    this.colorMode = systemMode();
    switch (this.colorMode) {
    case ColorMode.Light:
      this.colorModeFraction = Math.max(0, this.colorModeFraction - dt / COLOR_MODE_TRANSITION_TIME);
      break;
    case ColorMode.Dark:
      this.colorModeFraction = Math.min(1, this.colorModeFraction + dt / COLOR_MODE_TRANSITION_TIME);
      break;
    }
  }

  updateColors() {
    this.renderer.setClearColor(this.getColor('clear'));
    for (let [material, colorKey] of this.colorableRegistry) {
      material.color = this.getColor(colorKey);
    }
  }

  updateResolutions(w: number, h: number) {
    for (let mat of this.lineMatRegistry) {
      mat.resolution.set(w, h);
      mat.needsUpdate = true;
    }
  }

  get isPreview(): boolean {
    return this.runningContext === RunningContext.PREVIEW;
  }

  tidy() {
    document.removeEventListener('mousedown', this.mousedown.bind(this));
    document.removeEventListener('mousemove', this.mousemove.bind(this));
    document.removeEventListener('mouseup', this.mouseup.bind(this));
    document.removeEventListener('keydown', this.keydown.bind(this));
    document.removeEventListener('keyup', this.keyup.bind(this));
    document.removeEventListener('focusout', this.focusout.bind(this));
    document.removeEventListener('visibilitychange', this.focusout.bind(this));
  }
}