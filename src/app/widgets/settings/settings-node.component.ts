// gui-node.component.ts
import {Component, input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {GuiBase, GuiControl, GuiFolder, GuiItem} from './settings';

// Material Imports
import {MatExpansionModule} from '@angular/material/expansion';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatSliderModule} from '@angular/material/slider';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from "@angular/material/tooltip";

@Component({
  selector: 'settings-node',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatExpansionModule, MatSlideToggleModule,
    MatSliderModule, MatFormFieldModule, MatInputModule, MatTooltipModule, MatSelectModule, MatButtonModule
  ],
  templateUrl: 'settings-node.component.html',
  styleUrl: 'settings.scss',
})
export class SettingsNodeComponent {
  node = input.required<GuiBase>();

  isFolder(item: GuiItem): item is GuiFolder {
    return item.isFolder === true;
  }

  isControl(item: GuiItem): item is GuiControl {
    return item.isFolder === false;
  }

  showTicks(item: GuiItem): boolean {
    if (item.isFolder) return false;
    const c = item as GuiControl;
    if (!c.stepVal) return false;
    return (c.maxVal || 100) - (c.minVal || 0) <= 25 * c.stepVal;
  }
}