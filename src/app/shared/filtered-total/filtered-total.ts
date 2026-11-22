import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-filtered-total',
  imports: [CurrencyPipe],
  templateUrl: './filtered-total.html',
  styleUrl: './filtered-total.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilteredTotal {
  readonly realized = input.required<number | null>();
  readonly planned = input.required<number | null>();
  readonly count = input<number | null>(null);
  readonly cleared = output<void>();
}
