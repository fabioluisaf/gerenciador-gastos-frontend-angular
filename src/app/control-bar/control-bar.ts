import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideCalendarClock,
  LucidePlus,
  LucideReceiptText,
  LucideSettings,
  LucideWalletCards,
} from '@lucide/angular';
import { ControlBarState } from './control-bar-state';

@Component({
  selector: 'app-control-bar',
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideCalendarClock,
    LucidePlus,
    LucideReceiptText,
    LucideSettings,
    LucideWalletCards,
  ],
  templateUrl: './control-bar.html',
  styleUrl: './control-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.hidden]': 'state.hidden()',
    '[attr.inert]': 'state.hidden() ? "" : null',
  },
})
export class ControlBar {
  protected readonly state = inject(ControlBarState);

  readonly settingsOpen = input(false);
  readonly settingsRequested = output<void>();
}
