// settings-panel.component.ts
import {Component, input} from '@angular/core';
import {Gui} from './settings';
import {SettingsNodeComponent} from './settings-node.component';

@Component({
  selector: 'settings-panel',
  standalone: true,
  imports: [SettingsNodeComponent],
  template: `
      <div class="gui-panel">
          <settings-node [node]="gui()"/>
      </div>
  `,
  styleUrl: 'settings.scss'
})
export class SettingsPanelComponent {
  gui = input.required<Gui>();
}