export interface PolygonRayCollision<P> {
    point: P;
    sideIndex: number;
}

export abstract class Polygon<P> {
    vertices: P[];
    n: number;

    constructor(vertices: P[]) {
        this.vertices = vertices;
        this.n = vertices.length;
    }

    abstract contains(point: P): boolean;

    // abstract castRay(ray: Ray<P>)
}