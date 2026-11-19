import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ControlBar } from './control-bar/control-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ControlBar],
  template: `
    <main class="content">
      <router-outlet />
    </main>
    <app-control-bar />
  `,
  styles: `
    .content {
      padding-block-end: var(--control-bar-clearance);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
