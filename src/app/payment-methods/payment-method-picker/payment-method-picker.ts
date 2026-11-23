import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PAYMENT_TYPE_LABELS } from '../../expenses/expense';
import { DragScroll } from '../../shared/drag-scroll';
import { HorizontalWheelScroll } from '../../shared/horizontal-wheel-scroll';
import { PaymentMethod } from '../payment-method';

let nextId = 0;

@Component({
  selector: 'app-payment-method-picker',
  imports: [DragScroll, HorizontalWheelScroll, NgOptimizedImage],
  templateUrl: './payment-method-picker.html',
  styleUrl: './payment-method-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodPicker {
  readonly methods = input.required<readonly PaymentMethod[]>();
  readonly value = input<string | null>(null);
  readonly labelledBy = input.required<string>();
  readonly invalid = input(false);
  readonly valueChange = output<string>();

  protected readonly name = `metodo-${nextId++}`;
  protected readonly typeLabels = PAYMENT_TYPE_LABELS;
}
