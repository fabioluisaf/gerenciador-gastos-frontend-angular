import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideFunnel, LucideX } from '@lucide/angular';
import { HorizontalWheelScroll } from '../../shared/horizontal-wheel-scroll';
import { ExpenseFilter, filterKey } from '../expense';

@Component({
  selector: 'app-expense-filter-bar',
  imports: [NgOptimizedImage, HorizontalWheelScroll, LucideFunnel, LucideX],
  templateUrl: './expense-filter-bar.html',
  styleUrl: './expense-filter-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseFilterBar {
  readonly filters = input.required<readonly ExpenseFilter[]>();
  readonly removed = output<ExpenseFilter>();

  protected readonly filterKey = filterKey;
}
