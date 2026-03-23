import {Plane} from "./plane";
import {Vector2, Vector3} from "three";
import {EuclideanPolygon} from "./euclidean-polygon";

// Assumed to be convex
export class Polygon3D {
  readonly plane: Plane;
  _area: number | undefined = undefined;
  _xm: EuclideanPolygon | undefined = undefined;
  _xp: EuclideanPolygon | undefined = undefined;
  _ym: EuclideanPolygon | undefined = undefined;
  _yp: EuclideanPolygon | undefined = undefined;
  _zm: EuclideanPolygon | undefined = undefined;
  _zp: EuclideanPolygon | undefined = undefined;

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
      polygon2D = this.zp;
      vproj = new Vector2(v.x, v.y);
    } else if (n.z <= -0.5) {
      polygon2D = this.zm;
      vproj = new Vector2(v.x, v.y);
    } else if (n.y >= 0.5) {
      polygon2D = this.yp;
      vproj = new Vector2(v.x, v.z);
    } else if (n.y <= -0.5) {
      polygon2D = this.ym;
      vproj = new Vector2(v.x, v.z);
    } else if (n.x >= 0.5) {
      polygon2D = this.xp;
      vproj = new Vector2(v.y, v.z);
    } else if (n.x <= -0.5) {
      polygon2D = this.xm;
      vproj = new Vector2(v.y, v.z);
    } else {
      throw Error('bad normal');
    }
    return polygon2D.contains(vproj);
  }

  private get xp() {
    if (this._xp === undefined)
      this._xp = new EuclideanPolygon(this.vertices.map(v => new Vector2(v.y, v.z)));
    return this._xp;
  }

  private get xm() {
    if (this._xm === undefined)
      this._xm = new EuclideanPolygon(this.vertices.map(v => new Vector2(v.y, v.z)).reverse());
    return this._xm;
  }

  private get yp() {
    if (this._yp === undefined)
      this._yp = new EuclideanPolygon(this.vertices.map(v => new Vector2(v.x, v.z)).reverse());
    return this._yp;
  }

  private get ym() {
    if (this._ym === undefined)
      this._ym = new EuclideanPolygon(this.vertices.map(v => new Vector2(v.x, v.z)));
    return this._ym;
  }

  private get zp() {
    if (this._zp === undefined)
      this._zp = new EuclideanPolygon(this.vertices.map(v => new Vector2(v.x, v.y)));
    return this._zp;
  }

  private get zm() {
    if (this._zm === undefined)
      this._zm = new EuclideanPolygon(this.vertices.map(v => new Vector2(v.x, v.y)).reverse());
    return this._zm;
  }
}