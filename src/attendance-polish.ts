let scheduled = false;

const normalize = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim();

const findTextNode = (root: HTMLElement, label: string, selector = 'h1,h2,h3,h4,p,span,label') =>
  Array.from(root.querySelectorAll<HTMLElement>(selector)).find((node) => normalize(node.textContent) === label);

const closestPanel = (node: HTMLElement | undefined | null) => {
  if (!node) return null;
  let current: HTMLElement | null = node;
  while (current) {
    if (
      current.tagName === 'DIV' &&
      (current.className.includes('rounded-xl') || current.className.includes('rounded-2xl')) &&
      current.className.includes('border')
    ) return current;
    current = current.parentElement;
  }
  return null;
};

const markMetric = (root: HTMLElement, label: string, key: string) => {
  const node = Array.from(root.querySelectorAll<HTMLElement>('span,p')).find((item) => normalize(item.textContent) === label);
  const panel = closestPanel(node);
  if (!panel) return;
  panel.classList.add('lestra-attendance-stat');
  panel.dataset.stat = key;
};

const markButtonByText = (root: HTMLElement, text: string, className: string) => {
  Array.from(root.querySelectorAll<HTMLButtonElement>('button')).forEach((button) => {
    if (normalize(button.textContent).includes(text)) button.classList.add(className);
  });
};

const markAttendancePage = () => {
  scheduled = false;

  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
  const passList = buttons.find((button) => normalize(button.textContent).replace(/^📝\s*/, '') === 'Pasar Lista');
  const dashboard = buttons.find((button) => normalize(button.textContent).replace(/^📊\s*/, '') === 'Dashboard');
  const reschedule = buttons.find((button) => normalize(button.textContent).replace(/^🔄\s*/, '').startsWith('Reagendar'));

  if (!passList || !dashboard || !reschedule) return;

  const root =
    passList.closest<HTMLElement>('.mx-auto.max-w-6xl') ||
    passList.closest<HTMLElement>('.mx-auto.max-w-7xl') ||
    passList.closest<HTMLElement>('.mx-auto');

  if (!root) return;
  root.classList.add('lestra-attendance-page');

  const header = root.firstElementChild as HTMLElement | null;
  header?.classList.add('lestra-attendance-header');

  const tabs = passList.parentElement;
  if (tabs && tabs.contains(dashboard) && tabs.contains(reschedule)) {
    tabs.classList.add('lestra-attendance-tabs');
    [passList, reschedule, dashboard].forEach((button) => {
      button.classList.add('lestra-attendance-tab');
      button.dataset.label = normalize(button.textContent);
      const active =
        button.className.includes('bg-[#289E9D]') ||
        button.className.includes('bg-orange-600');
      button.dataset.active = active ? 'true' : 'false';
    });
  }

  const sessionPanel = closestPanel(findTextNode(root, '⚙️ Configurar Sesión')) || closestPanel(findTextNode(root, 'Configurar Sesión'));
  sessionPanel?.classList.add('lestra-attendance-session');
  if (sessionPanel) {
    markButtonByText(sessionPanel, 'Realizado', 'lestra-attendance-state-button');
    markButtonByText(sessionPanel, 'Suspendido', 'lestra-attendance-state-button');
    markButtonByText(sessionPanel, 'Guardar Registro de Clase', 'lestra-attendance-primary-button');
  }

  const listPanel = closestPanel(findTextNode(root, '📝 Pasar Lista de Alumnos')) || closestPanel(findTextNode(root, 'Pasar Lista de Alumnos'));
  listPanel?.classList.add('lestra-attendance-roster');
  if (listPanel) {
    Array.from(listPanel.querySelectorAll<HTMLButtonElement>('button')).forEach((button) => {
      const label = normalize(button.textContent);
      if (label === '✔️' || label === '✔') {
        button.classList.add('lestra-attendance-presence-button');
        button.setAttribute('aria-label', 'Presente');
      }
      if (label === '❌' || label === '✖' || label === '×') {
        button.classList.add('lestra-attendance-absence-button');
        button.setAttribute('aria-label', 'Ausente');
      }
      if (label === '📝' || label === '✎') {
        button.classList.add('lestra-attendance-justified-button');
        button.setAttribute('aria-label', 'Justificado');
      }
    });
  }

  const suspendedPanel = closestPanel(findTextNode(root, 'Clases Suspendidas Pendientes'));
  suspendedPanel?.classList.add('lestra-attendance-suspended');

  const reschedulePanel = closestPanel(findTextNode(root, 'Programar Recuperación y Avisar'));
  reschedulePanel?.classList.add('lestra-attendance-reschedule');
  if (reschedulePanel) markButtonByText(reschedulePanel, 'Programar y Avisar por WhatsApp', 'lestra-attendance-primary-button');

  const monthLabel = findTextNode(root, 'Mes de Análisis', 'label');
  if (monthLabel?.parentElement?.parentElement) {
    monthLabel.parentElement.parentElement.classList.add('lestra-attendance-dashboard-filters');
  }

  const categoryPanel = closestPanel(findTextNode(root, '🏷️ Rendimiento por Categorías')) || closestPanel(findTextNode(root, 'Rendimiento por Categorías'));
  categoryPanel?.classList.add('lestra-attendance-dashboard-panel');

  const rankingPanel = closestPanel(findTextNode(root, '🏃‍♂️ Ranking Individual')) || closestPanel(findTextNode(root, 'Ranking Individual'));
  rankingPanel?.classList.add('lestra-attendance-dashboard-panel', 'lestra-attendance-ranking');

  markButtonByText(root, 'Enviar Reportes', 'lestra-attendance-primary-button');
  markButtonByText(root, 'Descargar Excel', 'lestra-attendance-secondary-button');

  markMetric(root, 'Asistencia Global', 'attendance');
  markMetric(root, 'Clases Realizadas', 'classes');
  markMetric(root, 'Recuperativas', 'recovery');
  markMetric(root, 'Suspendidas', 'cancelled');
};

const scheduleMark = () => {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(markAttendancePage);
};

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleMark, { once: true });
  else scheduleMark();

  const observer = new MutationObserver(scheduleMark);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
}

export {};
