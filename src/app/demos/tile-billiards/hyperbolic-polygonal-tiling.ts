import {PolygonalTiling} from "./polygonal-tiling";
import {HyperbolicTile} from "./hyperbolic-tile";
import {
    BufferAttribute,
    BufferGeometry,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    Path,
    Scene,
    Shape,
    ShapeGeometry,
    Vector2
} from "three";
import {HyperbolicPolygon, HyperbolicPolygonRayCollision} from "./hyperbolic-polygon";
import {Mobius} from "../../../math/complex/mobius";
import {HyperbolicModel, HyperGeodesic, HyperPoint} from "../../../math/hyperbolic/hyperbolic";
import {LineSegment} from "../../../math/geometry/line-segment";
import {ArcSegment} from "../../../math/geometry/arc-segment";
import {closeEnough, EPSILON, normalizeAngle} from "../../../math/math-helpers";
import {HyperbolicRay} from "./hyperbolic-ray";
import {mergeGeometries} from "three/examples/jsm/utils/BufferGeometryUtils.js";

export abstract class HyperbolicPolygonalTiling extends PolygonalTiling<HyperbolicTile, HyperbolicPolygon> {
  mesh: Mesh | undefined = undefined;
  mobius: Mobius = Mobius.IDENTITY;
  model: HyperbolicModel = HyperbolicModel.POINCARE;
  billiardPath: Line | undefined = undefined;

  updateMeshes() {
    console.log('updating meshes');
    let geometries = [];
    for (let t of this.tiles) {
      geometries.push(this.geometryForTile(t))
    }
    const geo = mergeGeometries(geometries, true);
    const mat = new MeshBasicMaterial(({vertexColors: true}));
    this.mesh = new Mesh(geo, mat);
  }

  private geometryForTile(t: HyperbolicTile): ShapeGeometry {
    this.dirty = false;
    const shape = new Shape();
    const prototile = this.tileset[t.tilesetIndex];
    const hp = prototile.polygon;
    const n = hp.n;
    const m = this.mobius.compose(t.mobius);
    const vertices = hp.vertices.map(v => HyperPoint.fromPoincare(m.apply(v.poincare)));
    switch (this.model) {
    case HyperbolicModel.POINCARE:
      const v0p = vertices[0].poincare;
      shape.moveTo(v0p.x, v0p.y);
      for (let i = 0; i < n; i++) {
        let v1 = vertices[i];
        let v2 = vertices[(i + 1) % n];
        try {
          let geo = new HyperGeodesic(v1, v2);
          let s = geo.segment(HyperbolicModel.POINCARE);
          if (s instanceof LineSegment) {
            shape.lineTo(v2.poincare.x, v2.poincare.y);
          } else if (s instanceof ArcSegment) {
            // Is this wrong is a weird subtle way? Yeah.
            // shape.lineTo(v2.poincare.x, v2.poincare.y);
            let h1 = s.center.heading(v1.poincare);
            let h2 = s.center.heading(v2.poincare);
            let cw = normalizeAngle(h1, h2) - h2 < Math.PI;
            shape.absarc(s.center.x, s.center.y, s.radius,
              h1, h2, cw
            );
          }
        } catch (e) {
          shape.lineTo(v2.poincare.x, v2.poincare.y);
        }
      }
      break;
    case HyperbolicModel.KLEIN:
      const v0k = vertices[0].klein;
      shape.moveTo(v0k.x, v0k.y);
      for (let i = 0; i < n; i++) {
        let vk = vertices[(i + 1) % n].klein;
        shape.lineTo(vk.x, vk.y);
      }
      break;
    case HyperbolicModel.HALF_PLANE:
      break;
    }
    shape.closePath();
    let geo = new ShapeGeometry(shape);
    let count = geo.attributes['position'].count;
    const colorAttribute = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colorAttribute.set(prototile.color.toArray(), i * 3);
    }
    geo.setAttribute('color', new BufferAttribute(colorAttribute, 3));
    return geo;
  }

  override play(iterations: number, start: Vector2, direction: number) {
    let ray: HyperbolicRay = {
      src: HyperPoint.fromPoincare(start),
      poincareDir: direction,
    };
    const path = new Path();
    path.moveTo(start.x, start.y);
    let tile = this.findTileContaining(ray.src);
    let firstRay: HyperbolicRay | undefined;
    for (let i = 0; i < iterations; i++) {
      const p = this.polygonForTile(tile);
      let collision: HyperbolicPolygonRayCollision;
      let rayGeo: HyperGeodesic;
      try {
        collision = p.castRay(ray);
        rayGeo = new HyperGeodesic(ray.src, collision.point);

        let segment = rayGeo.segment(HyperbolicModel.POINCARE);
        if (segment instanceof LineSegment) {
          path.lineTo(collision.point.poincare.x, collision.point.poincare.y);
        } else if (segment instanceof ArcSegment) {
          const h1 = segment.center.heading(ray.src.poincare);
          const h2 = segment.center.heading(collision.point.poincare);
          const cw = normalizeAngle(h1, h2) - h2 < Math.PI;
          path.absarc(segment.center.x, segment.center.y, segment.radius,
            h1, h2, cw);
        }

        let si = collision.sideIndex;
        let edge: HyperGeodesic;
        let sideHeading: number;
        try {
          edge = new HyperGeodesic(
            p.vertices[si],
            collision.point);
          sideHeading = edge.heading2() + Math.PI;
        } catch (e) {
          console.log('other side', e);
          edge = new HyperGeodesic(
            p.vertices[(si + 1) % p.n],
            collision.point);
          sideHeading = edge.heading2();
        }

        const oldHeading = rayGeo.heading2() + Math.PI;
        const newHeading = normalizeAngle(oldHeading - 2 * (oldHeading - (sideHeading + Math.PI / 2)));
        const reflected = HyperGeodesic.poincareRay(collision.point, newHeading);
        ray = {
          src: collision.point.translate(reflected.p2, 2 * EPSILON),
          poincareDir: newHeading,
        };
        if (firstRay === undefined) {
          firstRay = {
            src: ray.src,
            poincareDir: ray.poincareDir,
          };
        } else if (ray.src.equals(firstRay.src) && closeEnough(
          normalizeAngle(ray.poincareDir),
          normalizeAngle(firstRay.poincareDir)
        )) {
          // periodic
          break;
        }
        tile = this.adjacentTile(tile, si);
        // this.addTile(tile);
      } catch (e) {
        console.log(e);
        break;
      }
    }
    this.billiardPath = new Line(
      new BufferGeometry().setFromPoints(path.getPoints()),
      new LineBasicMaterial({color: 0xffffff}));
    this.billiardPath.translateZ(1);
  }

  private findTileContaining(point: HyperPoint): HyperbolicTile {
    for (let t of this.tiles) {
      if (this.polygonForTile(t).contains(point)) return t;
    }
    throw Error('point is not contained in any tile');
  }

  private polygonForTile(t: HyperbolicTile): HyperbolicPolygon {
    return this.tileset[t.tilesetIndex].polygon.transform(t.mobius);
  }

  override draw(scene: Scene) {
    if (this.dirty) this.updateMeshes();
    if (!!this.mesh) scene.add(this.mesh);
    if (!!this.billiardPath) scene.add(this.billiardPath);
  }
}