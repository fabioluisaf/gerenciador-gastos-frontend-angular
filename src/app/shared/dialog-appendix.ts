import { Component, input, output } from '@angular/core';
import { LucideCalendarDays, LucideChartNoAxesCombined, LucideFunnel, LucidePlus, LucideX } from '@lucide/angular';

type AppendixIcon = 'calendar' | 'totals' | 'filter' | 'create';

@Component({
  selector: 'app-dialog-appendix',
  imports: [LucideCalendarDays, LucideChartNoAxesCombined, LucideFunnel, LucidePlus, LucideX],
  template: `
    <div class="dialog-appendix" [class.dialog-appendix-year]="icon() === 'calendar'"
      [class.dialog-appendix-create]="icon() === 'create'">
      <button type="button" class="dialog-appendix-close" [attr.aria-label]="'Fechar ' + label()"
        [title]="'Fechar ' + label()" [disabled]="disabled()" autofocus (click)="close.emit()">
        <span class="highlight-reveal dialog-appendix-highlight" aria-hidden="true"></span>
        @switch (icon()) {
          @case ('calendar') { <svg class="dialog-appendix-open-icon" lucideCalendarDays aria-hidden="true"></svg> }
          @case ('totals') { <svg class="dialog-appendix-open-icon" lucideChartNoAxesCombined aria-hidden="true"></svg> }
          @case ('filter') { <svg class="dialog-appendix-open-icon" lucideFunnel aria-hidden="true"></svg> }
          @case ('create') { <svg class="dialog-appendix-plus" lucidePlus aria-hidden="true"></svg> }
        }
        @if (icon() !== 'create') {
          <svg class="dialog-appendix-close-icon" lucideX aria-hidden="true"></svg>
        }
      </button>
    </div>
  `,
  styleUrl: './dialog-appendix.css',
})
export class DialogAppendix {
  readonly icon = input.required<AppendixIcon>();
  readonly label = input.required<string>();
  readonly close = output<void>();
  readonly disabled = input(false);
}
