import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScrubberMark, TimelineScrubber } from './timeline-scrubber';

const MARKS: ScrubberMark[] = [
  { id: 'nov', label: 'nov de 2026', position: 0 },
  { id: 'out', label: 'out de 2026', position: 0.5 },
  { id: 'jan', label: 'jan de 2026', position: 0.9 },
];

describe('TimelineScrubber', () => {
  let fixture: ComponentFixture<TimelineScrubber>;
  let selected: string[];
  let track: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(TimelineScrubber);
    fixture.componentRef.setInput('marks', MARKS);
    fixture.componentRef.setInput('label', 'Linha do tempo');
    fixture.componentRef.setInput('activeId', 'out');
    selected = [];
    fixture.componentInstance.selected.subscribe((id) => selected.push(id));
    await fixture.whenStable();
    track = fixture.nativeElement.querySelector('[role="slider"]');
    track.setPointerCapture = vi.fn();
    track.getBoundingClientRect = () => ({ top: 100, height: 400 }) as DOMRect;
  });

  function pointer(type: string, clientY: number): void {
    const event = new MouseEvent(type, { clientY, bubbles: true });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    track.dispatchEvent(event);
  }

  it('should expose the active month as an accessible slider', () => {
    expect(track.getAttribute('aria-label')).toBe('Linha do tempo');
    expect(track.getAttribute('aria-valuenow')).toBe('1');
    expect(track.getAttribute('aria-valuemax')).toBe('2');
    expect(track.getAttribute('aria-valuetext')).toBe('out de 2026');
    expect(fixture.nativeElement.querySelector('.bubble')?.textContent).toBe('out de 2026');
  });

  it('should preview the month under the pointer and select it on release', async () => {
    pointer('pointerdown', 120);
    pointer('pointermove', 470);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.bubble')?.textContent).toBe('jan de 2026');
    expect(fixture.nativeElement.classList).toContain('active');
    expect(selected).toEqual([]);

    pointer('pointerup', 470);

    expect(selected).toEqual(['jan']);
  });

  it('should not select anything when the drag is cancelled', async () => {
    pointer('pointerdown', 330);
    pointer('pointercancel', 330);
    await fixture.whenStable();

    expect(selected).toEqual([]);
    expect(track.getAttribute('aria-valuetext')).toBe('out de 2026');
  });

  it('should move between months with the keyboard without leaving the edges', () => {
    fixture.componentInstance.selected.subscribe((id) =>
      fixture.componentRef.setInput('activeId', id),
    );

    for (const key of ['ArrowDown', 'ArrowDown', 'ArrowUp', 'Home', 'ArrowUp', 'End', 'Enter']) {
      track.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }

    expect(selected).toEqual(['jan', 'jan', 'out', 'nov', 'nov', 'jan']);
  });
});
