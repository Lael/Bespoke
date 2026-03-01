import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";
import {AngularSplitModule} from "angular-split";

@Component({
  selector: 'draggable',
  templateUrl: 'draggable.component.html',
  styleUrls: ['draggable.component.sass'],
  standalone: true,
  imports: [CommonModule, AngularSplitModule]
})
export class DraggableComponent {

}