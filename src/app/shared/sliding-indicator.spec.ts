import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SlidingIndicator } from './sliding-indicator';

@Component({
  imports: [SlidingIndicator],
  template: `
    @if (shown()) {
      <div [appSlidingIndicator]="memoryKey">
        @for (option of options; track option) {
          <button type="button" [class.active]="option === selected()">{{ option }}</button>
        }
      </div>
    }
  `,
})
class Host {
  readonly options = ['a', 'b', 'c'];
  readonly selected = signal<string | null>('a');
  readonly shown = signal(true);
  memoryKey = '';
}

describe('SlidingIndicator', () => {
  let fixture: ComponentFixture<Host>;
  let animate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    animate = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'animate', { value: animate, configurable: true });
    stubLayout();
  });

  afterEach(() => {
    delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
    restoreLayout();
  });

  const layoutProps = ['offsetLeft', 'offsetTop', 'offsetWidth', 'offsetHeight'] as const;
  const originals = new Map<string, PropertyDescriptor | undefined>();

  function stubLayout(): void {
    const values: Record<(typeof layoutProps)[number], (el: HTMLElement) => number> = {
      offsetLeft: (el) =>
        [...(el.parentElement?.querySelectorAll('button') ?? [])].indexOf(el as HTMLButtonElement) *
        100,
      offsetTop: () => 4,
      offsetWidth: () => 96,
      offsetHeight: () => 40,
    };
    for (const prop of layoutProps) {
      originals.set(prop, Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop));
      Object.defineProperty(HTMLElement.prototype, prop, {
        configurable: true,
        get(this: HTMLElement) {
          return values[prop](this);
        },
      });
    }
  }

  function restoreLayout(): void {
    for (const prop of layoutProps) {
      const original = originals.get(prop);
      if (original) {
        Object.defineProperty(HTMLElement.prototype, prop, original);
      }
    }
  }

  async function render(memoryKey = ''): Promise<void> {
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.memoryKey = memoryKey;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function select(option: string | null): Promise<void> {
    fixture.componentInstance.selected.set(option);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
  }

  function indicator(): HTMLElement {
    return fixture.nativeElement.querySelector('.sliding-indicator');
  }

  it('should sit behind the selected option without animating on first render', async () => {
    await render();

    expect(fixture.nativeElement.querySelector('div').classList).toContain(
      'sliding-indicator-host',
    );
    expect(indicator().getAttribute('aria-hidden')).toBe('true');
    expect(indicator().style.translate).toBe('0px 4px');
    expect(indicator().style.width).toBe('96px');
    expect(indicator().style.opacity).toBe('1');
    expect(animate).not.toHaveBeenCalled();
  });

  it('should slide to a new selection with the liquid squash and the container swell', async () => {
    await render();

    await select('c');

    expect(indicator().style.translate).toBe('200px 4px');
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it('should fade out while nothing is selected and reappear in place afterwards', async () => {
    await render();

    await select(null);
    expect(indicator().style.opacity).toBe('0');

    await select('b');
    expect(indicator().style.opacity).toBe('1');
    expect(indicator().style.translate).toBe('100px 4px');
    expect(animate).not.toHaveBeenCalled();
  });

  it('should continue from where a just destroyed indicator with the same key stopped', async () => {
    await render('tipo');
    await select('c');
    animate.mockClear();

    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();
    fixture.componentInstance.selected.set('a');
    fixture.componentInstance.shown.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(indicator().style.translate).toBe('0px 4px');
    expect(animate).toHaveBeenCalledTimes(2);
  });
});
