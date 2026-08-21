(() => {
  const match = window.location.pathname.match(/^\/a\/([^/]+)\/?$/);
  if (!match) return;

  const slug = decodeURIComponent(match[1] || '').trim();
  if (!slug) return;

  const canonicalUrl = `https://www.lestra.app/a/${encodeURIComponent(slug)}`;
  const title = 'Academia deportiva | Lestra Deportivo';
  const description = 'Página oficial de una academia deportiva gestionada con Lestra Deportivo: disciplinas, categorías, sedes, horarios e inscripciones.';

  document.title = title;

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', canonicalUrl);

  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) descriptionMeta.setAttribute('content', description);

  const values = {
    'meta[property="og:title"]': title,
    'meta[property="og:description"]': description,
    'meta[property="og:url"]': canonicalUrl,
    'meta[name="twitter:title"]': title,
    'meta[name="twitter:description"]': description,
  };

  Object.entries(values).forEach(([selector, value]) => {
    const element = document.querySelector(selector);
    if (element) element.setAttribute('content', value);
  });
})();
