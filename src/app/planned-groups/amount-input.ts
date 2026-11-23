const MAX_AMOUNT_DIGITS = 13;

export function centsFromInput(value: string): number {
  return Number(value.replace(/\D/g, '').slice(0, MAX_AMOUNT_DIGITS) || '0');
}

export function moveCaretToEnd(event: Event): void {
  const input = event.target as HTMLInputElement;
  requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
}
