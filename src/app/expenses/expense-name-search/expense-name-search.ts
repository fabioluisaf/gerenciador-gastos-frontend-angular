import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { LucideSearch, LucideX } from '@lucide/angular';
import { ExpenseFilters } from '../expense-filters';

const TYPING_DELAY_MS = 300;

@Component({
  selector: 'app-expense-name-search',
  imports: [LucideSearch, LucideX],
  templateUrl: './expense-name-search.html',
  styleUrl: './expense-name-search.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseNameSearch {
  protected readonly filters = inject(ExpenseFilters);
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private pending: ReturnType<typeof setTimeout> | undefined;

  focus(): void {
    this.input().nativeElement.focus();
  }

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.pending));
  }

  protected onInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    clearTimeout(this.pending);
    this.pending = setTimeout(() => this.filters.setName(query), TYPING_DELAY_MS);
  }

  protected onEnter(event: Event): void {
    clearTimeout(this.pending);
    this.filters.setName((event.target as HTMLInputElement).value);
  }

  protected clear(input: HTMLInputElement): void {
    clearTimeout(this.pending);
    input.value = '';
    this.filters.setName('');
    input.focus();
  }
}
