import {BufferAttribute, BufferGeometry, ColorRepresentation, Mesh, MeshBasicMaterial, Vector3} from "three";
import {cylinderMatrix} from "../app/demos/regge/regge2.component";

export class ThickLine {
    mesh: Mesh;

    constructor(
        vertices: Vector3[],
        segments: number,
        thickness: number,
        color: ColorRepresentation,
    ) {
        console.log(vertices, segments, thickness);
        const cv = cylinderVertices(segments, thickness);

        const points = [];
        let indices = [];
        for (let i = 0; i < vertices.length - 1; i++) {
            const p1 = vertices[i];
            const p2 = vertices[i + 1];
            const m = cylinderMatrix(p1, p2);
            for (let j = 0; j < cv.length / 4; j++) {
                let c1 = cv[4 * j];
                let c2 = cv[4 * j + 1];
                let c3 = cv[4 * j + 2];
                let c4 = cv[4 * j + 3];
                const offset = points.length / 3;
                indices.push(
                    offset, offset + 1, offset + 2,
                    offset + 2, offset + 3, offset
                );
                for (let c of [c1, c2, c3, c4]) {
                    c.applyMatrix4(m);
                    points.push(c.x, c.y, c.z);
                }
            }
        }
        const geometry = new BufferGeometry();
        geometry.setIndex(indices);
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(points), 3))
        const material = new MeshBasicMaterial({color});

        this.mesh = new Mesh(geometry, material);
    }
}

function cylinderVertices(segments: number, thickness: number) {
    const cylinderVertices = [];
    for (let i = 0; i < segments; i++) {
        const theta1 = i * Math.PI * 2 / segments;
        const theta2 = (i + 1) * Math.PI * 2 / segments;
        const c1 = Math.cos(theta1) * thickness;
        const s1 = Math.sin(theta1) * thickness;
        const c2 = Math.cos(theta2) * thickness;
        const s2 = Math.sin(theta2) * thickness;
        cylinderVertices.push(new Vector3(s1, -0.5, c1,));
        cylinderVertices.push(new Vector3(s2, -0.5, c2,));
        cylinderVertices.push(new Vector3(s2, +0.5, c2,));
        cylinderVertices.push(new Vector3(s1, +0.5, c1,));
    }
    return cylinderVertices;
}