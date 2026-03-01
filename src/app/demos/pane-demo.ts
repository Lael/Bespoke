import {Demo} from "./demo";
import {ColorMode} from "./color-scheme";
import {Pane} from "../widgets/pane";
import {Vector4} from "three";

export abstract class PaneDemo extends Demo {
  panes: Pane[] = [];

  override renderPreview(w: number, h: number, mode: ColorMode): void {
    this.colorModeFraction = mode == ColorMode.Light ? 0 : 1;
    this.frame(0);

    this.render(new Vector4(0, 0, w, h));
  }

  render(rectangle: Vector4) {
    const pl = rectangle.x;
    const pb = rectangle.y;
    const w = rectangle.z;
    const h = rectangle.w;

    this.resolution.x = w;
    this.resolution.y = h;

    this.updateColors();

    this.renderer.setScissorTest(false);
    this.renderer.setSize(w, h);
    this.renderer.clear();

    for (let pane of this.panes) {
      if (!pane.active) continue;
      let left, bottom, width, height;
      if (pane.ref) {
        const bb = pane.ref.nativeElement.getBoundingClientRect();
        left = bb.left - pl;
        bottom = h - bb.bottom + pb;
        width = bb.width;
        height = bb.height;
      } else {
        left = pane.defaults.x * w;
        bottom = pane.defaults.y * h;
        width = pane.defaults.z * w;
        height = pane.defaults.w * h;
      }
      this.renderer.setViewport(left, bottom, width, height);
      this.renderer.setScissor(left, bottom, width, height);
      this.renderer.setScissorTest(true);

      this.updateResolutions(width, height);
      pane.resize(width, height);

      this.renderer.render(pane.scene, pane.camera);
    }

    this.renderer.setScissorTest(false);
    this.renderer.setSize(w, h);
  }
}