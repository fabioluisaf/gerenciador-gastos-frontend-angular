import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable } from '@angular/core';
import { storedChoice } from './stored-choice';

export type FontSize = 'small' | 'medium' | 'large';

export const FONT_SIZE_STORAGE_KEY = 'tamanho-fonte';

@Injectable({ providedIn: 'root' })
export class FontSizeService {
  private readonly document = inject(DOCUMENT);
  private readonly choice = storedChoice<FontSize>(
    FONT_SIZE_STORAGE_KEY,
    ['small', 'medium', 'large'],
    'small',
  );

  readonly size = this.choice.value;

  constructor() {
    effect(() => (this.document.documentElement.dataset['fontSize'] = this.size()));
  }

  setSize(size: FontSize): void {
    this.choice.set(size);
  }
}
