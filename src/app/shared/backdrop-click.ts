export function isBackdropClick(event: MouseEvent, dialog: HTMLDialogElement): boolean {
  if (event.target !== dialog) {
    return false;
  }
  const { top, right, bottom, left } = dialog.getBoundingClientRect();
  const { clientX: x, clientY: y } = event;
  return x < left || x > right || y < top || y > bottom;
}
