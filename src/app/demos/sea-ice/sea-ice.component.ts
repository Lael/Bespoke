import {AfterViewInit, Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {CommonModule} from "@angular/common";
import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Light,
  Matrix3,
  Mesh,
  MeshPhysicalMaterial,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Vector2,
  Vector3
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {IceNoise2D, Noise2DV, RidgeNoise2D, SimplexNoise2D} from "./noise";
import {Chart} from "chart.js/auto";
import {ChartConfiguration} from "chart.js";
// import annotationPlugin from 'chartjs-plugin-annotation';

const MESH_SIZE: number = 16;
const MESH_POWER: number = 10;
const MESH_RES: number = 1 << MESH_POWER;
const MELT_DT: number = 0.01;
const MELT_SPEED: number = 0.1;
const CELLS: number = (MESH_RES + 1) * (MESH_RES + 1);

function index(i: number, j: number): number {
  return i * (MESH_RES + 1) + j;
}

function col(index: number): number {
  return Math.floor(index / (MESH_RES + 1));
}

function row(index: number): number {
  return index % (MESH_RES + 1);
}

interface DataRow {
  level: number;
  proportionCovered: number;
  minima: number;
  saddles: number;
  maxima: number;
  ponds: number;
  euler: number;
  perimeter: number;
  area: number;
  iq: number;
  fractalDimension: number;
  percolates: number;
}

@Component({
  selector: 'sea-ice',
  templateUrl: './sea-ice.component.html',
  styleUrls: ['./sea-ice.component.sass'],
  standalone: true,
  imports: [CommonModule]
})
export class SeaIceComponent extends ThreeDemoComponent implements AfterViewInit {
  private iceMesh: Mesh;
  private waterMesh: Mesh;
  private lights: Light[] = [];
  private sun: DirectionalLight | PointLight;
  private orbitControls: OrbitControls;
  private iceNoise: IceNoise2D;
  private time: number = 0;

  private vertices: Vector3[] = [];
  // Collections of special vertex indices
  private topEdge: Set<number> = new Set();
  private bottomEdge: Set<number> = new Set();
  private minima: Set<number> = new Set();
  private saddles: Set<number> = new Set();
  private maxima: Set<number> = new Set();

  private topEdgePoints: Points;
  private bottomEdgePoints: Points;
  private minimumPoints: Points;
  private saddlePoints: Points;
  private maximumPoints: Points;

  private minLevel: number;
  private maxLevel: number;
  private level: number = 0;

  private indicesSorted: number[];

  private data: DataRow[] = [];
  private done: boolean = false;
  private flooded: Set<number> = new Set();

  private canvas1: HTMLCanvasElement | null = null;
  private canvas2: HTMLCanvasElement | null = null;
  private chart1?: Chart;
  private chart2?: Chart;
  private chartConfig: ChartConfiguration = {
    type: 'line',
    options: {
      animation: {
        duration: 0
      },
    },
    data: {
      labels: this.data.map(row => Math.round(row.level * 100) / 100),
      datasets: [],
    }
  };

  constructor() {
    super();
    this.iceNoise = new IceNoise2D([
      {noises: [new SimplexNoise2D(0.125)], weight: 0.5},
      {noises: [new SimplexNoise2D(0.5)], weight: 0.1},
      {noises: [new SimplexNoise2D(4)], weight: 0.01},
      // {noises: [new SimplexNoise2D(0.5)], weight: 0.2},
      // {noises: [new SimplexNoise2D(1)], weight: 0.1},
      // {noises: [new SimplexNoise2D(5)], weight: 0.01},
      // {noises: [new SimplexNoise2D(25)], weight: 0.001},
      {
        noises: [
          new RidgeNoise2D(new Matrix3().rotate(Math.random()).multiplyScalar(0.1), 5),
          new RidgeNoise2D(new Matrix3().rotate(Math.random()).multiplyScalar(0.1), 5),
        ],
        weight: 0.5,
        sampleNoise: new Noise2DV(5),
        sampleNoiseWeight: 0.05,
      },
      {
        noises: [
          new RidgeNoise2D(new Matrix3().rotate(Math.random()).multiplyScalar(0.1), 5),
          new RidgeNoise2D(new Matrix3().rotate(Math.random()).multiplyScalar(0.1), 5),
        ],
        weight: -0.5,
        sampleNoise: new Noise2DV(5),
        sampleNoiseWeight: 0.05,
      },
      // {
      //   noises: [
      //     new RidgeNoise2D(new Matrix3().rotate(Math.random()).multiplyScalar(0.05), 5),
      //   ],
      //   weight: 0.4,
      //   sampleNoise: new Noise2DV(5),
      //   sampleNoiseWeight: 0.05,
      // },
      // {
      //   noises: [
      //     new RidgeNoise2D(new Matrix3().rotate(Math.random()).multiplyScalar(2), 5),
      //   ],
      //   weight: 0.1,
      //   sampleNoise: new Noise2DV(100),
      //   sampleNoiseWeight: 0.001,
      // },
      // {
      //   noises: [
      //     new RidgeNoise2D(new Matrix3().rotate(Math.random()).multiplyScalar(3), 5),
      //   ],
      //   weight: 0.01,
      //   sampleNoise: new Noise2DV(100),
      //   sampleNoiseWeight: 0.001,
      // },
    ]);
    this.colorScheme.register("clear", 0x001144, 0x001144);
    const indices = [];
    const position = [];

    this.minLevel = Number.POSITIVE_INFINITY;
    this.maxLevel = Number.NEGATIVE_INFINITY;

    for (let i = 0; i <= MESH_RES; i++) {
      const x = (i / MESH_RES - 0.5) * MESH_SIZE;
      for (let j = 0; j <= MESH_RES; j++) {
        const y = (j / MESH_RES - 0.5) * MESH_SIZE;
        const z = this.iceNoise.noise(new Vector2(x, y));
        const v = new Vector3(x, y, z);
        this.vertices.push(v);

        this.minLevel = Math.min(z, this.minLevel);
        this.maxLevel = Math.max(z, this.maxLevel);

        position.push(v.x, v.y, v.z);
        if (i === 0 || j === 0) continue;
        const ll = index(i - 1, j - 1);
        const ul = index(i - 1, j);
        const ur = index(i, j);
        const lr = index(i, j - 1);
        const llz = this.vertices[ll].z;
        const ulz = this.vertices[ul].z;
        const urz = this.vertices[ur].z;
        const lrz = this.vertices[lr].z;
        if (llz + urz >= ulz + lrz) {
          indices.push(
            ll, lr, ur,
            ur, ul, ll
          );
        } else {
          indices.push(
            ul, ll, lr,
            lr, ur, ul
          );
        }
      }
    }
    const geometry = new BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(position), 3));
    // const geometry = new PlaneGeometry(MESH_SIZE, MESH_SIZE, MESH_RES, MESH_RES);
    // const pos = geometry.attributes["position"];
    // for (let i = 0; i < pos.count; i++) {
    //   const x = pos.getX(i);
    //   const y = pos.getY(i);                      // after the rotation, Z is “plane v”
    //   const z = this.iceNoise.noise(new Vector2(x * 0.05, y * 0.05));
    //   pos.setZ(i, z);
    // }
    // pos.needsUpdate = true;
    geometry.computeVertexNormals();
    const material = new MeshPhysicalMaterial({
      color: 0x99ccff,
      specularColor: 0xffffff,
      specularIntensity: 10,
      // wireframe: true,
      side: DoubleSide
    });
    this.iceMesh = new Mesh(geometry, material);
    const group = new Group();
    group.add(this.iceMesh);
    this.useOrthographic = false;

    this.sun = new PointLight(0xffffdd, 5, 0, 0);
    this.sun.position.set(10, 10, 10);
    this.lights.push(this.sun);
    this.lights.push(new AmbientLight(0xddddff));

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    if (this.lights.length > 0) this.scene.add(...this.lights);

    this.categorizeVertices();
    const pmp = {color: 0xff00ff, size: 5, sizeAttenuation: false};
    this.bottomEdgePoints = new Points(
      new BufferGeometry().setFromPoints([...this.bottomEdge].map(idx => this.vertices[idx].clone())),
      new PointsMaterial({...pmp, color: 0xff00ff}));
    this.topEdgePoints = new Points(
      new BufferGeometry().setFromPoints([...this.topEdge].map(idx => this.vertices[idx].clone())),
      new PointsMaterial({...pmp, color: 0x00ffff}));
    this.minimumPoints = new Points(
      new BufferGeometry().setFromPoints([...this.minima].map(idx => this.vertices[idx].clone())),
      new PointsMaterial({...pmp, color: 0x4444ff}));
    this.saddlePoints = new Points(
      new BufferGeometry().setFromPoints([...this.saddles].map(idx => this.vertices[idx].clone())),
      new PointsMaterial({...pmp, color: 0x00ff00}));
    this.maximumPoints = new Points(
      new BufferGeometry().setFromPoints([...this.maxima].map(idx => this.vertices[idx].clone())),
      new PointsMaterial({...pmp, color: 0xff0000}));

    // group.add(this.bottomEdgePoints, this.topEdgePoints, this.minimumPoints, this.saddlePoints, this.maximumPoints);

    this.waterMesh = new Mesh(
      new PlaneGeometry(MESH_SIZE, MESH_SIZE, 1, 1),
      new MeshPhysicalMaterial({
        color: 0x01305E,
        // specularColor: 0xffffff,
        // specularIntensity: 1,
        transparent: true,
        opacity: 0.75,
      })
    );
    group.add(this.waterMesh);

    group.rotateX(-Math.PI / 2);
    this.scene.add(group);

    this.renderer.setClearColor(this.getColor("clear"));

    this.level = this.minLevel - 0.01;
    this.waterMesh.position.setZ(this.level);
    this.indicesSorted = [];
    for (let i = 0; i < CELLS; i++) this.indicesSorted.push(i);
    this.indicesSorted.sort((i, j) => this.vertices[i].z - this.vertices[j].z);
  }

  override ngAfterViewInit() {
    super.ngAfterViewInit();

    this.canvas1 = document.getElementById("chart1") as HTMLCanvasElement;
    this.canvas2 = document.getElementById("chart2") as HTMLCanvasElement;

    if (this.canvas1 === null) console.error("Could not initialize chart");
    if (this.canvas2 === null) console.error("Could not initialize chart");
    Chart.defaults.color = '#ffffff';
    this.chart1 = new Chart((this.canvas1 as HTMLCanvasElement),
      this.chartConfig,
    );
    this.chart2 = new Chart((this.canvas2 as HTMLCanvasElement),
      this.chartConfig,
    );
    this.redrawChart();
  }

  categorizeVertices() {
    for (let i = 1; i < MESH_RES; i++) {
      for (let j = 1; j < MESH_RES; j++) {
        const ind = index(i, j);
        const height = this.vertices[ind].z;
        const nhs = [
          index(i - 1, j),
          index(i - 1, j - 1),
          index(i, j - 1),
          index(i + 1, j - 1),
          index(i + 1, j),
          index(i + 1, j + 1),
          index(i, j + 1),
          index(i - 1, j + 1),
        ].map(idx => height - this.vertices[idx].z);
        let minimum = true;
        let maximum = true;
        for (let nh of nhs) {
          if (nh < 0) maximum = false;
          if (nh > 0) minimum = false;
        }
        if (maximum) this.maxima.add(ind);
        if (minimum) this.minima.add(ind);
        // TODO: saddles are sometimes missing
        if (nhs[0] > 0 && nhs[2] < 0 && nhs[4] > 0 && nhs[6] < 0) this.saddles.add(ind);
        else if (nhs[0] < 0 && nhs[2] > 0 && nhs[4] < 0 && nhs[6] > 0) this.saddles.add(ind);
        else if (nhs[1] > 0 && nhs[3] < 0 && nhs[5] > 0 && nhs[7] < 0) this.saddles.add(ind);
        else if (nhs[1] < 0 && nhs[3] > 0 && nhs[5] < 0 && nhs[7] > 0) this.saddles.add(ind);

        // let sign = Math.sign(nhs[0]);
        // let flips = 0;
        // for (let nh of nhs) {
        //   if (Math.sign(nh) !== sign) flips++;
        //   sign = Math.sign(nh);
        // }
        // if (flips > 3) this.saddles.add(ind);
      }
    }
    for (let i = 0; i <= MESH_RES; i++) {
      this.bottomEdge.add(index(i, 0));
      this.topEdge.add(index(i, MESH_RES));
    }
  }

  frame(dt: number): void {
    this.time += dt;
    // this.sun.position.set(
    //   10 * Math.cos(this.time),
    //   10,
    //   10 * Math.sin(this.time),
    // );
    if (this.keyHeld("Space")) {
      if (this.done) {
        this.level += dt * MELT_SPEED * (this.keyHeld("ShiftLeft") ? -1 : 1);
        console.log(this.level);
      } else {
        this.level += MELT_DT;
        this.computePonds();
      }
      if (this.level > this.maxLevel + 0.01) {
        this.level = this.minLevel - 0.01;
        this.done = true;
      }
      this.waterMesh.position.setZ(this.level);
      this.redrawChart();
    }
  }

  computePonds() {
    let cellsCovered = 0;
    let minima = 0;
    let saddles = 0;
    let maxima = 0;
    let perimeter = 0;
    let area = 0;
    const submerged = [];
    for (let i = 0; i < CELLS; i++) {
      const idx = this.indicesSorted[i];
      if (this.vertices[idx].z > this.level) break;
      submerged.push(idx);
      if (this.minima.has(idx)) minima++;
      if (this.saddles.has(idx)) saddles++;
      if (this.maxima.has(idx)) maxima++;
      if (!this.flooded.has(idx)) perimeter += this.perimeterContribution(idx);
      area += 1;
    }

    const ponds = this.findPonds(submerged);
    const percolates = this.percolates(ponds) ? 1 : 0;
    const fractalDimension = this.fractalDimension(new Set(submerged));

    this.data.push({
      level: this.level,
      proportionCovered: cellsCovered / CELLS,
      minima,
      saddles,
      maxima,
      euler: minima / this.minima.size - 2 * saddles / this.saddles.size + maxima / this.maxima.size,
      ponds: ponds.length,
      perimeter,
      area,
      iq: perimeter * perimeter / (4 * Math.PI * area),
      fractalDimension,
      percolates,
    });
  }

  redrawChart() {
    const data = this.data.filter(row => row.level <= this.level);
    const datasets1 = [];
    const datasets2 = [];
    let maxPonds = 1;
    let maxArea = 1;
    let maxPerimeter = 1;
    let maxIQ = 1;
    let maxMin = 1;
    let maxSaddles = 1;
    let maxMax = 1;
    let maxEuler = 0.001;
    for (let row of this.data) {
      maxPonds = Math.max(maxPonds, row.ponds)
      maxArea = Math.max(maxArea, row.area)
      maxPerimeter = Math.max(maxPerimeter, row.perimeter)
      maxIQ = Math.max(maxIQ, row.iq)
      maxMin = Math.max(maxMin, row.minima)
      maxSaddles = Math.max(maxSaddles, row.saddles)
      maxMax = Math.max(maxMax, row.maxima)
      maxEuler = Math.max(maxEuler, Math.abs(row.euler))
    }
    // datasets1.push({
    //   label: 'Area',
    //   data: this.data.map(row => row.area / maxArea)
    // });
    // datasets1.push({
    //   label: 'Perimeter',
    //   data: this.data.map(row => row.perimeter / maxPerimeter)
    // });
    datasets1.push({
      label: 'IQ',
      data: data.map(row => row.iq / maxIQ)
    });
    datasets2.push({
      label: 'Minima',
      data: data.map(row => row.minima / this.minima.size)
    });
    datasets2.push({
      label: 'Saddles',
      data: data.map(row => row.saddles / this.saddles.size)
    });
    datasets2.push({
      label: 'Maxima',
      data: data.map(row => row.maxima / this.maxima.size)
    });
    datasets2.push({
      label: 'Euler Char.',
      data: data.map(row => row.euler / maxEuler)
    });
    datasets1.push({
      label: 'Ponds',
      data: data.map(row => row.ponds / maxPonds)
    });
    datasets1.push({
      label: 'Df',
      data: data.map(row => row.fractalDimension)
    });
    datasets2.push({
      label: 'Percolates',
      data: data.map(row => row.percolates)
    });

    this.chartConfig.options = {
      animation: {
        duration: 0
      },
    };
    const chartData1 = {
      labels: this.data.map(row => Math.round(row.level * 100) / 100),
      datasets: datasets1,
    };
    const chartData2 = {
      labels: this.data.map(row => Math.round(row.level * 100) / 100),
      datasets: datasets2,
    };

    if (this.chart1) {
      this.chart1.config.data = chartData1;
      this.chart1.update();
    }
    if (this.chart2) {
      this.chart2.config.data = chartData2;
      this.chart2.update();
    }
  }

  perimeterContribution(idx: number): number {
    const i = col(idx);
    const j = row(idx);
    if (i === 0 || j === 0 || i === MESH_RES || j === MESH_RES) return 0;
    const nhs = [
      this.vertices[index(i - 1, j)].z > this.level,
      this.vertices[index(i, j - 1)].z > this.level,
      this.vertices[index(i + 1, j)].z > this.level,
      this.vertices[index(i, j + 1)].z > this.level,
    ];
    let ct = 0;
    for (let nh of nhs) if (nh) ct++;
    if (ct === 0) {
      this.flooded.add(idx);
      return 0;
    }
    return 1;
  }

  findPonds(submerged: number[]): Set<number>[] {
    const submergedSet = new Set<number>(submerged);
    const ponds = [];
    while (submergedSet.size > 0) {
      const pond = new Set<number>();
      const v = submergedSet.values().next().value;
      if (v === undefined) throw Error('set popped undefined');
      let frontier = new Set<number>([v]);
      submergedSet.delete(v);
      pond.add(v);
      while (frontier.size > 0) {
        let newFrontier = new Set<number>();
        for (let f of frontier) {
          // check all neighbors of f
          const i = col(f);
          const j = row(f);
          const neighbors = [];
          if (i > 0) neighbors.push(index(i - 1, j));
          if (j > 0) neighbors.push(index(i, j - 1));
          if (j < MESH_RES) neighbors.push(index(i + 1, j));
          if (j < MESH_RES) neighbors.push(index(i, j + 1));
          for (let n of neighbors) {
            if (submergedSet.has(n) && !pond.has(n) && !frontier.has(n)) {
              submergedSet.delete(n);
              newFrontier.add(n);
              pond.add(n);
            }
          }
        }
        frontier = newFrontier;
      }
      ponds.push(pond);
    }
    return ponds;
  }

  percolates(ponds: Set<number>[]): boolean {
    for (let pond of ponds) {
      let bottom = false;
      let top = false;
      for (let idx of pond) {
        if (this.bottomEdge.has(idx)) bottom = true;
        if (this.topEdge.has(idx)) top = true;
        if (bottom && top) return true;
      }
    }
    return false;
  }

  fractalDimension(submergedSet: Set<number>): number {
    const boxCounts: number[][][] = [];
    for (let scale = 0; scale <= MESH_POWER; scale++) {
      const box = [];
      for (let i = 0; i < MESH_RES >> scale; i++) {
        const col = [];
        for (let j = 0; j < MESH_RES >> scale; j++) {
          col.push(0);
        }
        box.push(col);
      }
      boxCounts.push(box)
    }
    for (let i = 0; i < MESH_RES; i++) {
      for (let j = 0; j < MESH_RES; j++) {
        const ll = submergedSet.has(index(i, j));
        const lr = submergedSet.has(index(i + 1, j));
        const ul = submergedSet.has(index(i, j + 1));
        const ur = submergedSet.has(index(i + 1, j + 1));
        if (ll === lr && lr === ul && ul === ur) continue;

        for (let scale = 0; scale <= MESH_POWER; scale++) {
          boxCounts[scale][i >> scale][j >> scale] = 1;
        }
      }
    }
    const totalCounts = [];
    for (let scale = 0; scale <= MESH_POWER; scale++) {
      let s = 0;
      for (let col of boxCounts[scale]) {
        for (let v of col) {
          s += v;
        }
      }
      totalCounts.push(s);
    }
    let tr = 0;
    for (let scale = 0; scale < MESH_POWER; scale++) {
      const eps = 1 / (1 << scale);
      tr += Math.log(totalCounts[scale] / totalCounts[scale + 1]) / Math.log(2);
    }
    let fd = Math.max(Math.min(tr / MESH_POWER, 2), 1);
    if (Number.isNaN(fd)) fd = 1;
    return fd;
  }
}