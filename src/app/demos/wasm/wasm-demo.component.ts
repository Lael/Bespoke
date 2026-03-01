import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild} from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  templateUrl: './wasm-demo.component.html',
  styleUrl: './wasm-demo.component.sass',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WasmDemoComponent implements AfterViewInit {
  @ViewChild("renderer_container") canvas!: ElementRef<HTMLCanvasElement>;

  wasmWorker!: Worker;

  ngAfterViewInit() {
    this.wasmWorker = new Worker(new URL('./worker.js', import.meta.url));

    this.wasmWorker.addEventListener('message', (event) => {
      switch (event.data.type) {
      default:
        console.error('Unknown message from WASM worker: ', event.data);
      }
    });

    const el = this.canvas.nativeElement;

    const offscreenCanvas = el.transferControlToOffscreen();
    const devicePixelRatio = window.devicePixelRatio;
    offscreenCanvas.width = el.clientWidth * devicePixelRatio;
    offscreenCanvas.height = el.clientHeight * devicePixelRatio;
    this.wasmWorker.postMessage({type: 'init', offscreenCanvas}, [offscreenCanvas]);
  }

  onResize() {
    const el = this.canvas.nativeElement;
    const devicePixelRatio = window.devicePixelRatio;
    const w = el.clientWidth * devicePixelRatio;
    const h = el.clientHeight * devicePixelRatio;
    console.log(`Resize: ${w}x${h}`);
    this.wasmWorker.postMessage({type: 'resize', w, h});
  }
}