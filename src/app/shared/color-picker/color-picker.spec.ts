import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColorPicker } from './color-picker';

@Component({
  imports: [ColorPicker],
  template: `<app-color-picker [(value)]="color" />`,
})
class Host {
  readonly color = signal('#FF0000');
}

describe('ColorPicker', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  function key(selector: string, name: string, shiftKey = false): void {
    element
      .querySelector(selector)!
      .dispatchEvent(new KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true }));
    fixture.detectChanges();
  }

  function hexInput(): HTMLInputElement {
    return element.querySelector<HTMLInputElement>('.hex-input')!;
  }

  it('should show the current color as hex', () => {
    expect(hexInput().value).toBe('#FF0000');
    expect(element.querySelector('.hue')?.getAttribute('aria-valuenow')).toBe('0');
  });

  it('should change hue with the keyboard', () => {
    key('.hue', 'End');
    expect(fixture.componentInstance.color()).toBe('#FF0004');
    key('.hue', 'Home');
    key('.hue', 'ArrowRight', true);
    expect(element.querySelector('.hue')?.getAttribute('aria-valuenow')).toBe('15');
    expect(fixture.componentInstance.color()).toBe('#FF4000');
  });

  it('should keep the hue while the color goes to gray', () => {
    fixture.componentInstance.color.set('#00FF00');
    fixture.detectChanges();
    for (let step = 0; step < 10; step++) {
      key('.tone', 'ArrowLeft', true);
    }
    expect(fixture.componentInstance.color()).toBe('#FFFFFF');
    key('.tone', 'ArrowRight', true);
    expect(fixture.componentInstance.color()).toBe('#E5FFE5');
  });

  it('should accept a typed hex and ignore partial text', () => {
    const input = hexInput();
    input.value = '#12';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.color()).toBe('#FF0000');
    input.value = '12ab9f';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.color()).toBe('#12AB9F');
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(input.value).toBe('#12AB9F');
  });
});
