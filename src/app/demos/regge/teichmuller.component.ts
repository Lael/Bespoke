import {AfterViewInit, Component, OnDestroy} from "@angular/core";
import {CommonModule} from "@angular/common";
import {GUI} from "dat.gui";
import Stats from "three/examples/jsm/libs/stats.module.js";
import {TorusComponent} from "./torus.component";
import {HalfplaneComponent} from "./halfplane.component";
import {Complex} from "../../../math/complex";

const MAX_TIME = 4;
const SPEED = 0.5;

@Component({
    selector: 'teichmuller',
    templateUrl: './teichmuller.component.html',
    styleUrls: ['./teichmuller.component.sass'],
    imports: [CommonModule, HalfplaneComponent, TorusComponent],
    standalone: true,
})
export class TeichmullerComponent implements OnDestroy, AfterViewInit {
    params = {
        alpha: 2,
        beta: 0,
        t: 0,
        quotient: false,
        tau1: 0,
        tau2: 2,
    }

    stats: Stats;
    gui: GUI = new GUI();
    private old: number;

    keysPressed = new Map<string, boolean>();
    dirty = true;

    constructor() {
        this.updateGUI();
        document.addEventListener('keydown', this.keydown.bind(this));
        document.addEventListener('keyup', this.keyup.bind(this));

        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);
        this.old = Date.now();
    }

    ngOnDestroy(): void {
        document.body.removeChild(this.stats.dom);
        this.gui.destroy();
        document.removeEventListener('keydown', this.keydown.bind(this));
        document.removeEventListener('keyup', this.keyup.bind(this));
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new GUI();
        const modulusFolder = this.gui.addFolder('Modulus');
        modulusFolder.add(this.params, 'alpha').name('α')
            .min(0.1).max(3).step(0.1).onChange(() => {
            this.dirty = true
        });
        modulusFolder.add(this.params, 'beta').name('β')
            .min(-0.5).max(0.5).step(0.01).onChange(() => {
            this.dirty = true
        });
        modulusFolder.add(this.params, 't').min(-MAX_TIME).max(MAX_TIME).step(0.01).onChange(() => {
            this.dirty = true
        });
        modulusFolder.add(this.params, 'quotient').name('Quotient').onChange(() => {
            this.dirty = true
        });
        modulusFolder.open();
        this.gui.open();
    }

    frame(dt: number): void {
        this.handleInput(dt);
        if (this.dirty) {
            this.dirty = false;
            this.params.tau1 = this.params.beta + this.params.alpha * Math.tanh(this.params.t);
            this.params.tau2 = this.params.alpha / Math.cosh(this.params.t);
            if (this.params.quotient) {
                let moved = false;
                do {
                    moved = false;
                    while (this.params.tau1 > 0.5) {
                        this.params.tau1 -= 1;
                        moved = true;
                    }
                    while (this.params.tau1 < -0.5) {
                        this.params.tau1 += 1;
                        moved = true;
                    }
                    let c = new Complex(this.params.tau1, this.params.tau2);
                    if (c.modulusSquared() < 1) {
                        c = new Complex(-1, 0).over(c);
                        this.params.tau1 = c.x;
                        this.params.tau2 = c.y;
                        moved = true;
                    }
                } while (moved);
            }
        }
    }

    handleInput(dt: number) {
        if (this.keyHeld('Space')) {
            let slow = this.keyHeld('ShiftLeft') ? 0.1 : 1;
            this.params.t += dt * SPEED * slow;
            if (this.params.t > MAX_TIME) this.params.t -= 2 * MAX_TIME;
            if (this.params.t < -MAX_TIME) this.params.t += 2 * MAX_TIME;
            this.dirty = true;
            this.updateGUI();
        }
    }

    keydown(e: KeyboardEvent) {
        this.keysPressed.set(e.code, true);
    }

    keyup(e: KeyboardEvent) {
        this.keysPressed.set(e.code, false);
    }

    keyHeld(code: string): boolean {
        return this.keysPressed.get(code) === true;
    }

    ngAfterViewInit(): void {
        this.loop();
    }

    loop() {
        this.stats.update();
        const now = Date.now();
        this.frame((now - this.old) / 1000);
        this.old = now;
        window.requestAnimationFrame(this.loop.bind(this));
    }
}