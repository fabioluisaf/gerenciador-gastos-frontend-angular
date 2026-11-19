import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ControlBar } from './control-bar/control-bar';
import { SettingsSheet } from './settings/settings-sheet/settings-sheet';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ControlBar, SettingsSheet],
  template: `
    <main class="content">
      <router-outlet />
    </main>
    <app-control-bar [settingsOpen]="settings.isOpen()" (settingsRequested)="settings.open()" />
    <app-settings-sheet #settings />
  `,
  styles: `
    .content {
      padding-block-end: var(--control-bar-clearance);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
