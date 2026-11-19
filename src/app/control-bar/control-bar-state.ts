import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ControlBarState {
  private readonly hiddenState = signal(false);
  readonly hidden = this.hiddenState.asReadonly();

  hide(): void {
    this.hiddenState.set(true);
  }

  show(): void {
    this.hiddenState.set(false);
  }
}
