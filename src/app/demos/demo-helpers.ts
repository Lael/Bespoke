import {LineGeometry} from "three/examples/jsm/lines/LineGeometry";
import {Vector2, Vector3} from "three";
import {Complex} from "../../math/complex/complex";
import {LineSegmentsGeometry} from "three/examples/jsm/lines/LineSegmentsGeometry.js";

export function populateLineGeometry(geo: LineGeometry, pts: (Vector2 | Complex | Vector3)[], z: number = 0): LineGeometry {
  if (pts.length === 0) return geo;
  geo.setPositions(pts.flatMap(v => {
      if (v instanceof Vector3) return [v.x, v.y, v.z];
      else return [v.x, v.y, z];
    })
  );
  return geo;
}

export function populateLineSegmentsGeometry(geo: LineSegmentsGeometry, pts: (Vector2 | Complex | Vector3)[], z: number = 0): LineSegmentsGeometry {
  if (pts.length === 0) return geo;
  geo.setPositions(pts.flatMap(v => {
      if (v instanceof Vector3) return [v.x, v.y, v.z];
      else return [v.x, v.y, z];
    })
  );
  return geo;
}