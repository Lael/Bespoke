import {Camera} from "./camera";
import {Matrix4} from "three";

export class PerspectiveCamera extends Camera {
    protected override computeCameraMatrix(): Matrix4 {
        const angle = (Math.PI / 2 - Math.atan(this.aspectRatio));
        const n = -this.near;
        const f = -this.far;
        const w = Math.cos(angle) * this.zoom * n;
        const h = Math.sin(angle) * this.zoom * n;

        const intrinsic = new Matrix4().set(
            -n / w, 0, 0, 0,
            0, -n / h, 0, 0,
            0, 0, -(n + f) / (f - n), -2 * f * n / (f - n),
            0, 0, -1, 0
        );

        const extrinsic = this.computeExtrinsic();
        return intrinsic.multiply(extrinsic);
    }
}