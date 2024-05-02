export class Texture {
    readonly texture: WebGLTexture;

    constructor(private readonly gl: WebGL2RenderingContext,
                private width: number,
                private height: number,
                readonly type: number = gl.FLOAT,
                readonly format: number = gl.RGBA,
                private data: any = null,
                ) {
        const t = gl.createTexture();
        if (!t) throw Error('Could not create texture');
        this.texture = t;
        this.bind();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texImage2D(
            gl.TEXTURE_2D, 0, format,
            width, height, 0,
            format, type, data);

        this.unbind();
    }

    bind() {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }

    resize(width: number, height: number) {
        if (width === this.width && height === this.height) return;
        this.width = width;
        this.height = height;

        this.gl.texImage2D(
            this.gl.TEXTURE_2D, 0, this.format,
            this.width, this.height, 0,
            this.format, this.type, null);
    }

    bufferData(data: any) {
        const currentlyBound = this.gl.getParameter(this.gl.TEXTURE_BINDING_2D);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

        this.gl.texImage2D(
            this.gl.TEXTURE_2D, 0, this.format,
            this.width, this.height, 0,
            this.format, this.type, data);

        this.gl.bindTexture(this.gl.TEXTURE_2D, currentlyBound);
    }

    unbind() {
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
}
