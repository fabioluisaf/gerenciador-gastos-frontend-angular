export function stubDialogs(): () => void {
  const { showModal, close } = HTMLDialogElement.prototype;
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (this.open) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    }
  };
  return () => Object.assign(HTMLDialogElement.prototype, { showModal, close });
}
