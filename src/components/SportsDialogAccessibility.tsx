import { useEffect } from 'react';

const DIALOG_SELECTOR = '.lestra-event-popup, .lestra-performance-popup';
const FOCUSABLE = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const setupDialog = (dialog: HTMLElement) => {
  if (dialog.dataset.a11yReady === 'true') return;
  dialog.dataset.a11yReady = 'true';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.tabIndex = -1;

  const heading = dialog.querySelector<HTMLElement>('h2');
  if (heading) {
    if (!heading.id) heading.id = `sports-dialog-${crypto.randomUUID()}`;
    dialog.setAttribute('aria-labelledby', heading.id);
    dialog.removeAttribute('aria-label');
  }

  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.dataset.previousFocusId = previous?.id || '';

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      const close = dialog.querySelector<HTMLButtonElement>('button[aria-label^="Cerrar"]');
      close?.click();
      return;
    }
    if (event.key !== 'Tab') return;

    const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!items.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  dialog.addEventListener('keydown', onKeyDown);
  (dialog.querySelector<HTMLElement>(FOCUSABLE) || dialog).focus();

  const cleanup = () => {
    dialog.removeEventListener('keydown', onKeyDown);
    dialog.removeAttribute('data-a11y-ready');
    const previousId = dialog.dataset.previousFocusId;
    if (previousId) document.getElementById(previousId)?.focus();
  };

  (dialog as HTMLElement & { __lestraA11yCleanup?: () => void }).__lestraA11yCleanup = cleanup;
};

const cleanupDialog = (dialog: HTMLElement) => {
  const target = dialog as HTMLElement & { __lestraA11yCleanup?: () => void };
  target.__lestraA11yCleanup?.();
  delete target.__lestraA11yCleanup;
};

export default function SportsDialogAccessibility() {
  useEffect(() => {
    const scan = () => document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR).forEach(setupDialog);
    scan();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(DIALOG_SELECTOR)) setupDialog(node);
          node.querySelectorAll?.<HTMLElement>(DIALOG_SELECTOR).forEach(setupDialog);
        });
        mutation.removedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(DIALOG_SELECTOR)) cleanupDialog(node);
          node.querySelectorAll?.<HTMLElement>(DIALOG_SELECTOR).forEach(cleanupDialog);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR).forEach(cleanupDialog);
    };
  }, []);

  return null;
}
