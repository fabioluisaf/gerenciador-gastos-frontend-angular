import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideAArrowDown,
  LucideAArrowUp,
  LucideALargeSmall,
  LucideDownload,
  LucideMoon,
  LucideSun,
  LucideSunMoon,
} from '@lucide/angular';
import { ControlBarState } from '../../control-bar/control-bar-state';
import { FontSize, FontSizeService } from '../../core/font-size';
import { ThemePreference, ThemeService } from '../../core/theme';
import { todayIsoDate } from '../../expenses/timeline';
import { BottomSheet } from '../../shared/bottom-sheet/bottom-sheet';
import {
  SegmentedSelector,
  SelectorOption,
} from '../../shared/segmented-selector/segmented-selector';
import { BackupApi } from '../backup-api';

@Component({
  selector: 'app-settings-sheet',
  imports: [
    BottomSheet,
    SegmentedSelector,
    LucideAArrowDown,
    LucideAArrowUp,
    LucideALargeSmall,
    LucideDownload,
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
  private readonly backupApi = inject(BackupApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sheet = viewChild.required(BottomSheet);
  private readonly openState = signal(false);

  readonly isOpen = this.openState.asReadonly();
  protected readonly backupState = signal<'idle' | 'loading' | 'failed'>('idle');

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

  protected downloadBackup(): void {
    this.backupState.set('loading');
    this.backupApi
      .download()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (zip) => {
          saveFile(zip, `backup-gastos-${todayIsoDate()}.zip`);
          this.backupState.set('idle');
        },
        error: () => this.backupState.set('failed'),
      });
  }

  protected onClosed(): void {
    this.openState.set(false);
    this.controlBar.show();
  }
}

function saveFile(content: Blob, name: string): void {
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
