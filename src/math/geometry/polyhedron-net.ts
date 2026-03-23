import {Polyhedron} from "./polyhedron";
import {EuclideanPolygon} from "./euclidean-polygon";
import {Matrix3, Matrix4, Vector2, Vector3} from "three";
import {applyAffinity, closeEnough} from "../math-helpers";
import {LineSegment} from "./line-segment";

interface HalfEdge {
  edge: number;
  face: number;
  start: Vector2,
  end: Vector2,
  otherFace: number;
  transformation: Matrix3;
}

interface NetFace {
  faceIndex: number;
  polygon: EuclideanPolygon; // Inherits orientation from polyhedron
  embedding: Matrix4; // Map from R2 to R3
  chart: Matrix4; // Map from R3 to R2
  halfEdges: HalfEdge[]; // Order should match this polygon
}

interface NetPoint {
  point: Vector2;
  face: number | undefined;
  heading: number;
}

function mapToR2(v3: Vector3, chart: Matrix4): Vector2 {
  const i3 = v3.clone().applyMatrix4(chart);
  if (!closeEnough(i3.z, 0)) throw Error(`z-coordinate ${i3.z} is not zero`);
  return new Vector2(i3.x, i3.y);
}

function mapToR3(v2: Vector2, embedding: Matrix4): Vector3 {
  return new Vector3(v2.x, v2.y, 0).applyMatrix4(embedding);
}

/**
 * Compute the unique rigid transformation of R3 which sends v1 to p1, v2 to p2, and v3 into the plane so that its image
 * forms a right-handed triple with p1 and p2.
 * @param v1
 * @param v2
 * @param v3
 * @param p1
 * @param p2
 */
function createChart(v1: Vector3, v2: Vector3, v3: Vector3, p1: Vector2, p2: Vector2): Matrix4 {
  const dv = v2.clone().sub(v1).normalize();
  const dp = new Vector3(p2.x - p1.x, p2.y - p1.y, 0).normalize();

  // 1. Translate v1 to origin
  const t1 = new Matrix4().makeTranslation(-v1.x, -v1.y, -v1.z);

  // 2. Construct orthonormal frame at v1
  const b1 = v2.clone().sub(v1).normalize();
  const b3 = b1.clone().cross(v3.clone().sub(v1)).normalize();
  const b2 = b3.clone().cross(b1).normalize();
  const b = new Matrix4().set(
    b1.x, b2.x, b3.x, 0,
    b1.y, b2.y, b3.y, 0,
    b1.z, b2.z, b3.z, 0,
    0, 0, 0, 1,
  );

  // 3. Construct orthonormal frame at p1
  const c1 = new Vector3(p2.x - p1.x, p2.y - p1.y, 0).normalize();
  const c2 = new Vector3(-c1.y, c1.x, 0);
  const c3 = new Vector3(0, 0, 1);
  const c = new Matrix4().set(
    c1.x, c2.x, c3.x, 0,
    c1.y, c2.y, c3.y, 0,
    c1.z, c2.z, c3.z, 0,
    0, 0, 0, 1,
  );

  // 4. Translate origin to p1
  const t2 = new Matrix4().makeTranslation(p1.x, p1.y, 0);

  const chart = t1
    .premultiply(b.invert())
    .premultiply(c)
    .premultiply(t2);

  return chart;
}

function createIdentification(v1: Vector2, v2: Vector2, w1: Vector2, w2: Vector2): Matrix3 {
  const t1 = new Matrix3().makeTranslation(-v1.x, -v1.y);
  const b1 = v2.clone().sub(v1).normalize();
  const b2 = new Vector2(-b1.y, b1.x);
  const b = new Matrix3().set(
    b1.x, b2.x, 0,
    b1.y, b2.y, 0,
    0, 0, 1
  );

  const c1 = w2.clone().sub(w1).normalize();
  const c2 = new Vector2(-c1.y, c1.x);
  const c = new Matrix3().set(
    c1.x, c2.x, 0,
    c1.y, c2.y, 0,
    0, 0, 1
  );

  const t2 = new Matrix3().makeTranslation(w1.x, w1.y);

  return t1.premultiply(b.clone().invert()).premultiply(c).premultiply(t2);
}

export class PolyhedronNet {
  faces: NetFace[] = []; // Indices should line up with polyhedron
  ll: Vector2 = new Vector2();
  ur: Vector2 = new Vector2();

  constructor(readonly polyhedron: Polyhedron, root: number = 0) {
    const netFaces = new Map<number, NetFace>();
    // Do some sort of tree construction
    // Send first two vertices of face 0 to x-axis
    const face0 = polyhedron.faces[root];
    const v1 = face0.polygon.vertices[0];
    const v2 = face0.polygon.vertices[1];
    const v3 = face0.polygon.vertices[2];
    const p1 = new Vector2(0, -1);
    const p2 = new Vector2(0, v1.distanceTo(v2) - 1);
    const chartRoot = createChart(v1, v2, v3, p1, p2);
    const netFaceRoot: NetFace = {
      faceIndex: root,
      polygon: new EuclideanPolygon(face0.polygon.vertices.map(v => mapToR2(v, chartRoot))),
      embedding: chartRoot.clone().invert(),
      chart: chartRoot,
      halfEdges: [],
    };

    netFaces.set(root, netFaceRoot);
    let frontierIndices = [root];
    while (frontierIndices.length > 0) {
      const nextFrontier = [];
      for (let index of frontierIndices) {
        const netFace = netFaces.get(index);
        if (!netFace) throw Error('undefined face (should not happen)');
        const vertices = netFace.polygon.vertices;

        const newNeighbors = polyhedron.faces[index].edges.map((ei, i) => {
          const edge = polyhedron.edges[ei];
          const neighbor = edge.leftFace === index ? edge.rightFace : edge.leftFace;
          return {neighbor, edge, i};
        }).filter(fi => !netFaces.has(fi.neighbor));

        for (let {neighbor, edge, i} of newNeighbors) {
          const face = polyhedron.faces[neighbor];

          const p1 = vertices[(i + 1) % vertices.length];
          const p2 = vertices[i];

          let j = 0;
          for (; j < face.edges.length; j++) {
            if (face.edges[j] === edge.index) break;
          }
          const v1 = face.polygon.vertices[j];
          const v2 = face.polygon.vertices[(j + 1) % face.polygon.vertices.length];
          const v3 = face.polygon.vertices[(j + 2) % face.polygon.vertices.length];

          const chart = createChart(
            v1, v2, v3, p1, p2,
          );

          const neighborFace: NetFace = {
            faceIndex: neighbor,
            polygon: new EuclideanPolygon(face.polygon.vertices.map(v => {
              const image = mapToR2(v, chart)
              this.ll.min(image);
              this.ur.max(image);
              return image;
            })),
            embedding: chart.clone().invert(),
            chart: chart,
            halfEdges: [],
          };
          netFaces.set(neighbor, neighborFace);
        }
        nextFrontier.push(...newNeighbors.map(v => v.neighbor));
      }
      frontierIndices = nextFrontier;
    }

    const edgeMaps: Map<number, HalfEdge>[] = [];

    for (let i = 0; i < polyhedron.faces.length; i++) {
      const netFace = netFaces.get(i);
      if (!netFace) throw Error(`did not chart face ${i}`);
      this.faces.push(netFace);
      edgeMaps.push(new Map<number, HalfEdge>());
    }

    // Populate edges
    for (let edge of polyhedron.edges) {
      let left = edge.leftFace;
      let right = edge.rightFace;

      const start = polyhedron.vertices[edge.startIndex].point.clone();
      const end = polyhedron.vertices[edge.endIndex].point.clone();

      const v1 = this.polyhedronToNet(start, left).p2;
      const v2 = this.polyhedronToNet(end, left).p2;
      const w1 = this.polyhedronToNet(start, right).p2;
      const w2 = this.polyhedronToNet(end, right).p2;

      const t = createIdentification(v1, v2, w1, w2);

      let lhe: HalfEdge = {
        edge: edge.index,
        face: left,
        start: v1,
        end: v2,
        otherFace: right,
        transformation: t,
      };

      let rhe: HalfEdge = {
        edge: edge.index,
        face: right,
        start: w1,
        end: w2,
        otherFace: left,
        transformation: t.clone().invert(),
      }

      edgeMaps[left].set(edge.index, lhe);
      edgeMaps[right].set(edge.index, rhe);
    }

    // Finally, order the half edges correctly for each face
    for (let face of this.faces) {
      const edges = polyhedron.faces[face.faceIndex].edges;
      for (let e of edges) {
        const he = edgeMaps[face.faceIndex].get(e);
        if (!he) throw Error('bad edge indexing');
        face.halfEdges.push(he);
      }
    }
  }

  netToPolyhedron(p: Vector2, face?: number) {
    if (face !== undefined) {
      // Check that p does indeed lie on this face
      // if (!this.faces[face].polygon.contains(p)) throw Error('bad hint');
    } else {
      face = this.findNetFace(p);
    }
    return {p3: mapToR3(p, this.faces[face].embedding), face};
  }

  polyhedronToNet(p: Vector3, face?: number) {
    if (face !== undefined) {
      // if (!this.polyhedron.faces[face].polygon.containsPoint(p)) throw Error('bad hint');
    } else {
      face = this.findPolyhedronFace(p);
    }
    return {p2: mapToR2(p, this.faces[face].chart), face};
  }

  findNetFace(p: Vector2): number {
    for (let i = 0; i < this.faces.length; i++) {
      if (this.faces[i].polygon.contains(p)) return i;
    }
    throw Error('no face contains point');
  }

  findPolyhedronFace(p: Vector3): number {
    for (let face of this.polyhedron.faces) {
      if (face.polygon.containsPoint(p)) return face.index;
    }
    throw Error('no face contains point');
  }

  get polygons(): EuclideanPolygon[] {
    return this.faces.map(f => f.polygon);
  }

  wrapPoint(start: NetPoint, distance: number, depth = 0): NetPoint {
    // Prevent extremely long steps
    if (distance > 1) distance = 1;

    // First, confirm that we are in the face we say we are.
    if (start.face === undefined) {
      start.face = this.findNetFace(start.point);
    } else {
      if (!this.faces[start.face].polygon.contains(start.point)) {
        throw Error('wrong face');
      }
    }

    let netFace = this.faces[start.face];

    // Then, find line segment of travel.
    const end = start.point.clone().add(new Vector2(
        Math.cos(start.heading) * distance,
        Math.sin(start.heading) * distance,
      )
    );
    if (netFace.polygon.contains(end)) return {...start, point: end};

    const ls = new LineSegment(start.point, end);

    // Then, find first edge segment we cross.
    let halfEdge: HalfEdge | undefined = undefined;
    let intersection = new Vector2();
    for (let he of netFace.halfEdges) {
      const hel = new LineSegment(he.start, he.end);
      const intersections = ls.intersect(hel);
      if (intersections.length > 0) {
        halfEdge = he;
        intersection = intersections[0].toVector2();
        break;
      }
    }

    if (!halfEdge) {
      throw Error('left face but did not cross any edge');
    }

    // Then, update and recurse.
    const map = halfEdge.transformation;
    const newFace = halfEdge.otherFace;
    const newStart = applyAffinity(map, intersection);
    const newEnd = applyAffinity(map, end);

    const v = newEnd.clone().sub(newStart);
    const h = v.angle();

    return this.wrapPoint({
        point: newStart.addScaledVector(v.normalize(), 1e-6),
        heading: h,
        face: newFace,
      }, intersection.distanceTo(end),
      depth + 1);
  }
}