import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ControlBar } from './control-bar/control-bar';
import { CreationSheet } from './creation/creation-sheet/creation-sheet';
import { SettingsSheet } from './settings/settings-sheet/settings-sheet';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ControlBar, CreationSheet, SettingsSheet],
  template: `
    <main class="content">
      <router-outlet />
    </main>
    <app-control-bar
      [createOpen]="creation.isOpen()"
      [settingsOpen]="settings.isOpen()"
      (createRequested)="creation.open()"
      (settingsRequested)="settings.open()"
    />
    <app-creation-sheet #creation />
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
