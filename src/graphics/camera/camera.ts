import {Matrix4, Vector3} from "three";

export abstract class Camera {
    // The camera's position in world-space.
    protected position = new Vector3(0, 0, 1);

    // Forward, up, & right form should be kept orthonormal.
    protected forward = new Vector3(0, 0, -1);
    protected up = new Vector3(0, 1, 0);
    protected right = new Vector3(1, 0, 0);

    // Viewport width / height
    protected aspectRatio = 1.0;

    // distance to corner of view from point 1 unit along forward vector.
    protected zoom = 1.0;

    // Clip planes (orthogonal to the forward direction)
    protected near = 0.1;
    protected far = 100;

    // A small optimization: cache the camera matrix
    private dirty = true;
    private cameraMatrix = new Matrix4();

    private updateBasis(): void {
        this.right.crossVectors(this.forward, this.up);
        this.up.crossVectors(this.right, this.forward);
        this.right.normalize();
        this.forward.normalize();
        this.up.normalize();
    }

    protected markDirty(): void {
        this.dirty = true;
    }

    setPosition(position: Vector3): void {
        this.position = position;
        this.markDirty();
    }

    setForward(forward: Vector3): void {
        this.forward = forward.normalize();
        this.updateBasis();
        this.markDirty();
    }

    setUp(up: Vector3): void {
        this.up = up.normalize();
        this.updateBasis();
        this.markDirty();
    }

    setAspectRatio(aspectRatio: number): void {
        this.aspectRatio = aspectRatio;
        this.markDirty();
    }

    setZoom(zoom: number): void {
        this.zoom = zoom;
        this.markDirty();
    }

    getZoom() {
        return this.zoom;
    }

    moveWorld(t: Vector3): void {
        this.position.add(t);
        this.markDirty();
    }

    moveCamera(t: Vector3): void {
        this.position.add(this.right.clone().setLength(t.x));
        this.position.add(this.up.clone().setLength(t.y));
        this.position.add(this.forward.clone().setLength(t.z));
        this.markDirty();
    }

    get matrix() {
        if (this.dirty) {
            this.cameraMatrix = this.computeCameraMatrix();
            this.dirty = false;
        }
        return this.cameraMatrix.clone();
    }

    protected abstract computeCameraMatrix(): Matrix4;

    getPosition(): Vector3 {
        return this.position.clone();
    }

    getForward(): Vector3 {
        return this.forward.clone();
    }

    getUp(): Vector3 {
        return this.up.clone();
    }

    getRight(): Vector3 {
        return this.right.clone();
    }

    computeExtrinsic(): Matrix4 {
        const rx = this.right.x;
        const ry = this.right.y;
        const rz = this.right.z;
        const ux = this.up.x;
        const uy = this.up.y;
        const uz = this.up.z;
        const fx = this.forward.x;
        const fy = this.forward.y;
        const fz = this.forward.z;
        const px = this.position.x;
        const py = this.position.y;
        const pz = this.position.z;
        const rotate = new Matrix4().set(
            rx, ux, fx, 0,
            ry, uy, fy, 0,
            rz, uz, fz, 0,
            0, 0, 0, 1
        ).transpose();

        const translate = new Matrix4().set(
            1, 0, 0, -px,
            0, 1, 0, -py,
            0, 0, 1, -pz,
            0, 0, 0, 1
        );

        return rotate.multiply(translate);
    }
}
