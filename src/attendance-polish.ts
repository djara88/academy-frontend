let scheduled = false;

const normalize = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim();

const markAttendancePage = () => {
  scheduled = false;

  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
  const passList = buttons.find((button) => normalize(button.textContent) === 'Pasar lista');
  const dashboard = buttons.find((button) => normalize(button.textContent) === 'Dashboard');
  const reschedule = buttons.find((button) => normalize(button.textContent).startsWith('Reagendar'));

  if (!passList || !dashboard || !reschedule) return;

  const root = passList.closest<HTMLElement>('.mx-auto.max-w-7xl');
  if (!root) return;
  root.classList.add('lestra-attendance-page');

  const tabs = passList.parentElement;
  if (tabs && tabs.contains(dashboard) && tabs.contains(reschedule)) {
    tabs.classList.add('lestra-attendance-tabs');
    [passList, reschedule, dashboard].forEach((button) => {
      button.classList.add('lestra-attendance-tab');
      const active = button.className.includes('bg-[#289E9D]') || button.className.includes('bg-orange-600');
      button.dataset.active = active ? 'true' : 'false';
    });
  }

  const metricTitle = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3,p')).find((node) => normalize(node.textContent) === 'Asistencia mensual');
  if (!metricTitle) return;

  let metricsPanel: HTMLElement | null = metricTitle.parentElement;
  while (metricsPanel && metricsPanel !== root) {
    const labels = normalize(metricsPanel.textContent);
    if (labels.includes('CLASES') && labels.includes('ASISTENCIA') && labels.includes('CANCELADAS') && labels.includes('RECUPERATIVAS')) break;
    metricsPanel = metricsPanel.parentElement;
  }

  if (!metricsPanel || metricsPanel === root) return;
  metricsPanel.classList.add('lestra-attendance-metrics');

  const metricLabels = ['CLASES', 'ASISTENCIA', 'CANCELADAS', 'RECUPERATIVAS'];
  Array.from(metricsPanel.querySelectorAll<HTMLElement>('div')).forEach((node) => {
    const text = normalize(node.textContent).toUpperCase();
    const ownChildren = Array.from(node.children).map((child) => normalize(child.textContent).toUpperCase()).filter(Boolean);
    const matching = metricLabels.find((label) => text.startsWith(label) && ownChildren.some((child) => child.includes(label)));
    if (!matching) return;
    const hasValue = /\d/.test(text);
    if (!hasValue) return;
    node.classList.add('lestra-attendance-metric-card');
    node.dataset.metric = matching.toLowerCase();
  });
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
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
}

export {};
