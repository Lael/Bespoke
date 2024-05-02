import {VertexAttrib} from "../gl/vertex-attrib";

export abstract class Shape {
    private readonly vao: WebGLVertexArrayObject;
    private readonly vbo: WebGLBuffer;

    protected constructor(protected readonly gl: WebGL2RenderingContext,
                          protected readonly vertexAttribs: VertexAttrib[],
                          protected readonly vertexCount: number,
                          data: number[],
                          private readonly drawMode: GLenum) {
        const vao = gl.createVertexArray();
        if (!vao) throw Error('Could not create VAO!');
        this.vao = vao;
        
        const vbo = gl.createBuffer();
        if (!vbo) throw Error('Could not create VBO!');
        this.vbo = vbo;

        this.bind();

        this.gl.bufferData(this.gl.ARRAY_BUFFER, Float32Array.from(data), this.gl.STATIC_DRAW);

        this.unbind();
    }

    draw(): void {
        this.bind();

        this.gl.drawArrays(this.drawMode, 0, this.vertexCount);

        this.unbind();
    }

    private bind(): void {
        this.gl.bindVertexArray(this.vao);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);

        for (let va of this.vertexAttribs) {
            this.gl.enableVertexAttribArray(va.index);
            this.gl.vertexAttribPointer(va.index, va.size, va.type, false, va.stride, va.offset);
        }
    }

    private unbind() {
        for (let va of this.vertexAttribs) {
            this.gl.disableVertexAttribArray(va.index);
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindVertexArray(null);
    }
}