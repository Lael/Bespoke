import {Camera} from "./camera";
import {Matrix4} from "three";

export class OrthographicCamera extends Camera {
    protected override computeCameraMatrix(): Matrix4 {
        const angle = Math.PI / 2 - Math.atan(this.aspectRatio);
        const n = -this.near;
        const f = -this.far;
        const w = Math.cos(angle) * this.zoom;
        const h = Math.sin(angle) * this.zoom;

        const intrinsic = new Matrix4().set(
            1 / w, 0, 0, 0,
            0, 1 / h, 0, 0,
            0, 0, -2 / (f - n), -(f + n) / (f - n),
            0, 0, 0, 1
        );

        const extrinsic = this.computeExtrinsic();
        return intrinsic.multiply(extrinsic);
    }
}