import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {BufferGeometry, CircleGeometry, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, Vector2} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";

@Component({
    selector: 'rotation',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class RotationComponent extends ThreeDemoComponent {

    orbitControls: OrbitControls;
    dirty = true;

    constructor() {
        super();
        this.useOrthographic = true;
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.zoomToCursor = true;
        this.orbitControls.enableRotate = false;
        this.orbitControls.enablePan = true;
        this.renderer.setClearColor(0x0a2933);
    }


    frame(dt: number): void {
        if (this.dirty) {
            this.dirty = false;
            this.scene.clear();
            this.updateTable();
        }
    }

    updateTable() {
        let cfe = [1, 1];
        const rows = 10;
        const cols = 4;
        for (let i = 0; i < rows; i++) {
            const alpha = cfeToNumber(cfe);
            console.log(cfe, alpha);
            if (i < rows - 1) cfe = iterate(cfe);
            for (let j = 0; j < cols; j++) {
                const center = new Vector2(cols - 1 - 2 * j, 2 * i + 1 - rows).multiplyScalar(-1.5);
                const circle = new Mesh(new CircleGeometry(1, 180), new MeshBasicMaterial());
                circle.position.set(center.x, center.y, 0);
                this.scene.add(circle);
                const lsv = [];
                for (let step = 0; step < Math.pow(10, j + 1); step++) {
                    lsv.push(step * alpha, (step + 1) * alpha);
                }
                const lines = new LineSegments(new BufferGeometry().setFromPoints(lsv.map(
                    v => new Vector2(Math.cos(Math.PI * v), Math.sin(Math.PI * v))
                )), new LineBasicMaterial({color: 0x000000}));
                lines.position.set(center.x, center.y, 0);
                this.scene.add(lines);
            }
        }
    }
}

function iterate(cfe: number[]): number[] {
    return rlToCfe(cfeToRl(cfe));
}

function cfeToRl(cfe: number[]): string {
    let s = 'XY';
    const xy = ['X', 'Y'];
    for (let i = 0; i < cfe.length; i++) {
        const e = 1 - i % 2;
        s = s.replaceAll(xy[1 - e], xy[1 - e] + xy[e].repeat(cfe[i]));
        if (s.length > 1000) s = s.substring(0, 1000);
        // sX = sX.replaceAll(xy[1 - e], xy[1 - e] + xy[e].repeat(cfe[i]));
        // sY = sY.replaceAll(xy[1 - e], xy[1 - e] + xy[e].repeat(cfe[i]));
    }
    s = s.replaceAll('X', 'LR').replaceAll('Y', 'RL');
    // sX = sX.replaceAll('X', 'LR').replaceAll('Y', 'RL');
    // sY = sY.replaceAll('X', 'LR').replaceAll('Y', 'RL');
    // console.log(rlToCfe(s), rlToCfe(sX), rlToCfe(sY));
    return s;
}

function rlToCfe(rl: string): number[] {
    if (rl.length === 0) return [];
    let current = 'R';
    let count = 0;
    const cfe = [];
    for (let i = 0; i < rl.length; i++) {
        const c = rl.charAt(i);
        if (c === current) count++;
        else {
            cfe.push(count);
            current = c;
            count = 1;
        }
    }
    cfe.push(count);
    return cfe;
}

function numberToCfe(x: number, depth: number = 0): number[] {
    console.log(x, depth);
    const f = Math.floor(x);
    const r = x - f;
    if (r < 0.000_000_1 || depth >= 20) return [f];
    return [f].concat(numberToCfe(1 / r, depth + 1));
}

function cfeToNumber(cfe: number[]): number {
    if (cfe.length === 0) return 0;
    if (cfe.length === 1) return cfe[0];
    return cfe[0] + 1 / cfeToNumber(cfe.slice(1));
}

// function alphas(cfe: number[]): number[] {
//     const alphas = [];
//     for (let i = 1; i < cfe.length; i++) {
//         alphas.push(cfeToNumber(cfe.slice(0, i)));
//     }
//     return alphas;
// }