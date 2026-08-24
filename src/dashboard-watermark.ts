let scheduled = false;

const syncDashboardWatermark = () => {
  scheduled = false;

  const hero = document.querySelector<HTMLElement>('.new-era-dashboard .new-era-hero');
  if (!hero) return;

  const source = document.querySelector<HTMLImageElement>('.lestra-sidebar-brand img[alt^="Logo de "]');
  const existing = hero.querySelector<HTMLImageElement>('.new-era-school-watermark');

  if (!source?.src) {
    existing?.remove();
    return;
  }

  const sourceUrl = source.currentSrc || source.src;
  if (existing) {
    if (existing.src !== sourceUrl) existing.src = sourceUrl;
    return;
  }

  const watermark = document.createElement('img');
  watermark.className = 'new-era-school-watermark';
  watermark.src = sourceUrl;
  watermark.alt = '';
  watermark.setAttribute('aria-hidden', 'true');
  watermark.decoding = 'async';
  watermark.draggable = false;
  hero.appendChild(watermark);
};

const scheduleSync = () => {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(syncDashboardWatermark);
};

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleSync, { once: true });
  } else {
    scheduleSync();
  }

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src'],
  });
}

export {};
