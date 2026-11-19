import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { LucideMoon, LucideSun, LucideSunMoon } from '@lucide/angular';
import { ControlBarState } from '../../control-bar/control-bar-state';
import { ThemePreference, ThemeService } from '../../core/theme';
import { BottomSheet } from '../../shared/bottom-sheet/bottom-sheet';

interface ThemeOption {
  value: ThemePreference;
  label: string;
}

@Component({
  selector: 'app-settings-sheet',
  imports: [BottomSheet, LucideMoon, LucideSun, LucideSunMoon],
  templateUrl: './settings-sheet.html',
  styleUrl: './settings-sheet.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSheet {
  protected readonly themes = inject(ThemeService);
  private readonly controlBar = inject(ControlBarState);
  private readonly sheet = viewChild.required(BottomSheet);
  private readonly openState = signal(false);

  readonly isOpen = this.openState.asReadonly();

  protected readonly themeOptions: ThemeOption[] = [
    { value: 'system', label: 'Sistema' },
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Escuro' },
  ];

  open(): void {
    this.openState.set(true);
    this.sheet().open();
    this.controlBar.hide();
  }

  protected onClosed(): void {
    this.openState.set(false);
    this.controlBar.show();
  }
}
