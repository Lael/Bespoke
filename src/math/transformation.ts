import {Complex} from "./complex";

export abstract class Transformation {
    abstract apply(z: Complex): Complex;
}