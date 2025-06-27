import {createNoise2D, NoiseFunction2D} from "simplex-noise";
import {Matrix3, Vector2} from "three";

abstract class Noise2D {
  abstract noise(p: Vector2): number;
}

export class SimplexNoise2D extends Noise2D {
  private noiseFn: NoiseFunction2D;

  constructor(readonly scale: Matrix3 | number = new Matrix3().identity()) {
    super();
    this.noiseFn = createNoise2D();
  }

  override noise(p: Vector2): number {
    const v = this.scale instanceof Matrix3 ?
      p.clone().applyMatrix3(this.scale) :
      p.clone().multiplyScalar(this.scale);
    return this.noiseFn(v.x, v.y);
  }
}

export class RidgeNoise2D extends Noise2D {
  private noiseFn: NoiseFunction2D;
  private diff: Vector2;

  constructor(readonly scale: Matrix3 | number = new Matrix3().identity(),
              readonly power: number = 1) {
    super();
    this.noiseFn = createNoise2D();
    const diffTheta = 2 * Math.random() * Math.PI;
    const diffR = Math.random();
    this.diff = new Vector2(Math.cos(diffTheta), Math.sin(diffTheta)).multiplyScalar(diffR);
  }

  override noise(p: Vector2): number {
    const pd = p.clone();
    const v = (this.scale instanceof Matrix3 ?
      pd.applyMatrix3(this.scale) :
      pd.multiplyScalar(this.scale)).add(this.diff);
    const noise = this.noiseFn(v.x, v.y);
    return Math.pow(
      1 - Math.abs(noise),
      this.power
    );
  }
}

export class Noise2DV {
  private radius: NoiseFunction2D;
  private angle: NoiseFunction2D;

  constructor(readonly scale: number) {
    this.radius = createNoise2D();
    this.angle = createNoise2D();
  }

  noise(p: Vector2): Vector2 {
    const v = p.clone().multiplyScalar(this.scale);
    const r = Math.abs(this.radius(v.x, v.y));
    const theta = (this.angle(v.x, v.y) + 1) * Math.PI;
    return new Vector2(r * Math.cos(theta), r * Math.sin(theta));
  }
}

interface NoiseLayer {
  noises: Noise2D[],
  weight: number,
  sampleNoise?: Noise2DV,
  sampleNoiseWeight?: number,
}

export class IceNoise2D {
  constructor(readonly layers: NoiseLayer[] = []) {
  }

  noise(p: Vector2): number {
    let value = 0;
    for (let layer of this.layers) {
      const sp = (layer.sampleNoise == undefined ?
        p :
        p.add(layer.sampleNoise.noise(p).multiplyScalar(layer.sampleNoiseWeight || 1)));
      let n = 1;
      for (let noise of layer.noises) {
        n *= noise.noise(sp);
      }
      value += layer.weight * n;
    }
    return value;
  }
}