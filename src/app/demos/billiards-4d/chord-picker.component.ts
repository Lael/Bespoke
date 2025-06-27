import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";

@Component({
    selector: 'tiling-billiards',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    standalone: true,
    imports: [CommonModule]
})
export class ChordPickerComponent extends ThreeDemoComponent {
    override frame(dt: number) {
    }
}