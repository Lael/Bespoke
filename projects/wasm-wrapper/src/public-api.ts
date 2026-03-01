/*
 * Public API Surface of wasm-wrapper
 */

import init from './lib/bespoke-wasm/pkg';

export {get_factorial} from './lib/bespoke-wasm/pkg';
export {init as initBespokeRust} ;