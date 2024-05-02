import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {HyperbolicModel, HyperPoint} from "../../../math/hyperbolic/hyperbolic";
import * as dat from 'dat.gui';
import {Complex} from "../../../math/complex";
import {CommonModule} from "@angular/common";


type EllipticPoint = {
    value: number;
}

type PoincareSignature = {
    g: number;
    r: number;
    m: EllipticPoint[];
    s: number;
};

type Params = {
    t: number,
    model: HyperbolicModel,
}

@Component({
    selector: 'poincare',
    template: '',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class PoincareComponent extends ThreeDemoComponent {
    gui: dat.GUI;
    params: Params = {
        t: 0.5,
        model: HyperbolicModel.POINCARE,
    };
    signature: PoincareSignature = {
        g: 4,
        r: 2,
        s: 2,
        m: [{value: 2}, {value: 4}],
    };

    constructor() {
        super();
        this.gui = new dat.GUI();

        this.resetGUI();
    }

    resetGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();

        const signatureFolder = this.gui.addFolder('Signature');
        signatureFolder.add(this.signature, 'g').name('Genus')
            .min(0).max(4).step(1)
            .onFinishChange(this.signatureChanged.bind(this));
        signatureFolder.add(this.signature, 'r').name('# elliptic pts')
            .min(0).max(4).step(1)
            .onFinishChange(this.rChanged.bind(this));
        signatureFolder.add(this.signature, 's').name('# cusps')
            .min(0).max(4).step(1)
            .onFinishChange(this.signatureChanged.bind(this));

        for (let i = 0; i < this.signature.r; i++) {
            signatureFolder.add(this.signature.m[i], 'value').name(`m_${i}`)
                .min(2).max(12).step(1)
                .onFinishChange(this.signatureChanged.bind(this));
        }

        signatureFolder.open();

        const drawFolder = this.gui.addFolder('Draw Params');
        drawFolder.add(this.params, 't').name('t').min(0.01).max(0.99);
        drawFolder.open();
    }

    frame(): void {
    }

    rChanged() {
        const mis = [];
        for (let i = 0; i < this.signature.r; i++) {
            mis.push({value: 2 + 2 * i});
        }
        this.signature.m = mis;
        this.resetGUI();
        this.signatureChanged();
    }

    signatureChanged() {
        const points: HyperPoint[] = [];
        const dTheta = -2 * Math.PI / (4 * this.signature.g + this.signature.r + this.signature.s);
        const n = 4 * this.signature.g + this.signature.r + this.signature.s;
        for (let i = 0; i < n; i++) {
            points.push(HyperPoint.fromPoincare(Complex.polar(this.params.t, i * dTheta)));
        }
        let offset = 4 * this.signature.g;
        for (let i = 0; i < this.signature.r; i++) {
            points.push(HyperPoint.fromPoincare(
                Complex.polar(this.params.t, (offset + i) * dTheta)
            ));
            points.push(HyperPoint.fromPoincare(
                Complex.polar(isoscelesRadius(this.params.t, n, this.signature.m[i].value),
                    (offset + i + 0.5) * dTheta)
            ));
        }
        offset += this.signature.r;
        for (let i = 0; i < this.signature.s; i++) {
            points.push(HyperPoint.fromPoincare(
                Complex.polar(this.params.t, (offset + i) * dTheta)
            ));
            points.push(HyperPoint.fromPoincare(
                Complex.polar(1,
                    (4 * this.signature.g + i + 0.5) * dTheta)
            ));
        }
    }
}

function isoscelesRadius(t: number, n: number, mi: number): number {
    const central = Math.PI / n;
    const pt = HyperPoint.poincareToTrue(t);
    return 0.75;
}