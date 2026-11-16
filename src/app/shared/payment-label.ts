import { Component, input } from '@angular/core';
import { LucideArrowLeftRight, LucideBarcode, LucideCreditCard, LucideLandmark, LucideQrCode, LucideWallet } from '@lucide/angular';
import { institutionIcon, PaymentDetails, paymentMethodIcon } from './payment-appearance';

@Component({
  selector: 'app-payment-label',
  imports: [LucideArrowLeftRight, LucideBarcode, LucideCreditCard, LucideLandmark, LucideQrCode, LucideWallet],
  template: `
    @if (institutionIcon(payment()); as icon) { <img class="payment-icon" [src]="icon" alt="" aria-hidden="true"> }
    @switch (paymentMethodIcon(payment().paymentMethod)) {
      @case ('barcode') { <svg class="payment-icon" lucideBarcode aria-hidden="true"></svg> }
      @case ('qr-code') { <svg class="payment-icon" lucideQrCode aria-hidden="true"></svg> }
      @case ('credit-card') { <svg class="payment-icon" lucideCreditCard aria-hidden="true"></svg> }
      @case ('wallet') { <svg class="payment-icon" lucideWallet aria-hidden="true"></svg> }
      @case ('arrow-left-right') { <svg class="payment-icon" lucideArrowLeftRight aria-hidden="true"></svg> }
      @case ('landmark') { <svg class="payment-icon" lucideLandmark aria-hidden="true"></svg> }
    }
    <span>{{ label() }}</span>
  `,
  styles: `
    :host { align-items: center; display: inline-flex; gap: .5rem; min-width: 0; }
    .payment-icon { flex-shrink: 0; height: 1rem; width: 1rem; }
    span { overflow-wrap: anywhere; }
  `,
})
export class PaymentLabel {
  readonly payment = input.required<PaymentDetails>();
  readonly label = input.required<string>();
  protected readonly institutionIcon = institutionIcon;
  protected readonly paymentMethodIcon = paymentMethodIcon;
}
