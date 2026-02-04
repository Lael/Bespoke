import {Routes} from '@angular/router';
import {HomePageComponent} from "./home-page/home-page.component";
import {CrossingComponent} from "./demos/crossing/crossing.component";
// import {TileBilliardsComponent} from "./demos/tile.ts-billiards/tile.ts-billiards.component";
import {BilliardsUnfoldingComponent} from "./demos/unfolding/billiards-unfolding.component";
import {SymmetricComponent} from "./demos/symmetry/symmetric.component";
import {BilliardsComponent} from "./demos/billiards/billiards.component";
import {Regge3Component} from "./demos/regge/regge3.component";
import {Unfolding3DComponent} from "./demos/unfolding-3d/unfolding-3d.component";
import {Regge2Component} from "./demos/regge/regge2.component";
import {PhaseComponent} from "./demos/phase/phase.component";
import {TriangleMapComponent} from "./demos/triangle-map/triangle-map.component";
import {HyperbolicGeometryComponent} from "./demos/hyperbolic-geometry/hyperbolic-geometry.component";
import {TicktockComponent} from "./demos/ticktock/ticktock.component";
import {SymplecticComponent} from "./demos/symplectic/symplectic.component";
import {CorridorsComponent} from "./demos/corridors/corridors.component";
import {TilingComponent} from "./demos/tiling/tiling.component";
import {ScalingBilliardsComponent} from "./demos/scaling-billiards/scaling-billiards.component";
import {TeichmullerComponent} from "./demos/regge/teichmuller.component";
import {Regge2p1Component} from "./demos/regge/regge2p1.component";
import {Regge3p1Component} from "./demos/regge/regge3p1.component";
import {PixelComponent} from "./demos/pixel/pixel.component";
import {RotationComponent} from "./demos/rotation/rotation.component";
import {KobonComponent} from "./demos/kobon/kobon.component";
import {ScatteringComponent} from "./demos/scattering/scattering.component";
import {TileBilliardsComponent} from "./demos/tile-billiards/tile-billiards-component";
import {MinkowskiBilliardsComponent} from "./demos/minkowski/minkowski-billiards.component";
import {WavefrontComponent} from "./demos/wavefront/wavefront.component";
import {SquareTilingComponent} from "./demos/square-tiling/square-tiling.component";
import {Dynamics2dComponent} from "./demos/dynamics-2d/dynamics-2d.component";
import {ForceGraphComponent} from "./demos/force-graph/force-graph.component";
import {BespokeComponent} from "./bespoke/bespoke.component";
import {PentagramComponent} from "./demos/pentagram/pentagram.component";
import {TwistedPolygonComponent} from "./demos/twisted-polygon/twisted-polygon.component";
import {SeaIceComponent} from "./demos/sea-ice/sea-ice.component";
import {Heidelberg2025Component} from "./talks/heidelberg-2025/heidelberg-2025.component";
import {SymplecticTableComponent} from "./demos/symplectic-table/symplectic-table.component";
import {OuterSymplecticComponent} from "./demos/outer-symplectic/outer-symplectic.component";
import {EberlyTalkComponent} from "./talks/eberly-research-showcase/eberly-talk.component";
import {DilationSurfaceComponent} from "./demos/dilation-surface/dilation-surface.component";
import {HamiltonianTalkComponent} from "./talks/hamiltonian-talk/hamiltonian-talk.component";
import {BachmanComponent} from "./demos/bachman/bachman.component";
import {SummerComponent} from "./demos/summer/summer.component";
import {IhpBabySeminar} from "./talks/ihp-baby-seminar/ihp-baby-seminar";

export const routes: Routes = [
  {path: '', component: HomePageComponent, title: 'Bespoke'},
  {path: 'zine', redirectTo: './assets/files/zine.pdf'},
  {path: 'talks', component: HomePageComponent, title: 'Bespoke'},
  // {path: SURFACES_PATH, component: SurfacesDemoComponent},
  // {path: FUNCTIONS_PATH, component: FunctionsDemoComponent},
  {path: 'billiards', component: BilliardsComponent, title: 'Billiards'},
  // {path: PENTAGRAM_PATH, component: PentagramComponent},
  // {path: MOBIUS_PATH, component: MobiusComponent},
  {path: 'tiling', component: TilingComponent, title: 'Tiling'},
  // {path: POINCARE_PATH, component: PoincareComponent},
  {path: 'symplectic', component: SymplecticComponent, title: 'Symplectic'},
  {path: 'unfolding', component: BilliardsUnfoldingComponent, title: 'Unfolding'},
  {path: 'unfolding-3d', component: Unfolding3DComponent, title: 'Unfolding 3D'},
  // {path: 'tile.ts-billiards', component: TileBilliardsComponent},
  {path: 'corridors', component: CorridorsComponent, title: 'Corridors'},
  {path: 'scaling', component: ScalingBilliardsComponent, title: 'Scaling Billiards'},
  {path: 'hyperbolic', component: HyperbolicGeometryComponent, title: 'Hyperbolic Plane'},
  {path: 'ticktock', component: TicktockComponent, title: 'Evasion'},
  {path: 'triangle-map', component: TriangleMapComponent, title: 'Triangle'},
  {path: 'symmetric', component: SymmetricComponent, title: 'Symmetric'},
  {path: 'phase', component: PhaseComponent, title: 'Phase'},
  {path: 'crossing', component: CrossingComponent, title: 'Crossing'},
  {path: 'symplectic-table', component: SymplecticTableComponent, title: 'Symplectic Table Map'},
  {path: 'regge2', component: Regge2Component, title: 'Regge 2D'},
  {path: 'regge2p1', component: Regge2p1Component, title: 'Regge 2+1D'},
  {path: 'regge3', component: Regge3Component, title: 'Regge 3D'},
  {path: 'regge3p1', component: Regge3p1Component, title: 'Regget 3+1D'},
  {path: 'teichmuller', component: TeichmullerComponent, title: 'Teichmuller'},
  {path: 'pixel', component: PixelComponent, title: 'Pixel Billiards'},
  {path: 'rotation', component: RotationComponent, title: 'Rotation'},
  {path: 'kobon', component: KobonComponent, title: 'Kobon'},
  {path: 'scattering', component: ScatteringComponent, title: 'Scattering Billiards'},
  {path: 'tiling-billiards', component: TileBilliardsComponent, title: 'Tiling Billiards'},
  {path: 'minkowski', component: MinkowskiBilliardsComponent, title: 'Minkowski Billiards'},
  {path: 'wavefront', component: WavefrontComponent, title: 'Wavefronts'},
  {path: 'squares', component: SquareTilingComponent, title: 'Squares'},
  {path: 'dynamics-2d', component: Dynamics2dComponent, title: '2D Dynamics'},
  {path: 'force-graph', component: ForceGraphComponent, title: 'Force Graph'},
  {path: 'pentagram', component: PentagramComponent, title: 'Pentagram Map'},
  {path: 'bespoke', component: BespokeComponent, title: 'Bespoke'},
  {path: 'twist', component: TwistedPolygonComponent, title: 'Symplectic Table Map (Twisted)'},
  {path: 'sea-ice', component: SeaIceComponent, title: 'Sea Ice'},
  {path: 'outerArea-symplectic', component: OuterSymplecticComponent, title: 'Outer Symplectic Billiards'},
  {path: 'dilation-surfaces', component: DilationSurfaceComponent, title: 'Dilation Surfaces'},
  {path: 'bachman-fractal', component: BachmanComponent, title: 'Bachman Fractal'},
  {path: 'summer', component: SummerComponent, title: "Summer's Circles"},

  // Talks
  {path: 'talks/heidelberg-2025', component: Heidelberg2025Component, title: 'Talk: Heidelberg 2025'},
  {path: 'talks/eberly-research-showcase', component: EberlyTalkComponent, title: 'Talk: Eberly Research Showcase'},
  {path: 'talks/hamiltonian', component: HamiltonianTalkComponent, title: 'Talk: Hamiltonian Systems Seminar'},
  {path: 'talks/ihp-baby-seminar', component: IhpBabySeminar, title: 'IHP 👶 Seminar'},
];
