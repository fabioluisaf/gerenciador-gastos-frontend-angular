import { TestBed } from '@angular/core/testing';
import { FONT_SIZE_STORAGE_KEY, FontSizeService } from './font-size';

describe('FontSizeService', () => {
  function appliedSize(): string | null {
    TestBed.tick();
    return document.documentElement.getAttribute('data-font-size');
  }

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-font-size');
  });

  it('should start with the small size, which is the original one', () => {
    expect(TestBed.inject(FontSizeService).size()).toBe('small');
    expect(appliedSize()).toBe('small');
  });

  it('should apply and remember a bigger size, forgetting it when back to small', () => {
    const service = TestBed.inject(FontSizeService);

    service.setSize('large');
    expect(appliedSize()).toBe('large');
    expect(localStorage.getItem(FONT_SIZE_STORAGE_KEY)).toBe('large');

    service.setSize('small');
    expect(appliedSize()).toBe('small');
    expect(localStorage.getItem(FONT_SIZE_STORAGE_KEY)).toBeNull();
  });

  it('should restore the remembered size and ignore unknown values', () => {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, 'medium');
    expect(TestBed.inject(FontSizeService).size()).toBe('medium');

    TestBed.resetTestingModule();
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, 'gigante');
    expect(TestBed.inject(FontSizeService).size()).toBe('small');
  });
});
