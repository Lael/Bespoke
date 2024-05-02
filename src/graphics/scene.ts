import {Camera} from "./camera/camera";
import {Shader} from "./gl/shader";
import {Drawable} from "./shapes/drawable";

export class Scene {
    private readonly drawables: Map<string, Drawable>;

    constructor() {
        this.drawables = new Map<string, Drawable>();
    }

    set(name: string, drawable: Drawable): void {
        this.drawables.set(name, drawable);
    }

    remove(name: string): boolean {
        return this.drawables.delete(name);
    }

    draw(shader: Shader, camera: Camera) {
        shader.bind();
        shader.setUniform('uCamera', camera.matrix);
        shader.setUniform('uOrdering', 0.5);

        const keys = Array.from(this.drawables.keys());
        for (let key of keys.sort()) {
            this.drawables.get(key)?.draw(shader);
        }

        shader.unbind();
    }

    clear() {
        this.drawables.clear();
    }
}