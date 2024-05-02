import {Component, OnDestroy} from "@angular/core";
import * as dat from "dat.gui";
import {PolygonPickerComponent, PolygonRestriction} from "../../widgets/polygon-picker.component";
import {Ray, Vector2, Vector3} from "three";
import {Chart} from "chart.js/auto";
import {ChartConfiguration} from "chart.js/dist/types";
import {Data, Unfolder3DComponent} from "./unfolder-3d.component";
import {VectorPickerComponent} from "../../widgets/vector-picker.component";

// type Params = {
//     // unfolding
//     iterations: number;
//     graphA: boolean;
//     graphB: boolean;
//     graphAB: boolean;
//     graphBirkhoff: boolean;
// };

export type UnfoldingData = {
    step: number,
    aSides: number,
    bSides: number,
    birkhoffSum: number,
    distinctAngles: number,
};

@Component({
    selector: 'unfolding-3d',
    templateUrl: 'unfolding-3d.component.html',
    styleUrls: ['unfolding-3d.component.sass'],
    imports: [PolygonPickerComponent, VectorPickerComponent, Unfolder3DComponent],
    standalone: true,
})
export class Unfolding3DComponent implements OnDestroy {
    gui = new dat.GUI();
    Restriction = PolygonRestriction;
    vertices: Vector2[] = [
        new Vector2(1, 0),
        new Vector2(0, 1),
        new Vector2(-1, 0),
        new Vector2(0, -1)];

    ray = new Ray(new Vector3(), new Vector3(1, 1, 1).normalize());

    params = {
        iterations: 1,
        height: 0,
        rayOffset: new Vector3(),
        rayDir: new Vector3(1, 1, 1).normalize()
    }

    chart?: Chart;

    constructor() {
        this.updateGui();
    }

    pow = Math.pow;
    exp = Math.exp;

    updateGui() {
        this.gui.add(this.params, 'iterations').min(1).max(5).step(1).name('Iterations (10^x)');

        const tableFolder = this.gui.addFolder('Table');
        tableFolder.add(this.params, 'height').min(-3).max(3).name('Thickness (e^x)');
        tableFolder.open();

        const rayFolder = this.gui.addFolder('Ray');
        rayFolder.add(this.params.rayOffset, 'x').min(-3).max(3).name('x').onChange(this.updateRay.bind(this));
        rayFolder.add(this.params.rayOffset, 'y').min(-3).max(3).name('y').onChange(this.updateRay.bind(this));
        rayFolder.add(this.params.rayOffset, 'z').min(-3).max(3).name('z').onChange(this.updateRay.bind(this));
    }

    projectToSphere: (v: Vector3) => Vector3 = (v: Vector3) => {
        if (v.length() === 0) return new Vector3(1, 1, 1).normalize();
        return v.normalize();
    }

    updateRay() {
        this.ray = new Ray(this.params.rayOffset, this.params.rayDir);
    }

    newRayDirection(v: Vector3) {
        this.params.rayDir.set(v.x, v.y, v.z);
        this.updateRay();
    }

    ngOnDestroy() {
        this.gui.destroy();
    }

    newVertices(vertices: Vector2[]) {
        this.vertices = vertices;
    }

    onNewResults(results: Data[]) {
        const canvas = document.getElementById('chart');
        if (!canvas) {
            console.error('Missing canvas element');
            return;
        }

        Chart.defaults.color = '#ffffff';
        // Chart.defaults.borderColor = '#36A2EB1';

        const datasets = [];

        datasets.push({
            label: 'Side A',
            data: results.map(row => row.aCount)
        });

        const config: ChartConfiguration = {
            type: 'line',
            options: {
                animation: {
                    duration: 0
                }
            },
            data: {
                labels: results.map(row => row.iteration),
                datasets: datasets,
            }
        };

        if (!this.chart) {
            this.chart = new Chart((canvas as HTMLCanvasElement), config);
        } else {
            this.chart.config.data = config.data;
            this.chart.update();
        }
    }
}

