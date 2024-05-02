import {Component} from '@angular/core';
import {WindowPaneComponent} from "../../../widgets/window-pane/window-pane.component";
import {MultiArc, MultiArcSpec} from "../../../../graphics/shapes/multi-path";
import {Complex} from "../../../../math/complex";
import {Color} from "../../../../graphics/shapes/color";
import {OrthographicCamera} from "../../../../graphics/camera/orthographic-camera";
import {CommonModule} from "@angular/common";

@Component({
    selector: 'function-view',
    templateUrl: '../../../widgets/window-pane/window-pane.component.html',
    styleUrls: ['../../../widgets/window-pane/window-pane.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class FunctionViewComponent extends WindowPaneComponent {

    private static readonly SAMPLE_DENSITY = 100;
    private static readonly X_LO = 0;
    private static readonly X_HI = 1;

    constructor() {
        super();
    }

    override init() {
        super.init();
        const samples: Complex[] = [];

        this.camera = new OrthographicCamera();
        this.camera.setZoom(Math.sqrt(2) / 0.9);

        for (let x = FunctionViewComponent.X_LO; x <= FunctionViewComponent.X_HI; x += 1 / FunctionViewComponent.SAMPLE_DENSITY) {
            samples.push(new Complex(x, this.evaluateFunction(x)));
        }

        const graph = new MultiArc(this.gl, new MultiArcSpec([samples], Color.BLACK));

        const traces: Complex[] = [];
        let x = 1 / Math.PI;
        for (let i = 0; i < 100; i++) {
            const image = this.evaluateFunction(x);
            traces.push(new Complex(x, image));
            traces.push(new Complex(image, image));
            x = image;
        }

        const trace = new MultiArc(this.gl, new MultiArcSpec([traces], Color.BLUE))

        this.scene.set('graph', graph);
        this.scene.set('trace', trace);
    }

    evaluateFunction(x: number): number {
        const h = 31 / 32;
        return Math.min(h, 1 - 2 * Math.abs(x - 0.5));
    }
}
