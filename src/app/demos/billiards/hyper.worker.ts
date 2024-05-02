/// <reference lib="webworker" />

import {HyperbolicPolygonTable} from "../../../math/billiards/hyperbolic-polygon-table";
import {Complex} from "../../../math/complex";
import {HyperGeodesic, HyperPoint} from "../../../math/hyperbolic/hyperbolic";

addEventListener('message', ({data}) => {
    const iterations = data.iterations;
    const id = data.id;
    const table = new HyperbolicPolygonTable(data.vertices.map((v: number[]) => HyperPoint.fromPoincare(new Complex(v[0], v[1]))));
    let frontier = data.frontier.map((f: number[]) =>
        new HyperGeodesic(
            HyperPoint.fromPoincare(new Complex(
                f[0],
                f[1],
            )),
            HyperPoint.fromPoincare(new Complex(
                f[2],
                f[3],
            )),
        ));

    const singularities: any[] = [];
    for (let i = 0; i < iterations; i++) {
        const newFrontier = table.generatePreimages(frontier);
        singularities.push(...newFrontier)
        frontier = newFrontier;
    }

    singularities.push(...frontier);
    console.log()

    const response = {
        id,
        singularities: singularities.map((s: HyperGeodesic) => [
            s.start.poincare.x,
            s.start.poincare.y,
            s.end.poincare.x,
            s.end.poincare.y,
        ]),
        stillWorking: false,
    }

    postMessage(response);
});