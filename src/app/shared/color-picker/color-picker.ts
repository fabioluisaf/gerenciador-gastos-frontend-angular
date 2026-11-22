import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
} from '@angular/core';
import { Hsv, hexToHsv, hsvToHex, parseHex } from './hsv';

const KEY_STEP = 0.02;
const HUE_STEP = 3;
const LARGE_STEP_FACTOR = 5;

let nextId = 0;

@Component({
  selector: 'app-color-picker',
  templateUrl: './color-picker.html',
  styleUrl: './color-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPicker {
  readonly value = model.required<string>();
  readonly label = input('Cor');

  protected readonly id = `cor-${nextId++}`;
  private readonly hsv = linkedSignal<string, Hsv>({
    source: this.value,
    computation: (hex, previous) =>
      previous && hsvToHex(previous.value) === hex ? previous.value : hexToHsv(hex),
  });
  protected readonly hue = computed(() => this.hsv().hue);
  protected readonly roundedHue = computed(() => Math.round(this.hue()));
  protected readonly saturationPercent = computed(() => Math.round(this.hsv().saturation * 100));
  protected readonly valuePercent = computed(() => Math.round(this.hsv().value * 100));
  protected readonly hueColor = computed(() =>
    hsvToHex({ hue: this.hue(), saturation: 1, value: 1 }),
  );
  protected readonly hexText = linkedSignal(() => this.value());

  protected startDrag(event: PointerEvent, area: 'tone' | 'hue'): void {
    const element = event.currentTarget as HTMLElement;
    element.setPointerCapture?.(event.pointerId);
    element.focus();
    event.preventDefault();
    this.pickAt(event, element, area);
  }

  protected drag(event: PointerEvent, area: 'tone' | 'hue'): void {
    const element = event.currentTarget as HTMLElement;
    if (element.hasPointerCapture?.(event.pointerId)) {
      this.pickAt(event, element, area);
    }
  }

  protected toneKey(event: KeyboardEvent): void {
    const step = event.shiftKey ? KEY_STEP * LARGE_STEP_FACTOR : KEY_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[event.key];
    if (!move) {
      return;
    }
    event.preventDefault();
    const { saturation, value } = this.hsv();
    this.update({ saturation: clamp(saturation + move[0]), value: clamp(value + move[1]) });
  }

  protected hueKey(event: KeyboardEvent): void {
    const step = event.shiftKey ? HUE_STEP * LARGE_STEP_FACTOR : HUE_STEP;
    const moves: Record<string, number> = {
      ArrowLeft: -step,
      ArrowDown: -step,
      ArrowRight: step,
      ArrowUp: step,
      Home: -360,
      End: 360,
    };
    const move = moves[event.key];
    if (move === undefined) {
      return;
    }
    event.preventDefault();
    this.update({ hue: Math.min(359, Math.max(0, this.hue() + move)) });
  }

  protected typeHex(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.hexText.set(text);
    const hex = parseHex(text);
    if (hex && hex !== this.value()) {
      this.value.set(hex);
    }
  }

  protected resetHex(): void {
    this.hexText.set(this.value());
  }

  private pickAt(event: PointerEvent, element: HTMLElement, area: 'tone' | 'hue'): void {
    const box = element.getBoundingClientRect();
    const x = clamp((event.clientX - box.left) / (box.width || 1));
    if (area === 'hue') {
      this.update({ hue: Math.min(359, x * 360) });
      return;
    }
    const y = clamp((event.clientY - box.top) / (box.height || 1));
    this.update({ saturation: x, value: 1 - y });
  }

  private update(changes: Partial<Hsv>): void {
    const next = { ...this.hsv(), ...changes };
    this.hsv.set(next);
    this.value.set(hsvToHex(next));
  }
}

function clamp(amount: number): number {
  return Math.min(1, Math.max(0, amount));
}
