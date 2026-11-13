import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { LucideChartNoAxesCombined, LucideMoon, LucidePlus, LucideSun, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-top-bar',
  imports: [LucideChartNoAxesCombined, LucideMoon, LucidePlus, LucideSun, LucideX],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.css',
})
export class TopBar {
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
