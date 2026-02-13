import {Component} from "@angular/core";
import {ThreeDemoComponent} from "./three-demo/three-demo.component";

@Component({
  templateUrl: './three-demo/three-demo.component.html',
  standalone: true,
  styleUrl: './three-demo/three-demo.component.sass'
})
export class PolyhedronPickerComponent extends ThreeDemoComponent {
  override frame(dt: number): void {
    throw new Error("Method not implemented.");
  }
}