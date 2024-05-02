import {Mesh} from "./mesh";
import {Triangle, Vector3} from "three";
import {Color} from "./color";

export class Sphere extends Mesh {
    constructor(gl: WebGL2RenderingContext, radius: number, position: Vector3, color: Color, detail: number = 4) {
        if (radius <= 0) throw Error('Invalid radius');
        const triangles: Triangle[] = [];

        // Cube-based triangulation
        const up = new Vector3(0, 0, 1);
        const right = new Vector3(0, 1, 0);
        const left = new Vector3(0, -1, 0);
        const out = new Vector3(1, 0, 0);
        const into = new Vector3(-1, 0, 0);
        triangles.push(...Sphere.cubeFace(new Vector3(1, -1, -1), up, right, detail));
        triangles.push(...Sphere.cubeFace(new Vector3(1, 1, -1), up, into, detail));
        triangles.push(...Sphere.cubeFace(new Vector3(-1, 1, -1), up, left, detail));
        triangles.push(...Sphere.cubeFace(new Vector3(-1, -1, -1), up, out, detail));
        triangles.push(...Sphere.cubeFace(new Vector3(-1, -1, -1), out, right, detail));
        triangles.push(...Sphere.cubeFace(new Vector3(1, -1, 1), into, right, detail));

        super(gl, triangles, [], color, undefined);
        this.recenter(position.x, position.y, position.z);
        this.scale(radius);
    }

    private static cubeFace(corner: Vector3, up: Vector3, right: Vector3, detail: number): Triangle[] {
        const triangles: Triangle[] = [];
        const step = 2 / (detail + 1);
        for (let i = 0; i < detail + 1; i++) {
            for (let j = 0; j < detail + 1; j++) {
                const ll = corner.clone()
                    .add(up.clone().multiplyScalar(step * i))
                    .add(right.clone().multiplyScalar(step * j))
                    .normalize();
                const lr = corner.clone()
                    .add(up.clone().multiplyScalar(step * i))
                    .add(right.clone().multiplyScalar(step * (j + 1)))
                    .normalize();
                const ul = corner.clone()
                    .add(up.clone().multiplyScalar(step * (i + 1)))
                    .add(right.clone().multiplyScalar(step * j))
                    .normalize();
                const ur = corner.clone()
                    .add(up.clone().multiplyScalar(step * (i + 1)))
                    .add(right.clone().multiplyScalar(step * (j + 1)))
                    .normalize();
                triangles.push(new Triangle(ll, lr, ur));
                triangles.push(new Triangle(ur, ul, ll));
            }
        }
        return triangles;
    }
}
