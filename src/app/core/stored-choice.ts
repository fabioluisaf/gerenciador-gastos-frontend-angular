import { DOCUMENT } from '@angular/common';
import { inject, Signal, signal } from '@angular/core';

export interface StoredChoice<T extends string> {
  readonly value: Signal<T>;
  set(choice: T): void;
}

export function storedChoice<T extends string>(
  key: string,
  choices: readonly T[],
  fallback: T,
): StoredChoice<T> {
  const storage = inject(DOCUMENT).defaultView?.localStorage;
  const read = (): T => {
    try {
      const stored = storage?.getItem(key);
      return choices.find((choice) => choice === stored) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const state = signal<T>(read());

  return {
    value: state.asReadonly(),
    set(choice: T): void {
      state.set(choice);
      try {
        if (choice === fallback) {
          storage?.removeItem(key);
        } else {
          storage?.setItem(key, choice);
        }
      } catch {
        return;
      }
    },
  };
}
