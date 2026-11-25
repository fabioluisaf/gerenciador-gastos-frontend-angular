import {
  isWebKitEngine,
  SECTION_BACK,
  SECTION_FORWARD,
  sectionSlide,
} from './view-transition-types';

describe('sectionSlide', () => {
  it('should slide forward when moving to a section further right in the control bar', () => {
    expect(sectionSlide('gastos/planejados', 'metodos-pagamento')).toEqual([SECTION_FORWARD]);
    expect(sectionSlide('metodos-pagamento', 'faturas')).toEqual([SECTION_FORWARD]);
  });

  it('should slide back when returning to a section further left in the control bar', () => {
    expect(sectionSlide('metodos-pagamento', 'gastos')).toEqual([SECTION_BACK]);
  });

  it('should not slide within the same section or towards unknown sections', () => {
    expect(sectionSlide('gastos', 'gastos/planejados')).toEqual([]);
    expect(sectionSlide('gastos', 'desconhecida')).toEqual([]);
  });
});

describe('isWebKitEngine', () => {
  it('should spot Safari and every iOS browser, which all run on WebKit', () => {
    expect(
      isWebKitEngine(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(true);
    expect(
      isWebKitEngine(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
      ),
    ).toBe(true);
    expect(
      isWebKitEngine(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(true);
  });

  it('should not flag Chromium based browsers nor Firefox', () => {
    expect(
      isWebKitEngine(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
      ),
    ).toBe(false);
    expect(
      isWebKitEngine(
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe(false);
    expect(
      isWebKitEngine(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
      ),
    ).toBe(false);
  });
});
