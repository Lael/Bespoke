import {InjectionToken} from "@angular/core";
import {WebGLRenderer} from "three";

export const PREVIEW_RENDERER = new InjectionToken<WebGLRenderer>('PREVIEW_RENDERER');