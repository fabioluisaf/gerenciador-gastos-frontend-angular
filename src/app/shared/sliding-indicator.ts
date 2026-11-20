import {
  afterNextRender,
  booleanAttribute,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  Injectable,
  input,
} from '@angular/core';

export const SLIDING_INDICATOR_DURATION_MS = 420;
const MEMORY_WINDOW_MS = 1000;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

interface IndicatorBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Injectable({ providedIn: 'root' })
export class SlidingIndicatorMemory {
  private readonly boxes = new Map<string, { box: IndicatorBox; at: number }>();

  remember(key: string, box: IndicatorBox): void {
    this.boxes.set(key, { box, at: performance.now() });
  }

  recall(key: string): IndicatorBox | null {
    const entry = this.boxes.get(key);
    this.boxes.delete(key);
    return entry && performance.now() - entry.at < MEMORY_WINDOW_MS ? entry.box : null;
  }
}

function measure(element: HTMLElement): IndicatorBox {
  return {
    x: element.offsetLeft,
    y: element.offsetTop,
    width: element.offsetWidth,
    height: element.offsetHeight,
  };
}

function sameBox(a: IndicatorBox | null, b: IndicatorBox): boolean {
  return a !== null && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

@Directive({
  selector: '[appSlidingIndicator]',
  host: { class: 'sliding-indicator-host' },
})
export class SlidingIndicator {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly memory = inject(SlidingIndicatorMemory);

  readonly appSlidingIndicator = input('');
  readonly activeSelector = input('.active');
  readonly swell = input(true, { transform: booleanAttribute });
  readonly followActive = input(false, { transform: booleanAttribute });

  private indicator: HTMLElement | null = null;
  private resizes: ResizeObserver | null = null;
  private active: HTMLElement | null = null;
  private box: IndicatorBox | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const indicator = this.host.ownerDocument.createElement('span');
      indicator.className = 'sliding-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      this.host.prepend(indicator);
      this.indicator = indicator;

      const mutations = new MutationObserver(() => this.update());
      mutations.observe(this.host, { subtree: true, attributes: true, attributeFilter: ['class'] });
      if (typeof ResizeObserver === 'function') {
        this.resizes = new ResizeObserver(() => this.reposition());
        this.resizes.observe(this.host);
      }
      this.update();

      destroyRef.onDestroy(() => {
        mutations.disconnect();
        this.resizes?.disconnect();
        const key = this.appSlidingIndicator();
        if (key && this.box) {
          this.memory.remember(key, this.box);
        }
      });
    });
  }

  private update(): void {
    const next = this.host.querySelector<HTMLElement>(this.activeSelector());
    if (next === this.active) {
      return;
    }
    const previous = this.active;
    this.active = next;
    if (previous) {
      this.resizes?.unobserve(previous);
    }
    if (!next) {
      this.hide();
      return;
    }
    this.resizes?.observe(next);

    const target = measure(next);
    const animated = previous !== null && this.box !== null;
    this.follow(target, animated);
    if (animated) {
      this.slideTo(target);
      return;
    }
    const origin = this.recallOrigin();
    if (origin) {
      this.place(origin);
      this.slideTo(target);
    } else {
      this.place(target);
    }
  }

  private recallOrigin(): IndicatorBox | null {
    const key = this.appSlidingIndicator();
    return key ? this.memory.recall(key) : null;
  }

  private reposition(): void {
    if (!this.active) {
      return;
    }
    const box = measure(this.active);
    if (!sameBox(this.box, box)) {
      this.place(box);
    }
  }

  private place(box: IndicatorBox): void {
    const indicator = this.indicator;
    if (!indicator) {
      return;
    }
    indicator.style.transition = 'none';
    this.apply(box);
    indicator.style.opacity = '1';
    indicator.getBoundingClientRect();
    indicator.style.transition = '';
  }

  private slideTo(box: IndicatorBox): void {
    if (this.prefersReducedMotion()) {
      this.place(box);
      return;
    }
    this.apply(box);
    const timing = { duration: SLIDING_INDICATOR_DURATION_MS, easing: 'ease-in-out' };
    this.indicator?.animate?.([{ scale: '1 1' }, { scale: '1.3 0.82' }, { scale: '1 1' }], timing);
    if (this.swell()) {
      this.host.animate?.([{ scale: '1' }, { scale: '1.04' }, { scale: '1' }], timing);
    }
  }

  private hide(): void {
    this.box = null;
    if (this.indicator) {
      this.indicator.style.opacity = '0';
    }
  }

  private apply(box: IndicatorBox): void {
    this.box = box;
    const style = this.indicator?.style;
    if (!style) {
      return;
    }
    style.translate = `${box.x}px ${box.y}px`;
    style.width = `${box.width}px`;
    style.height = `${box.height}px`;
  }

  private follow(box: IndicatorBox, animated: boolean): void {
    if (!this.followActive() || this.host.scrollWidth <= this.host.clientWidth) {
      return;
    }
    this.host.scrollTo?.({
      left: box.x + box.width / 2 - this.host.clientWidth / 2,
      behavior: animated && !this.prefersReducedMotion() ? 'smooth' : 'auto',
    });
  }

  private prefersReducedMotion(): boolean {
    return this.host.ownerDocument.defaultView?.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
  }
}
