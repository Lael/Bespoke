import {Shape} from "./shape";
import {Matrix4, Vector3} from "three";
import {Shader, UniformType} from "../gl/shader";

export class Drawable {
    protected model: Matrix4 = new Matrix4();

    constructor(readonly shapes: Shape[],
                protected readonly uniforms: Map<string, UniformType> = new Map<string, UniformType>()) {
    }

    draw(shader: Shader) {
        for (let shape of this.shapes) {
            shader.setUniform('uModel', this.model);
            shader.setUniform('uOrdering', 0.5);
            for (let uniform of this.uniforms.entries()) {
                shader.setUniform(uniform[0], uniform[1]);
            }
            shape.draw();
        }
    }

    recenter(x: number, y: number, z: number) {
        this.model.setPosition(x, y, z);
    }

    scale(r: number) {
        this.model.scale(new Vector3(r, r, r));
    }

    scaleXYZ(x: number, y: number, z: number) {
        this.model.scale(new Vector3(x, y, z));
    }
}