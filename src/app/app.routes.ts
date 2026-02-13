import {Routes} from '@angular/router';
import {HomePageComponent} from "./home-page/home-page.component";
import {Heidelberg2025Component} from "./talks/heidelberg-2025/heidelberg-2025.component";
import {EberlyTalkComponent} from "./talks/eberly-research-showcase/eberly-talk.component";
import {HamiltonianTalkComponent} from "./talks/hamiltonian-talk/hamiltonian-talk.component";
import {IhpBabySeminar} from "./talks/ihp-baby-seminar/ihp-baby-seminar";
import {Type} from "@angular/core";
import {ThreeDemoComponent} from "./widgets/three-demo/three-demo.component";
import {SourdoughComponent} from "./demos/sourdough/sourdough.component";
import {PentagramComponent} from "./demos/pentagram/pentagram.component";
import {BilliardsComponent} from "./demos/billiards/billiards.component";
import {MinkowskiBilliardsComponent} from "./demos/minkowski/minkowski-billiards.component";
import {OuterSymplecticComponent} from "./demos/outer-symplectic/outer-symplectic.component";
import {TileBilliardsComponent} from "./demos/tile-billiards/tile-billiards-component";
import {SymplecticTableComponent} from "./demos/symplectic-table/symplectic-table.component";
import {TwistedPolygonComponent} from "./demos/twisted-polygon/twisted-polygon.component";
import {ImsoTalkComponent} from "./talks/imso-talk/imso-talk.component";

interface DemoConfig {
  component: Type<ThreeDemoComponent>,
  title: string,
  path: string,
}

export const demoRoutes: DemoConfig[] = [
  {path: 'billiards', component: BilliardsComponent, title: 'Billiards'},
  {path: 'minkowski', component: MinkowskiBilliardsComponent, title: 'Minkowski Billiards'},
  {path: 'outer-symplectic', component: OuterSymplecticComponent, title: 'Outer Symplectic Billiards'},
  {path: 'tiling-billiards', component: TileBilliardsComponent, title: 'Tiling Billiards'},
  {path: 'symplectic-table', component: SymplecticTableComponent, title: 'Symplectic Table Map'},
  {path: 'twist', component: TwistedPolygonComponent, title: 'Symplectic Table Map (Twisted)'},
  {path: 'pentagram', component: PentagramComponent, title: 'Pentagram Map'},
  {path: 'sourdough', component: SourdoughComponent, title: 'Sourdough Fractal'},

  // {path: 'demo/tiling', component: TilingComponent, title: 'Tiling'},
  // {path: 'demo/symplectic', component: SymplecticComponent, title: 'Symplectic'},
  // {path: 'demo/unfolding', component: BilliardsUnfoldingComponent, title: 'Unfolding'},
  // {path: 'demo/unfolding-3d', component: Unfolding3DComponent, title: 'Unfolding 3D'},
  // {path: 'demo/corridors', component: CorridorsComponent, title: 'Corridors'},
  // {path: 'demo/scaling', component: ScalingBilliardsComponent, title: 'Scaling Billiards'},
  // {path: 'demo/hyperbolic', component: HyperbolicGeometryComponent, title: 'Hyperbolic Plane'},
  // {path: 'demo/ticktock', component: TicktockComponent, title: 'Evasion'},
  // {path: 'demo/triangle-map', component: TriangleMapComponent, title: 'Triangle'},
  // {path: 'demo/symmetric', component: SymmetricComponent, title: 'Symmetric'},
  // {path: 'demo/phase', component: PhaseComponent, title: 'Phase'},
  // {path: 'demo/crossing', component: CrossingComponent, title: 'Crossing'},
  //
  // {path: 'demo/regge2', component: Regge2Component, title: 'Regge 2D'},
  // {path: 'demo/regge2p1', component: Regge2p1Component, title: 'Regge 2+1D'},
  // {path: 'demo/regge3', component: Regge3Component, title: 'Regge 3D'},
  // {path: 'demo/regge3p1', component: Regge3p1Component, title: 'Regge 3+1D'},
  // {path: 'demo/pixel', component: PixelComponent, title: 'Pixel Billiards'},
  // {path: 'demo/rotation', component: RotationComponent, title: 'Rotation'},
  // {path: 'demo/kobon', component: KobonComponent, title: 'Kobon'},
  // {path: 'demo/scattering', component: ScatteringComponent, title: 'Scattering Billiards'},
  // {path: 'demo/wavefront', component: WavefrontComponent, title: 'Wavefronts'},
  // {path: 'demo/squares', component: SquareTilingComponent, title: 'Squares'},
  // {path: 'demo/dynamics-2d', component: Dynamics2dComponent, title: '2D Dynamics'},
  // {path: 'demo/force-graph', component: ForceGraphComponent, title: 'Force Graph'},
  // {path: 'demo/sea-ice', component: SeaIceComponent, title: 'Sea Ice'},
  // {path: 'demo/dilation-surfaces', component: DilationSurfaceComponent, title: 'Dilation Surfaces'},
];

interface TalkConfig {
  component: Type<any>,
  title: string,
  path: string,
}

export const talkRoutes: TalkConfig[] = [
  {path: 'talks/heidelberg-2025', component: Heidelberg2025Component, title: 'Heidelberg 2025'},
  {path: 'talks/eberly-research-showcase', component: EberlyTalkComponent, title: 'Eberly Research Showcase'},
  {path: 'talks/hamiltonian', component: HamiltonianTalkComponent, title: 'Hamiltonian Systems Seminar'},
  {path: 'talks/ihp-baby-seminar', component: IhpBabySeminar, title: 'IHP 👶 Seminar'},
  {path: 'talks/imso', component: ImsoTalkComponent, title: 'Illustrating Math Seminar Online'},
]

export const routes: Routes = [
  {path: '', component: HomePageComponent, title: ''},
  ...demoRoutes,
  ...talkRoutes,
];
