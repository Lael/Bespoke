import {ElementRef} from "@angular/core";
import {OrthographicCamera, PerspectiveCamera, Scene, Vector4} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";

export class Pane {
  orthographicCamera: OrthographicCamera;
  perspectiveCamera: PerspectiveCamera;
  orbitControls?: OrbitControls;
  active: boolean = true;

  orthographicDiagonal: number = 1.2;

  constructor(
    public scene: Scene,
    public defaults: Vector4, // left, bottom, width, height
    public useOrthographic: boolean = true,
    public ref?: ElementRef<HTMLDivElement>,
  ) {
    this.perspectiveCamera = new PerspectiveCamera(36, 1, 0.25, 2000);
    this.perspectiveCamera.position.set(0, 0, 5);
    this.orthographicCamera = new OrthographicCamera(-1, 1, 1, -1);
    this.orthographicCamera.position.set(0, 0, 10);
  }

  get camera(): OrthographicCamera | PerspectiveCamera {
    return this.useOrthographic ? this.orthographicCamera : this.perspectiveCamera;
  }

  resize(w: number, h: number) {
    const aspect = w / h;
    if (this.useOrthographic) {
      this.orthographicCamera.position.z = 10;
      this.orthographicCamera.left = -this.orthographicDiagonal * aspect;
      this.orthographicCamera.right = this.orthographicDiagonal * aspect;
      this.orthographicCamera.top = this.orthographicDiagonal;
      this.orthographicCamera.bottom = -this.orthographicDiagonal;
      this.orthographicCamera.updateProjectionMatrix();
    } else {
      this.perspectiveCamera.aspect = aspect;
      this.perspectiveCamera.updateProjectionMatrix();
    }
  }
}