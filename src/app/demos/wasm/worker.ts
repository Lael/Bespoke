class WasmWorker {
  constructor(readonly canvas: OffscreenCanvas) {
    console.log('got the canvas:', canvas);
  }

  resize(w: number, h: number) {
    console.log(`resizing: ${w}x${h}`);
    this.canvas.width = w;
    this.canvas.height = h;
  }
}

let wasmWorker: WasmWorker;

self.addEventListener('message', (ev) => {
  console.log('getting a message');
  switch (ev.data.type) {
  case 'init':
    try {
      wasmWorker = (ev.data.offscreenCanvas);
    } catch (err) {
      console.error(`Error while initializing WebGPU in worker process: ${err}`);
    }
    break;
  case 'resize':
    try {
      wasmWorker.resize(ev.data.w, ev.data.h);
    } catch (err) {
      console.error(`Error while resizing canvas in worker process: ${err}`);
    }
  }
});