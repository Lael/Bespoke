import {AfterViewInit, Component, ElementRef, inject, OnDestroy, ViewChild} from '@angular/core';
import * as THREE from 'three';
import {WebGLRenderer} from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js'
import {CommonModule} from "@angular/common";
import {ColorMode} from "../../demos/color-scheme";
import {MatDialog} from "@angular/material/dialog";
import {Demo, RunningContext} from "../../demos/demo";

@Component({
  selector: 'three-demo',
  imports: [CommonModule],
  templateUrl: './three-demo.component.html',
  styleUrls: ['./three-demo.component.sass']
})
export abstract class ThreeDemoComponent extends Demo implements AfterViewInit, OnDestroy {
  @ViewChild('render_container', {static: true})
  hostElement?: ElementRef;

  renderer: WebGLRenderer;

  helpDialogOpen = false;
  readonly helpDialog = inject(MatDialog);

  perspectiveCamera: THREE.PerspectiveCamera;
  orthographicCamera: THREE.OrthographicCamera;
  useOrthographic = false;
  orthographicDiagonal: number = 1;

  scene: THREE.Scene;

  showStats: boolean = true;
  stats: Stats;

  private resized = true;

  constructor() {
    super();
    if (this.isPreview) {
      this.renderer = this.previewRenderer!;
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

    this.stats = new Stats();
    this.old = Date.now();

    this.colorScheme.register('clear', 0xffffff, 0x000000);
    // this.colorScheme.register('clear', 0xf0f1eb, 0x000000);
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


    window.removeEventListener('resize', this.onResize.bind(this));

    this.tidy();
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

  ngAfterViewInit(): void {
    if (this.isPreview) return;

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
  }

  renderPreview(w: number, h: number, mode: ColorMode) {
    this.colorModeFraction = mode == ColorMode.Light ? 0 : 1;
    this.colorMode = mode;
    this.updateResolutions(w, h);
    this.renderer.setClearColor(this.getColor('clear'));
    this.renderer.clear();
    this.frame(0);
    this.resize(w, h);
    this.renderer.render(this.scene, this.camera);
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
    const dt = (now - this.old) / 1000;
    this.old = now;

    this.updateColorScheme(dt);
    this.updateColors();

    this.frame(dt);
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
}
