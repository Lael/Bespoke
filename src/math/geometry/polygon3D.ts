import {Plane} from "./plane";
import {Vector2, Vector3} from "three";
import {EuclideanPolygon} from "./euclidean-polygon";

// Assumed to be convex
export class Polygon3D {
  readonly plane: Plane;
  _area: number | undefined = undefined;

  constructor(readonly vertices: Vector3[]) {
    if (vertices.length < 3) throw Error('Face must have at least 3 vertices');
    this.plane = Plane.fromThreePoints(vertices[0], vertices[1], vertices[2]);
    for (let i = 3; i < vertices.length; i++) {
      if (!this.plane.containsPoint(vertices[i])) throw Error('All face vertices must be coplanar');
    }
  }

  get area(): number {
    if (this._area === undefined) {
      let a = new Vector3();
      for (let i = 1; i < this.vertices.length - 1; i++) {
        const v1 = this.vertices[i].clone().sub(this.vertices[0]);
        const v2 = this.vertices[i + 1].clone().sub(this.vertices[0]);
        a.add(v1.cross(v2));
      }
      this._area = a.length();
    }
    return this._area;
  }

  containsPoint(v: Vector3) {
    // Choose projection. Any unit vector in R3 has at least one entry with magnitude above 0.5
    const n = this.plane.normal;
    let polygon2D;
    let vproj;
    if (!this.plane.containsPoint(v)) return false;
    if (n.z >= 0.5) {
      polygon2D = new EuclideanPolygon(this.vertices.map(v => new Vector2(v.x, v.y)));
      vproj = new Vector2(v.x, v.y);
    } else if (n.z <= -0.5) {
      polygon2D = new EuclideanPolygon(this.vertices.map(v => new Vector2(v.x, v.y)).reverse());
      vproj = new Vector2(v.x, v.y);
    } else if (n.y >= 0.5) {
      polygon2D = new EuclideanPolygon(this.vertices.map(v => new Vector2(v.x, v.z)).reverse());
      vproj = new Vector2(v.x, v.z);
    } else if (n.y <= -0.5) {
      polygon2D = new EuclideanPolygon(this.vertices.map(v => new Vector2(v.x, v.z)));
      vproj = new Vector2(v.x, v.z);
    } else if (n.x >= 0.5) {
      polygon2D = new EuclideanPolygon(this.vertices.map(v => new Vector2(v.y, v.z)));
      vproj = new Vector2(v.y, v.z);
    } else if (n.x <= -0.5) {
      polygon2D = new EuclideanPolygon(this.vertices.map(v => new Vector2(v.y, v.z)).reverse());
      vproj = new Vector2(v.y, v.z);
    } else {
      throw Error('bad normal');
    }
    return polygon2D.contains(vproj);
  }
}