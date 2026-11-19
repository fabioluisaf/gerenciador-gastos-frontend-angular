import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Institution } from '../expense';

function percentage(part: number, whole: number): number {
  return whole > 0 ? Math.min(100, Math.max(0, (part / whole) * 100)) : 0;
}

@Component({
  selector: 'app-total-row',
  imports: [CurrencyPipe, NgOptimizedImage],
  templateUrl: './total-row.html',
  styleUrl: './total-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--bar-color]': 'barColor()',
  },
})
export class TotalRow {
  readonly label = input.required<string>();
  readonly realized = input.required<number>();
  readonly planned = input.required<number>();
  readonly largestPlanned = input.required<number>();
  readonly institution = input<Institution | null>(null);

  protected readonly barSize = computed(() => percentage(this.planned(), this.largestPlanned()));
  protected readonly progress = computed(() => percentage(this.realized(), this.planned()));
  protected readonly barColor = computed(() => this.institution()?.color ?? null);
}
