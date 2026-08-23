const OPTIONAL_ACTIONS: Record<string, string> = {
  'Primeros alumnos': '/matricula?setup=1',
  'Página pública': '/configuracion?setup=1&section=public-page',
  'Pago online': '/configuracion/finanzas?setup=1',
};

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

const findOptionalSection = () => Array.from(document.querySelectorAll<HTMLElement>('.lestra-setup-page section'))
  .find((section) => normalize(section.textContent || '').includes('Funciones adicionales'));

const decorateOptionalActions = () => {
  const section = findOptionalSection();
  if (!section) return;

  const grid = Array.from(section.children).find((child) => child instanceof HTMLElement && child.classList.contains('grid')) as HTMLElement | undefined;
  if (!grid) return;

  Array.from(grid.children).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const title = normalize(node.querySelector('p')?.textContent || '');
    const destination = OPTIONAL_ACTIONS[title];
    if (!destination) return;

    node.classList.add('setup-optional-action-card');
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    node.setAttribute('aria-label', `${title}. Abrir configuración`);
    node.dataset.setupOptionalDestination = destination;
  });
};

const activateCard = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  const card = target.closest<HTMLElement>('.setup-optional-action-card');
  const destination = card?.dataset.setupOptionalDestination;
  if (!destination) return false;
  window.location.assign(destination);
  return true;
};

document.addEventListener('click', (event) => {
  if (activateCard(event.target)) event.preventDefault();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (activateCard(event.target)) event.preventDefault();
});

const scrollToPublicPage = () => {
  if (window.location.pathname !== '/configuracion') return;
  if (new URLSearchParams(window.location.search).get('section') !== 'public-page') return;

  const locate = () => {
    const marker = Array.from(document.querySelectorAll<HTMLElement>('p'))
      .find((node) => normalize(node.textContent || '') === 'Página pública');
    const section = marker?.closest('section');
    if (!section) return false;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  };

  if (locate()) return;
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (locate() || attempts >= 20) window.clearInterval(timer);
  }, 200);
};

const observer = new MutationObserver(() => decorateOptionalActions());
observer.observe(document.documentElement, { childList: true, subtree: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    decorateOptionalActions();
    scrollToPublicPage();
  }, { once: true });
} else {
  decorateOptionalActions();
  scrollToPublicPage();
}

export {};
