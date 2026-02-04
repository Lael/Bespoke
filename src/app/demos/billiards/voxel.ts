import {Mesh, MeshBasicMaterial, MeshPhongMaterial, Vector3} from "three";
import {MarchingCubes} from "three/examples/jsm/objects/MarchingCubes";

const CUBE_HALF_LENGTH: number = 200;
const N_CHUNKS: number = CUBE_HALF_LENGTH / 4;
const RESOLUTION: number = 2 * CUBE_HALF_LENGTH;
const CHUNK_WIDTH = RESOLUTION / N_CHUNKS;
const OFFSET: Vector3 = new Vector3(CUBE_HALF_LENGTH, CUBE_HALF_LENGTH, CUBE_HALF_LENGTH);

export interface VoxelGrid {
  grid: number[],
  chunks: boolean[],
}

export function emptyGrid(): VoxelGrid {
  const grid: number[] = new Array(RESOLUTION * RESOLUTION * RESOLUTION).fill(0.0);
  const chunks: boolean[] = new Array(N_CHUNKS * N_CHUNKS * N_CHUNKS).fill(false);
  return {grid, chunks};
}

export function paintVoxelLine(g: VoxelGrid, v1: Vector3, v2: Vector3) {
  const start = convertToVoxelCoords(v1.multiplyScalar(0.99));
  const end = convertToVoxelCoords(v2.multiplyScalar(0.99));
  const l = Math.ceil(start.distanceTo(end) + 1);
  const steps = 3 * l;
  for (let i = 0; i <= steps; i++) {
    const pt = start.clone().lerp(end, i / steps);
    const index = vec3ToIndex(pt);
    g.grid[index] = Math.max(1.0 - Math.pow(Math.min(pt.distanceTo(pt.round()), 1), 2), g.grid[index]);
    g.chunks[vec3ToChunkIndex(pt)] = true;
  }
}

function convertToVoxelCoords(v: Vector3): Vector3 {
  return v.clone().multiplyScalar(CUBE_HALF_LENGTH).add(OFFSET);
}

function vec3ToIndex(v: Vector3): number {
  return RESOLUTION * RESOLUTION * Math.floor(v.z)
    + RESOLUTION * Math.floor(v.y)
    + Math.floor(v.x);
}

function vec3ToChunkIndex(v: Vector3): number {
  return N_CHUNKS * N_CHUNKS * Math.floor(v.z / CHUNK_WIDTH)
    + N_CHUNKS * Math.floor(v.y / CHUNK_WIDTH)
    + Math.floor(v.x / CHUNK_WIDTH);
}

export function gridToMesh(g: VoxelGrid): Mesh {
  let cells = 0;
  const mc = new MarchingCubes(RESOLUTION,
    new MeshPhongMaterial(), false, false, 20e6);
  for (let i = 0; i < N_CHUNKS; i++) {
    for (let j = 0; j < N_CHUNKS; j++) {
      for (let k = 0; k < N_CHUNKS; k++) {
        if (!g.chunks[N_CHUNKS * N_CHUNKS * k + N_CHUNKS * j + i]) continue;
        // console.log(i, j, k);
        for (let l = 0; l < CHUNK_WIDTH; l++) {
          for (let m = 0; m < CHUNK_WIDTH; m++) {
            for (let n = 0; n < CHUNK_WIDTH; n++) {
              const x = CHUNK_WIDTH * i + l;
              const y = CHUNK_WIDTH * j + m;
              const z = CHUNK_WIDTH * k + n;
              const gridValue = g.grid[RESOLUTION * RESOLUTION * z
              + RESOLUTION * y +
              x];
              mc.setCell(x, y, z, gridValue * 150);
              if (gridValue > 0) {
                cells++;
              }
            }
          }
        }
      }
    }
  }
  console.log(`added ${cells} cells`);
  mc.update();
  // mc.scale.set();
  mc.material = new MeshBasicMaterial({color: 0x888888});
  return mc;
}