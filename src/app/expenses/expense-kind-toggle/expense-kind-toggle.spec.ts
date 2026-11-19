import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ExpenseKindToggle } from './expense-kind-toggle';

@Component({ template: '' })
class Blank {}

describe('ExpenseKindToggle', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'gastos', component: Blank },
          { path: 'gastos/planejados', component: Blank },
        ]),
      ],
    });
  });

  async function renderAt(url: string): Promise<HTMLElement> {
    await TestBed.inject(Router).navigateByUrl(url);
    const fixture = TestBed.createComponent(ExpenseKindToggle);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  function current(element: HTMLElement): (string | null)[] {
    return [...element.querySelectorAll('nav[aria-label="Tipo de gasto"] a')].map((link) =>
      link.getAttribute('aria-current'),
    );
  }

  it('should link to both lists with an icon and a text label', async () => {
    const element = await renderAt('/gastos');
    const links = [...element.querySelectorAll('a')];

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/gastos',
      '/gastos/planejados',
    ]);
    expect(links.map((link) => link.textContent?.trim())).toEqual(['Realizados', 'Planejados']);
    expect(links.every((link) => link.querySelector('svg[aria-hidden="true"]'))).toBe(true);
  });

  it('should mark only the list being shown as the current page', async () => {
    expect(current(await renderAt('/gastos'))).toEqual(['page', null]);
    expect(current(await renderAt('/gastos/planejados'))).toEqual([null, 'page']);
  });
});
