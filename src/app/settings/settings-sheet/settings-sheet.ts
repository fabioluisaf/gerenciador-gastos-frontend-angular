import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import {
  LucideAArrowDown,
  LucideAArrowUp,
  LucideALargeSmall,
  LucideMoon,
  LucideSun,
  LucideSunMoon,
} from '@lucide/angular';
import { ControlBarState } from '../../control-bar/control-bar-state';
import { FontSize, FontSizeService } from '../../core/font-size';
import { ThemePreference, ThemeService } from '../../core/theme';
import { BottomSheet } from '../../shared/bottom-sheet/bottom-sheet';
import {
  SegmentedSelector,
  SelectorOption,
} from '../../shared/segmented-selector/segmented-selector';

@Component({
  selector: 'app-settings-sheet',
  imports: [
    BottomSheet,
    SegmentedSelector,
    LucideAArrowDown,
    LucideAArrowUp,
    LucideALargeSmall,
    LucideMoon,
    LucideSun,
    LucideSunMoon,
  ],
  templateUrl: './settings-sheet.html',
  styleUrl: './settings-sheet.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSheet {
  protected readonly themes = inject(ThemeService);
  protected readonly fontSizes = inject(FontSizeService);
  private readonly controlBar = inject(ControlBarState);
  private readonly sheet = viewChild.required(BottomSheet);
  private readonly openState = signal(false);

  readonly isOpen = this.openState.asReadonly();

  protected readonly themeOptions: SelectorOption<ThemePreference>[] = [
    { value: 'system', label: 'Sistema' },
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Escuro' },
  ];

  protected readonly fontSizeOptions: SelectorOption<FontSize>[] = [
    { value: 'small', label: 'Pequena' },
    { value: 'medium', label: 'Média' },
    { value: 'large', label: 'Grande' },
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
