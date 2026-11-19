import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideCheck, LucideClock } from '@lucide/angular';

@Component({
  selector: 'app-expense-kind-toggle',
  imports: [RouterLink, RouterLinkActive, LucideCheck, LucideClock],
  templateUrl: './expense-kind-toggle.html',
  styleUrl: './expense-kind-toggle.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseKindToggle {
  protected readonly exact = { exact: true };
}
