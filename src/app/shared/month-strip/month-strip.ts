import { DOCUMENT, formatDate } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  LOCALE_ID,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DragScroll } from '../drag-scroll';
import { HorizontalWheelScroll } from '../horizontal-wheel-scroll';

interface MonthOption {
  key: string;
  label: string;
  fullLabel: string;
}

interface YearGroup {
  year: number;
  months: MonthOption[];
}

const LIQUID_DURATION_MS = 420;
const LIQUID_KEYFRAMES: Keyframe[] = [
  { scale: '1 1' },
  { scale: '1.3 0.82', offset: 0.5 },
  { scale: '1 1' },
];

@Component({
  selector: 'app-month-strip',
  imports: [HorizontalWheelScroll, DragScroll],
  templateUrl: './month-strip.html',
  styleUrl: './month-strip.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthStrip {
  private readonly locale = inject(LOCALE_ID);
  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');
  private readonly indicator = viewChild.required<ElementRef<HTMLElement>>('indicator');
  private readonly view = inject(DOCUMENT).defaultView;
  private centered = false;
  private indicatedKey: string | null = null;

  protected readonly canScrollBack = signal(false);
  protected readonly canScrollForward = signal(false);

  readonly label = input('Meses');
  readonly months = input.required<readonly string[]>();
  readonly selected = input.required<string>();
  readonly monthSelected = output<string>();

  protected readonly years = computed(() => {
    const groups: YearGroup[] = [];
    for (const key of this.months()) {
      const [year, month] = key.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      const option = {
        key,
        label: formatDate(date, 'MMM', this.locale).replaceAll('.', ''),
        fullLabel: formatDate(date, "MMMM 'de' y", this.locale),
      };
      const current = groups.at(-1);
      if (current?.year === year) {
        current.months.push(option);
      } else {
        groups.push({ year, months: [option] });
      }
    }
    return groups;
  });

  constructor() {
    afterRenderEffect(() => {
      this.months();
      const selected = this.selected();
      this.centerSelected(this.centered ? 'smooth' : 'instant');
      this.centered = true;
      this.placeIndicator(this.indicatedKey !== null && this.indicatedKey !== selected);
      this.indicatedKey = selected;
    });

    const view = this.view;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.updateScrollEdges();
      if (!view?.ResizeObserver) {
        return;
      }
      const observer = new view.ResizeObserver(() => {
        this.centerSelected('instant');
        this.placeIndicator(false);
        this.updateScrollEdges();
      });
      observer.observe(this.scroller().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected updateScrollEdges(): void {
    const { scrollLeft, scrollWidth, clientWidth } = this.scroller().nativeElement;
    this.canScrollBack.set(scrollLeft > 1);
    this.canScrollForward.set(scrollLeft + clientWidth < scrollWidth - 1);
  }

  private placeIndicator(animate: boolean): void {
    const indicator = this.indicator().nativeElement;
    const button = this.scroller().nativeElement.querySelector<HTMLElement>(
      `[data-period="${this.selected()}"]`,
    );
    indicator.hidden = !button;
    if (!button) {
      return;
    }
    const liquid = animate && !this.view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    indicator.classList.toggle('moving', liquid);
    indicator.style.translate = `${button.offsetLeft}px ${button.offsetTop}px`;
    indicator.style.inlineSize = `${button.offsetWidth}px`;
    indicator.style.blockSize = `${button.offsetHeight}px`;
    if (liquid) {
      indicator.animate?.(LIQUID_KEYFRAMES, {
        duration: LIQUID_DURATION_MS,
        easing: 'ease-in-out',
      });
    }
  }

  private centerSelected(behavior: ScrollBehavior): void {
    const container = this.scroller().nativeElement;
    const button = container.querySelector<HTMLElement>(`[data-period="${this.selected()}"]`);
    if (!button || container.clientWidth === 0) {
      return;
    }
    container.scrollTo({
      left: button.offsetLeft - (container.clientWidth - button.offsetWidth) / 2,
      behavior,
    });
  }
}
