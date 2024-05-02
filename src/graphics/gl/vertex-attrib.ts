export class VertexAttrib {
    constructor(readonly index: number,
                readonly size: number,
                readonly type: GLenum,
                readonly stride: number,
                readonly offset: number) {
    }
}