import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  Object3D,
  SphereGeometry,
  Vector3
} from "three";
import {Plane} from "./plane";
import {Line3D} from "./line3D";
import {EPSILON} from "../math-helpers";
import {Polygon3D} from "./polygon3D";

export interface Vertex {
  index: number,
  point: Vector3,
  edges: number[],
  faces: number[],
}

export interface Edge {
  index: number,
  startIndex: number,
  endIndex: number,
  length: number,
  leftFace: number,
  rightFace: number,
}

export interface Face {
  index: number,
  indices: number[],
  edges: number[],
  polygon: Polygon3D,
}

const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_INV = 1 / PHI;

export interface Ray3D {
  src: Vector3,
  dir: Vector3,
}

export class Polyhedron {
  vertices: Vertex[];
  edges: Edge[];
  faces: Face[];

  static TETRAHEDRON = new Polyhedron([
    new Vector3(+1, +1, +1), // 0: + + +
    new Vector3(+1, -1, -1), // 1: + - -
    new Vector3(-1, +1, -1), // 2: - + -
    new Vector3(-1, -1, +1), // 3: - - +
  ], [
    [0, 1], [0, 2], [0, 3],
    [1, 2], [1, 3],
    [2, 3],
  ], [
    [0, 1, 2], [0, 3, 1], [0, 2, 3],
    [1, 3, 2]
  ]);

  static TETRAHEDRON2 = new Polyhedron([
    new Vector3(-1, -1, -1), // 0: - - -
    new Vector3(+1, +1, -1), // 1: + + -
    new Vector3(+1, -1, +1), // 2: + - +
    new Vector3(-1, +1, +1), // 3: - + +
  ], [
    [0, 1], [0, 2], [0, 3],
    [1, 2], [1, 3],
    [2, 3],
  ], [
    [0, 1, 2], [0, 3, 1], [0, 2, 3],
    [1, 3, 2]
  ]);

  static CUBE = new Polyhedron([
    new Vector3(+1, +1, +1), // 0: + + +
    new Vector3(+1, +1, -1), // 1: + + -
    new Vector3(+1, -1, +1), // 2: + - +
    new Vector3(+1, -1, -1), // 3: + - -
    new Vector3(-1, +1, +1), // 4: - + +
    new Vector3(-1, +1, -1), // 5: - + -
    new Vector3(-1, -1, +1), // 6: - - +
    new Vector3(-1, -1, -1), // 7: - - -
  ], [
    [0, 1], [0, 2], [0, 4],
    [1, 3], [1, 5],
    [2, 3], [2, 6],
    [3, 7],
    [4, 5], [4, 6],
    [5, 7],
    [6, 7],
  ], [
    [0, 2, 3, 1], [4, 5, 7, 6],
    [0, 1, 5, 4], [2, 6, 7, 3],
    [0, 4, 6, 2], [1, 3, 7, 5],
  ]);

  static OCTAHEDRON = new Polyhedron([
    new Vector3(+1, 0, 0),
    new Vector3(-1, 0, 0),
    new Vector3(0, +1, 0),
    new Vector3(0, -1, 0),
    new Vector3(0, 0, +1),
    new Vector3(0, 0, -1),
  ], [
    [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 2], [1, 3], [1, 4], [1, 5],
    [2, 4], [2, 5],
    [3, 4], [3, 5],
  ], [
    [0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2],
    [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5],
  ]);

  static DODECAHEDRON = new Polyhedron([
    new Vector3(+1, +1, +1), //  0
    new Vector3(+1, +1, -1), //  1
    new Vector3(+1, -1, +1), //  2
    new Vector3(+1, -1, -1), //  3
    new Vector3(-1, +1, +1), //  4
    new Vector3(-1, +1, -1), //  5
    new Vector3(-1, -1, +1), //  6
    new Vector3(-1, -1, -1), //  7
    new Vector3(0, +PHI_INV, +PHI),   //  8
    new Vector3(0, +PHI_INV, -PHI),   //  9
    new Vector3(0, -PHI_INV, +PHI),   // 10
    new Vector3(0, -PHI_INV, -PHI),   // 11
    new Vector3(+PHI_INV, +PHI, 0),   // 12
    new Vector3(+PHI_INV, -PHI, 0),   // 13
    new Vector3(-PHI_INV, +PHI, 0),   // 14
    new Vector3(-PHI_INV, -PHI, 0),   // 15
    new Vector3(+PHI, 0, +PHI_INV),   // 16
    new Vector3(-PHI, 0, +PHI_INV),   // 17
    new Vector3(+PHI, 0, -PHI_INV),   // 18
    new Vector3(-PHI, 0, -PHI_INV),   // 19
  ], [
    [0, 8], [0, 12], [0, 16],
    [1, 9], [1, 12], [1, 18],
    [2, 10], [2, 13], [2, 16],
    [3, 11], [3, 13], [3, 18],
    [4, 8], [4, 14], [4, 17],
    [5, 9], [5, 14], [5, 19],
    [6, 10], [6, 15], [6, 17],
    [7, 11], [7, 15], [7, 19],
    [8, 10], [9, 11], [12, 14], [13, 15], [16, 18], [17, 19]
  ], [
    [0, 12, 14, 4, 8],
    [0, 8, 10, 2, 16],
    [0, 16, 18, 1, 12],
    [1, 9, 5, 14, 12],
    [1, 18, 3, 11, 9],
    [2, 10, 6, 15, 13],
    [2, 13, 3, 18, 16],
    [3, 13, 15, 7, 11],
    [4, 17, 6, 10, 8],
    [4, 14, 5, 19, 17],
    [5, 9, 11, 7, 19],
    [6, 17, 19, 7, 15]
  ]);

  static ICOSAHEDRON = new Polyhedron([
    new Vector3(+PHI, +1, 0), //  0
    new Vector3(+PHI, -1, 0), //  1
    new Vector3(-PHI, +1, 0), //  2
    new Vector3(-PHI, -1, 0), //  3

    new Vector3(+1, 0, +PHI), //  4
    new Vector3(-1, 0, +PHI), //  5
    new Vector3(+1, 0, -PHI), //  6
    new Vector3(-1, 0, -PHI), //  7

    new Vector3(0, +PHI, +1), //  8
    new Vector3(0, +PHI, -1), //  9
    new Vector3(0, -PHI, +1), // 10
    new Vector3(0, -PHI, -1), // 11
  ], [
    [0, 1], [0, 4], [0, 6], [0, 8], [0, 9],
    [1, 4], [1, 6], [1, 10], [1, 11],
    [2, 3], [2, 5], [2, 7], [2, 8], [2, 9],
    [3, 5], [3, 7], [3, 10], [3, 11],
    [4, 5], [4, 8], [4, 10],
    [5, 8], [5, 10],
    [6, 7], [6, 9], [6, 11],
    [7, 9], [7, 11],
    [8, 9], [10, 11],
  ], [
    [0, 4, 1], [0, 8, 4], [0, 9, 8], [0, 6, 9], [0, 1, 6],
    [1, 4, 10], [1, 11, 6], [1, 10, 11],
    [2, 3, 5], [2, 7, 3], [2, 5, 8], [2, 9, 7], [2, 8, 9],
    [3, 10, 5], [3, 7, 11], [3, 11, 10],
    [4, 8, 5], [4, 5, 10],
    [6, 7, 9], [6, 11, 7],
  ]);

  constructor(vertices: Vector3[], edges: [number, number][], faces: number[][]) {
    this.vertices = vertices.map((v, i) => {
      return {index: i, point: v.clone(), edges: [], faces: []};
    });
    const edgeMap = new Map<string, number>();
    this.edges = edges.map(([a, b], i) => {
      edgeMap.set(JSON.stringify([Math.min(a, b), Math.max(a, b)]), i);
      return {
        index: i,
        startIndex: Math.min(a, b),
        endIndex: Math.max(a, b),
        length: this.vertices[a].point.distanceTo(this.vertices[b].point),
        leftFace: -1,
        rightFace: -1,
      };
    });

    this.faces = faces.map((indices, i) => {
      return {
        index: i,
        indices,
        edges: [],
        polygon: new Polygon3D(indices.map(i => this.vertices[i].point))
      };
    });


    // Tell vertices, edges, and faces about one another.
    for (const [faceIndex, face] of this.faces.entries()) {
      const n = face.indices.length;
      for (let i = 0; i < n; i++) {
        const i1 = face.indices[i];
        const i2 = face.indices[(i + 1) % n];

        this.vertices[i1].faces.push(faceIndex);

        if (i1 < i2) {
          const ind = edgeMap.get(JSON.stringify([i1, i2]));
          if (ind === undefined)
            throw Error(`Face [${face.indices}] borders edge [${[i1, i2]}], which does not occur in edge list`);

          this.vertices[i1].edges.push(ind);
          this.edges[ind].leftFace = faceIndex;
          face.edges.push(ind);
        } else {
          const ind = edgeMap.get(JSON.stringify([i2, i1]));
          if (ind === undefined)
            throw Error(`Face ${face.indices} borders edge ${[i2, i1]}, which does not occur in edge list`);
          this.edges[ind].rightFace = faceIndex;
          face.edges.push(ind);
        }
      }
    }
  }

  faceCenter(face: Face) {
    const center = new Vector3();
    for (let v of face.indices) {
      center.add(this.vertices[v].point);
    }
    center.multiplyScalar(1 / face.indices.length);
    return center;
  }

  get volume(): number {
    let v = 0;
    for (let face of this.faces) {
      const a = face.polygon.area;
      const d = face.polygon.plane.point.dot(face.polygon.plane.normal);
      v += a * d / 3;
    }
    return v;
  }

  get surfaceArea(): number {
    throw Error('NYI');
  }

  dual(): Polyhedron {
    const vertices = this.faces.map(f => this.faceCenter(f));
    const edges = [];
    for (let e of this.edges) {
      edges.push([e.leftFace, e.rightFace])
    }
    throw Error('NYI');
  }

  static fromPlanes(planes: Plane[]): Polyhedron {
    // Use the connected component "behind" all the planes
    throw Error('NYI');
  }

  drawable(vertexMaterial: Material, edgeMaterial: Material, faceMaterial: Material): Object3D {
    const vertices = this.vertices.map(v => v.point);

    const vertexMesh = new InstancedMesh(
      new SphereGeometry(0.025, 12, 12),
      vertexMaterial,
      this.vertices.length,
    );
    for (const [i, vertex] of this.vertices.entries()) {
      vertexMesh.setMatrixAt(i, new Matrix4().makeTranslation(vertex.point));
    }
    vertexMesh.instanceMatrix.needsUpdate = true;

    const edgeMesh = new InstancedMesh(
      new CylinderGeometry(0.01, 0.01, 1, 12, 1, true),
      edgeMaterial,
      this.edges.length,
    );
    for (const [i, edge] of this.edges.entries()) {
      const start = vertices[edge.startIndex];
      const end = vertices[edge.endIndex];
      const s = new Matrix4().makeScale(1, edge.length, 1);
      const axis = end.clone().sub(start).normalize();
      const angle = Math.acos(axis.y);
      const rotAxis = new Vector3(0, 1, 0).cross(axis).normalize();
      const r = new Matrix4().makeRotationAxis(rotAxis, angle);
      const t = new Matrix4().makeTranslation(start.clone().lerp(end, 0.5));
      const m = s.premultiply(r).premultiply(t);
      edgeMesh.setMatrixAt(i, m);
    }
    edgeMesh.instanceMatrix.needsUpdate = true;

    const meshIndices = [];
    for (let face of this.faces) {
      const r = face.indices[0];
      for (let i = 1; i < face.indices.length - 1; i++) meshIndices.push(r, face.indices[i], face.indices[i + 1]);
    }
    const faceGeometry = new BufferGeometry();
    faceGeometry.setAttribute('position', new BufferAttribute(
      new Float32Array(vertices.flatMap(v => [v.x, v.y, v.z])), 3
    ));
    faceGeometry.setIndex(meshIndices);
    faceGeometry.computeVertexNormals();
    const faceMesh = new Mesh(faceGeometry, faceMaterial);

    faceMesh.add(edgeMesh, vertexMesh);
    return faceMesh;
  }

  intersectRay(ray: Ray3D): [Vector3, Face] {
    const line = new Line3D(ray.src, ray.dir);
    let bestT = Number.POSITIVE_INFINITY;
    let bestV: Vector3 | undefined = undefined;
    let bestF: Face | undefined = undefined;
    for (let face of this.faces) {
      const v = line.intersectPlane(face.polygon.plane);
      if (!v) {
        continue;
      }
      const t = line.time(v);
      if (t < EPSILON || t > bestT) {
        continue;
      }
      // Check if point lies inside face:
      // Pick the largest component of plane's normal by abs and project into that coordinate plane
      // Make a 2D polygon and check for containment. Careful about orientation.
      if (face.polygon.containsPoint(v)) {
        bestT = t;
        bestV = v;
        bestF = face;
      }
    }
    if (!bestV || !bestF) {
      throw Error('no intersection');
    }
    return [bestV, bestF];
  }

  support(p: Vector3): number {
    let m = 0;
    for (let v of this.vertices) {
      const d = v.point.dot(p);
      if (d > m) m = d;
    }
    return m;
  }

  transform(t: Matrix4): Polyhedron {
    return new Polyhedron(
      this.vertices.map(v => v.point.clone().applyMatrix4(t)),
      this.edges.map(e => [e.startIndex, e.endIndex]),
      this.faces.map(f => f.indices)
    );
  }
}

function planeThroughPoints(vertices: Vector3[]): Plane {
  if (vertices.length < 3) throw Error('not enough vertices for a face');
  const p = Plane.fromThreePoints(vertices[0], vertices[1], vertices[2]);
  for (let i = 3; i < vertices.length; i++) {
    if (!p.containsPoint(vertices[i])) throw Error('Vertices are not coplanar');
  }
  return p;
}
