import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { LucideChartNoAxesCombined, LucideMoon, LucidePlus, LucideSun } from '@lucide/angular';
import { DialogAppendix } from '../shared/dialog-appendix';
import { BackdropClick } from '../shared/backdrop-click';

@Component({
  selector: 'app-top-bar',
  imports: [DialogAppendix, LucideChartNoAxesCombined, LucideMoon, LucidePlus, LucideSun, BackdropClick],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.css',
})
export class TopBar {
  readonly totalsTitle = input.required<string>();
  readonly creationOpen = input(false);
  readonly offline = input(false);
  readonly createRequested = output<HTMLButtonElement>();
  private readonly document = inject(DOCUMENT);
  private readonly systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  private manualTheme = false;
  protected readonly isDark = signal(this.systemTheme.matches);
  protected readonly totalsOpen = signal(false);
  private readonly totalsDialog = viewChild.required<ElementRef<HTMLDialogElement>>('totalsDialog');

  constructor() {
    this.applyTheme();
    const onSystemThemeChange = () => {
      if (!this.manualTheme) {
        this.isDark.set(this.systemTheme.matches);
        this.applyTheme();
      }
    };
    this.systemTheme.addEventListener('change', onSystemThemeChange);
    inject(DestroyRef).onDestroy(() => {
      this.systemTheme.removeEventListener('change', onSystemThemeChange);
    });
  }

  protected openTotals(): void {
    this.totalsDialog().nativeElement.showModal();
    this.totalsOpen.set(true);
  }

  closeTotals(): void {
    const dialog = this.totalsDialog().nativeElement;
    if (dialog.open) {
      dialog.close();
    }
  }

  protected toggleTheme(): void {
    this.manualTheme = true;
    this.isDark.update((isDark) => !isDark);
    this.applyTheme();
  }

  private applyTheme(): void {
    this.document.documentElement.dataset['theme'] = this.isDark() ? 'dark' : 'light';
  }
}
