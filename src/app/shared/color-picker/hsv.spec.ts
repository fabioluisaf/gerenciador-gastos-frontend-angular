import { hexToHsv, hsvToHex, parseHex } from './hsv';

describe('hsv', () => {
  it('should convert hex colors to hue, saturation and value', () => {
    expect(hexToHsv('#FF0000')).toEqual({ hue: 0, saturation: 1, value: 1 });
    expect(hexToHsv('#00FF00')).toEqual({ hue: 120, saturation: 1, value: 1 });
    expect(hexToHsv('#000000')).toEqual({ hue: 0, saturation: 0, value: 0 });
    expect(hexToHsv('#808080').saturation).toBe(0);
  });

  it('should convert back to the same hex', () => {
    for (const hex of ['#820AD1', '#005CA9', '#EC7000', '#FFC800', '#1F1F24', '#FFFFFF']) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });

  it('should accept hex with or without the hash', () => {
    expect(parseHex('ec7000')).toBe('#EC7000');
    expect(parseHex(' #abcdef ')).toBe('#ABCDEF');
    expect(parseHex('#abc')).toBeNull();
    expect(parseHex('zzzzzz')).toBeNull();
  });
});
