import {Component, inject} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogModule} from "@angular/material/dialog";
import {MatButtonModule} from "@angular/material/button";
import {MatDivider} from "@angular/material/divider";

export interface KeyBinding {
  effect: string;
  cluster?: string[][];
  keys?: string[];
}

export interface DescriptionBlock {
  heading: string;
  text: string;
}

export interface HelpDialogData {
  title: string;
  description: string;
  sections: DescriptionBlock[];
  keyBindings: KeyBinding[];
}

@Component({
  selector: 'help-dialog',
  standalone: true,
  templateUrl: 'help-dialog.component.html',
  styleUrl: 'help-dialog.component.scss',
  imports: [MatDialogModule, MatButtonModule, MatDivider]
})
export class HelpDialogComponent {
  readonly data = inject<HelpDialogData>(MAT_DIALOG_DATA);
}