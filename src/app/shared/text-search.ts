export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function matchesText(text: string, query: string): boolean {
  const needle = normalizeText(query);
  return needle === '' || normalizeText(text).includes(needle);
}
