import {Component, OnDestroy, ViewChild} from "@angular/core";
import {PolygonRestriction} from "../../widgets/polygon-picker.component";
import {GUI} from "dat.gui";
import {Vector2} from "three";
import {CommonModule} from "@angular/common";
import {AffineNormalizationComponent} from "./affine-normalization.component";
import {SymplecticTableComponent} from "./symplectic-table.component";

const IMAGE_EDGE_WIDTH = 1;
const FINAL_EDGE_WIDTH = 2;

@Component({
    selector: 'symplectic-table-container',
    templateUrl: './symplectic-table-container.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass', './symplectic-table-container.component.sass'],
    imports: [CommonModule, AffineNormalizationComponent, SymplecticTableComponent],
    standalone: true,
})
export class SymplecticTableContainerComponent implements OnDestroy {
    params = {
        n: 6,
        iterations: 100,
        everyOther: true,
        showAffine: true,
        rescale: true,
        convex: true,
        inner: true,
        vertices: true,
        edges: true,
        normalize: true,
        projective: false,
    }

    iterates?: Vector2[][] = [];
    restriction: PolygonRestriction = this.params.convex ? PolygonRestriction.CONVEX : PolygonRestriction.NONE;

    @ViewChild('tableComponent') tableComponent?: SymplecticTableComponent;

    gui: GUI;

    constructor() {
        this.gui = new GUI();
        this.updateGUI();
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new GUI();

        this.gui.add(this.params, 'n').min(3).max(24).step(1).onChange(() => {
            this.tableComponent?.reset(this.params.n, 0, 0);
            this.tableComponent?.markDirty();
        })
        this.gui.add(this.params, 'iterations').name('Iterations').min(0).max(1000).step(1).onFinishChange(() => {
            this.tableComponent?.markDirty();
        });
        this.gui.add(this.params, 'everyOther').name('Hide every other').onFinishChange(() => {
            this.tableComponent?.markDirty();
        });
        this.gui.add(this.params, 'rescale').name('Rescale').onFinishChange(() => {
            this.tableComponent?.markDirty();
        });
        this.gui.add(this.params, 'convex').name('Convex').onFinishChange(() => {
            this.restriction = this.params.convex ? PolygonRestriction.CONVEX : PolygonRestriction.NONE;
            this.tableComponent?.markDirty();
        });
        this.gui.add(this.params, 'vertices').name('Vertices').onFinishChange(() => {
            this.tableComponent?.markDirty();
        });
        this.gui.add(this.params, 'edges').name('Edges').onFinishChange(() => {
            this.tableComponent?.markDirty();
        });
        this.gui.add(this.params, 'projective').name('Projective').onFinishChange(() => {
            this.tableComponent?.markDirty();
        });
        this.gui.add(this.params, 'normalize').name('Normalize image').onFinishChange(() => {
            this.tableComponent?.markDirty();
        });
        // this.gui.add(this.params, 'inner').name('Inner').onFinishChange(() => {
        //     this.params.showAffine = this.params.inner;
        //     this.markDirty();
        // });
        this.gui.open();
    }

    ngOnDestroy() {
        this.gui.destroy();
    }

    onNewOrbit(orbit: Vector2[][]) {
        this.iterates = orbit;
    }
}
