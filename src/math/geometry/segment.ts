import {Complex} from "../complex";

export abstract class Segment {
    abstract get start(): Complex;
    abstract get mid(): Complex;
    abstract get end(): Complex;
    abstract intersect(other: Segment): Complex[];
    abstract containsPoint(p: Complex): boolean;

    abstract wind(p: Complex): number;
    abstract interpolate(direction: number): Complex[];
    abstract split(points: Complex[]): Segment[];

    abstract startHeading(): number;
    abstract endHeading(): number;

    abstract startCurvature(): number;
    abstract endCurvature(): number;
}