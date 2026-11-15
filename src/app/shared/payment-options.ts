import { Component, input, output } from '@angular/core';
import { NgStyle } from '@angular/common';
import { LucideArrowLeftRight, LucideBarcode, LucideCreditCard, LucideLandmark, LucideQrCode, LucideWallet } from '@lucide/angular';
import { PaymentOption } from '../expense-models';
import { institutionIcon, paymentMethodIcon, paymentTagStyles } from './payment-appearance';

@Component({
  selector: 'app-payment-options',
  imports: [NgStyle, LucideArrowLeftRight, LucideBarcode, LucideCreditCard, LucideLandmark, LucideQrCode, LucideWallet],
  template: `
    <div class="filter-options horizontal-options" role="group" [attr.aria-label]="label()" tabindex="0">
      @for (payment of options(); track payment.value) {
        <button type="button" class="filter-option payment-tag" [ngStyle]="paymentTagStyles(payment)"
          [disabled]="disabled()" [attr.aria-pressed]="selectedId() === payment.value"
          [attr.aria-label]="actionLabel() + payment.name" (click)="selected.emit(payment)">
          @if (institutionIcon(payment); as icon) { <img class="payment-icon" [src]="icon" alt="" aria-hidden="true"> }
          @switch (paymentMethodIcon(payment.paymentMethod)) {
            @case ('barcode') { <svg class="payment-icon" lucideBarcode aria-hidden="true"></svg> }
            @case ('qr-code') { <svg class="payment-icon" lucideQrCode aria-hidden="true"></svg> }
            @case ('credit-card') { <svg class="payment-icon" lucideCreditCard aria-hidden="true"></svg> }
            @case ('wallet') { <svg class="payment-icon" lucideWallet aria-hidden="true"></svg> }
            @case ('arrow-left-right') { <svg class="payment-icon" lucideArrowLeftRight aria-hidden="true"></svg> }
            @case ('landmark') { <svg class="payment-icon" lucideLandmark aria-hidden="true"></svg> }
          }
          <span>{{ payment.name }}</span>
        </button>
      } @empty { <p class="empty">{{ emptyLabel() }}</p> }
    </div>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    button {
      align-items: center; background: var(--payment-tag-background);
      border: 1px solid var(--payment-tag-border); border-radius: 9999px;
      color: inherit; cursor: pointer; display: inline-flex; flex-shrink: 0; font: inherit;
      gap: .5rem; min-height: 2rem; padding: .25rem .75rem; white-space: nowrap;
    }
    button[aria-pressed='true'] { box-shadow: inset 0 0 0 2px var(--color-primary); }
    button:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
    button:disabled { cursor: wait; opacity: .6; }
    .payment-icon { flex-shrink: 0; height: 1rem; width: 1rem; }
    .empty { color: var(--color-text-muted); margin: 0; }
  `,
})
export class PaymentOptions {
  readonly options = input.required<readonly PaymentOption[]>();
  readonly selectedId = input<string | null>(null);
  readonly label = input('Pagamentos');
  readonly actionLabel = input('Filtrar por pagamento: ');
  readonly emptyLabel = input('Nenhum pagamento neste período.');
  readonly disabled = input(false);
  readonly selected = output<PaymentOption>();
  protected readonly institutionIcon = institutionIcon;
  protected readonly paymentMethodIcon = paymentMethodIcon;
  protected readonly paymentTagStyles = paymentTagStyles;
}
