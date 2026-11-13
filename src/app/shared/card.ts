import { Component } from '@angular/core';

@Component({
  selector: 'app-card',
  host: { class: 'card' },
  template: '<ng-content />',
  styles: ':host { display: block; min-width: 0; }',
})
export class Card {}
