import {Matrix4, Vector2, Vector3, Vector4} from "three";

export interface ShaderSpec {
    name: string;
    vertPath: string;
    fragPath: string;
}

export type UniformType = number | Vector2 | Vector3 | Vector4 | Matrix4;

export class Shader {
    private readonly vert: WebGLShader;
    private readonly frag: WebGLShader;
    private readonly program: WebGLProgram;
    private readonly uniformLocations: Map<String, WebGLUniformLocation>;
    private readonly uniformTypes: Map<String, number>;

    constructor(private readonly gl: WebGL2RenderingContext, vertSource: string, fragSource: string) {
        const program = gl.createProgram();
        if (program === null) {
            throw new Error("Shader program is null!");
        }
        this.program = program;

        const vert = gl.createShader(gl.VERTEX_SHADER);
        if (vert === null) {
            throw new Error("Vertex shader is null!");
        }
        gl.shaderSource(vert, vertSource);
        gl.compileShader(vert);
        this.vert = this.buildShader(gl.VERTEX_SHADER, vertSource);
        this.frag = this.buildShader(gl.FRAGMENT_SHADER, fragSource);

        gl.attachShader(this.program, this.vert);
        gl.attachShader(this.program, this.frag);
        gl.linkProgram(this.program);

        // Check for success
        const linked = gl.getProgramParameter(this.program, gl.LINK_STATUS);
        if (!linked) {
            // There were errors, so get the errors and display them.
            var error = gl.getProgramInfoLog(this.program);
            throw new Error('Failed to link program: ' + error);
        }
        gl.useProgram(this.program);

        this.uniformLocations = new Map<String, number>();
        this.uniformTypes = new Map<String, number>();

        this.fetchUniforms();
        // this.fetchAttribs();
    }

    private fetchUniforms(): void {
        const n = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < n; i++) {
            const info = this.gl.getActiveUniform(this.program, i);
            if (!info) throw new Error('WebGLActiveInfo unexpectedly null');
            const name = info.name;
            const id = this.gl.getUniformLocation(this.program, name);
            if (!id) throw new Error('WebGLUniformLocation unexpectedly null');
            this.uniformLocations.set(name, id);
            this.uniformTypes.set(name, info.type);
        }
    }

    // private fetchAttribs(): void {
    //     const n = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_ATTRIBUTES);
    //     for (let i = 0; i < n; i++) {
    //         const attrib = this.gl.getActiveAttrib(this.program, i);
    //     }
    // }

    static fromPaths(gl: WebGL2RenderingContext, vertPath: string, fragPath: string): Promise<Shader> {
        return Shader.readShaderSource(vertPath).then(vert => {
            return Shader.readShaderSource(fragPath).then(frag => {
                return new Shader(gl, vert, frag);
            });
        });
    }

    private static readShaderSource(path: string): Promise<string> {
        return fetch(path).then(response => response.text());
    }

    private buildShader(type: GLenum, source: string): WebGLShader {
        const shader = this.gl.createShader(type);
        if (shader === null) {
            throw new Error("Vertex shader is null!");
        }
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        const message = this.gl.getShaderInfoLog(shader) || '';

        if (message.length > 0) {
            throw new Error('Failed to compile shader: ' + message);
        }
        return shader;
    }

    bind(): void {
        this.gl.useProgram(this.program);
    }

    unbind(): void {
        this.gl.useProgram(null);
    }

    private setUniformHelper(name: string, expectedType: number, f: Function) {
        const location = this.uniformLocations.get(name);
        const type = this.uniformTypes.get(name);
        if (!location || !type) throw new Error('Unrecognized uniform');
        if (type !== expectedType) throw new Error('Wrong uniform type');
        const currentProgram = this.gl.getParameter(this.gl.CURRENT_PROGRAM);
        this.bind();
        f(location);
        this.gl.useProgram(currentProgram);
    }

    setUniform(name: string, v: UniformType): void {
        if (!isNaN(v as number)) {
            this.setUniformHelper(name, this.gl.FLOAT,
                (l: WebGLUniformLocation) => this.gl.uniform1f(l, v as number));
        }
        if (v instanceof Vector2)
            this.setUniformHelper(name, this.gl.FLOAT_VEC2,
                (l: WebGLUniformLocation) => this.gl.uniform2f(l, v.x, v.y));
        if (v instanceof Vector3)
            this.setUniformHelper(name, this.gl.FLOAT_VEC3,
                (l: WebGLUniformLocation) => this.gl.uniform3f(l, v.x, v.y, v.z));
        if (v instanceof Vector4)
            this.setUniformHelper(name, this.gl.FLOAT_VEC4,
                (l: WebGLUniformLocation) => this.gl.uniform4f(l, v.x, v.y, v.z, v.w));
        if (v instanceof Matrix4)
            this.setUniformHelper(name, this.gl.FLOAT_MAT4,
                (l: WebGLUniformLocation) => this.gl.uniformMatrix4fv(l, false, v.elements));
    }
}

