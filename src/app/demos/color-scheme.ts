// [light, dark]
import {Color, ColorRepresentation} from "three";

export declare type ColorPair = [Color, Color];

export class ColorScheme {
  private map: Map<string, ColorPair> = new Map();

  constructor() {
  }

  register(key: string, light: ColorRepresentation, dark: ColorRepresentation) {
    this.map.set(key, [new Color(light), new Color(dark)]);
  }

  getColor(key: string, alpha: number): Color {
    const pair = this.map.get(key);
    if (pair === undefined) throw Error(`Color ${key} not registered in color scheme`);
    const light = pair[0];
    const dark = pair[1];
    if (alpha === 0) {
      // console.log(key, light);
      return light;
    }
    if (alpha === 1) {
      // console.log(key, dark);
      return dark;
    }
    // console.log(key, interpolated);
    return new Color().lerpColors(light, dark, alpha);
  }
}

export enum ColorMode {
  Light,
  Dark,
}

export const COLOR_MODE_TRANSITION_TIME: number = 0.25;

export interface Colorable {
  color: ColorRepresentation
}


export function systemMode(): ColorMode {
  return (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) ? ColorMode.Dark : ColorMode.Light;
}