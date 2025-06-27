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
import {SymplecticTableContainerComponent} from "./demos/symplectic-table/symplectic-table-container.component";
import {KobonComponent} from "./demos/kobon/kobon.component";
import {ScatteringComponent} from "./demos/scattering/scattering.component";
import {TileBilliardsComponent} from "./demos/tile-billiards/tile-billiards-component";
import {Billiards4DComponent} from "./demos/billiards-4d/billiards-4d.component";
import {WavefrontComponent} from "./demos/wavefront/wavefront.component";
import {SquareTilingComponent} from "./demos/square-tiling/square-tiling.component";
import {Dynamics2dComponent} from "./demos/dynamics-2d/dynamics-2d.component";
import {ForceGraphComponent} from "./demos/force-graph/force-graph.component";
import {BespokeComponent} from "./bespoke/bespoke.component";
import {PentagramComponent} from "./demos/pentagram/pentagram.component";
import {TwistedPolygonComponent} from "./demos/twisted-polygon/twisted-polygon.component";
import {SeaIceComponent} from "./demos/sea-ice/sea-ice.component";

export const routes: Routes = [
  {path: '', component: HomePageComponent},
  // {path: SURFACES_PATH, component: SurfacesDemoComponent},
  // {path: FUNCTIONS_PATH, component: FunctionsDemoComponent},
  {path: 'billiards', component: BilliardsComponent},
  // {path: PENTAGRAM_PATH, component: PentagramComponent},
  // {path: MOBIUS_PATH, component: MobiusComponent},
  {path: 'tiling', component: TilingComponent},
  // {path: POINCARE_PATH, component: PoincareComponent},
  {path: 'symplectic', component: SymplecticComponent},
  {path: 'unfolding', component: BilliardsUnfoldingComponent},
  {path: 'unfolding-3d', component: Unfolding3DComponent},
  // {path: 'tile.ts-billiards', component: TileBilliardsComponent},
  {path: 'corridors', component: CorridorsComponent},
  {path: 'scaling', component: ScalingBilliardsComponent},
  {path: 'hyperbolic', component: HyperbolicGeometryComponent},
  {path: 'ticktock', component: TicktockComponent},
  {path: 'triangle-map', component: TriangleMapComponent},
  {path: 'symmetric', component: SymmetricComponent},
  {path: 'phase', component: PhaseComponent},
  {path: 'crossing', component: CrossingComponent},
  {path: 'symplectic-table', component: SymplecticTableContainerComponent},
  {path: 'regge2', component: Regge2Component},
  {path: 'regge2p1', component: Regge2p1Component},
  {path: 'regge3', component: Regge3Component},
  {path: 'regge3p1', component: Regge3p1Component},
  {path: 'teichmuller', component: TeichmullerComponent},
  {path: 'pixel', component: PixelComponent},
  {path: 'rotation', component: RotationComponent},
  {path: 'kobon', component: KobonComponent},
  {path: 'scattering', component: ScatteringComponent},
  {path: 'tiling-billiards', component: TileBilliardsComponent},
  {path: 'billiards-4d', component: Billiards4DComponent},
  {path: 'wavefront', component: WavefrontComponent},
  {path: 'squares', component: SquareTilingComponent},
  {path: 'dynamics-2d', component: Dynamics2dComponent},
  {path: 'force-graph', component: ForceGraphComponent},
  {path: 'pentagram', component: PentagramComponent},
  {path: 'bespoke', component: BespokeComponent},
  {path: 'twist', component: TwistedPolygonComponent},
  {path: 'sea-ice', component: SeaIceComponent},
  // {path: 'talks/outer-billiards', component: OuterBilliardsTalkComponent},
];
