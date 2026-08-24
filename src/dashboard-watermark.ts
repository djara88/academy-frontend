let scheduled = false;
let renderVersion = 0;
const outlineCache = new Map<string, Promise<string | null>>();

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.decoding = 'async';
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('No se pudo cargar el logo de la academia.'));
  image.src = src;
});

const buildLogoOutline = async (src: string): Promise<string | null> => {
  if (outlineCache.has(src)) return outlineCache.get(src)!;

  const task = (async () => {
    try {
      const image = await loadImage(src);
      const naturalWidth = Math.max(1, image.naturalWidth || image.width);
      const naturalHeight = Math.max(1, image.naturalHeight || image.height);
      const scale = Math.min(1, 520 / Math.max(naturalWidth, naturalHeight));
      const width = Math.max(1, Math.round(naturalWidth * scale));
      const height = Math.max(1, Math.round(naturalHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return null;

      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const source = context.getImageData(0, 0, width, height);
      const pixels = source.data;

      const patch = Math.max(2, Math.min(8, Math.floor(Math.min(width, height) * 0.035)));
      let bgR = 0;
      let bgG = 0;
      let bgB = 0;
      let bgA = 0;
      let samples = 0;
      const sampleCorner = (startX: number, startY: number) => {
        for (let y = startY; y < Math.min(height, startY + patch); y += 1) {
          for (let x = startX; x < Math.min(width, startX + patch); x += 1) {
            const i = (y * width + x) * 4;
            bgR += pixels[i];
            bgG += pixels[i + 1];
            bgB += pixels[i + 2];
            bgA += pixels[i + 3];
            samples += 1;
          }
        }
      };

      sampleCorner(0, 0);
      sampleCorner(Math.max(0, width - patch), 0);
      sampleCorner(0, Math.max(0, height - patch));
      sampleCorner(Math.max(0, width - patch), Math.max(0, height - patch));

      bgR /= Math.max(1, samples);
      bgG /= Math.max(1, samples);
      bgB /= Math.max(1, samples);
      bgA /= Math.max(1, samples);

      const transparentBackground = bgA < 90;
      const foreground = new Uint8Array(width * height);
      let foregroundCount = 0;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const p = y * width + x;
          const i = p * 4;
          const alpha = pixels[i + 3];
          if (alpha < 24) continue;

          let isForeground = false;
          if (transparentBackground) {
            isForeground = alpha > 46;
          } else {
            const dr = pixels[i] - bgR;
            const dg = pixels[i + 1] - bgG;
            const db = pixels[i + 2] - bgB;
            const distance = Math.sqrt((dr * dr) + (dg * dg) + (db * db));
            isForeground = distance > 48;
          }

          if (isForeground) {
            foreground[p] = 1;
            foregroundCount += 1;
          }
        }
      }

      if (foregroundCount < Math.max(20, width * height * 0.0015)) return null;

      const edge = new Uint8Array(width * height);
      const radius = Math.max(1, Math.round(Math.min(width, height) / 170));
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const p = y * width + x;
          if (!foreground[p]) continue;

          let border = false;
          for (let oy = -radius; oy <= radius && !border; oy += 1) {
            for (let ox = -radius; ox <= radius; ox += 1) {
              const nx = x + ox;
              const ny = y + oy;
              if (nx < 0 || ny < 0 || nx >= width || ny >= height || !foreground[(ny * width) + nx]) {
                border = true;
                break;
              }
            }
          }

          if (!border) continue;
          edge[p] = 1;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }

      if (maxX < minX || maxY < minY) return null;

      const stroke = Math.max(1, Math.round(Math.min(width, height) / 220));
      const expanded = new Uint8Array(width * height);
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          if (!edge[(y * width) + x]) continue;
          for (let oy = -stroke; oy <= stroke; oy += 1) {
            for (let ox = -stroke; ox <= stroke; ox += 1) {
              const nx = x + ox;
              const ny = y + oy;
              if (nx >= 0 && ny >= 0 && nx < width && ny < height) expanded[(ny * width) + nx] = 1;
            }
          }
        }
      }

      const padding = Math.max(8, Math.round(Math.min(width, height) * 0.035));
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(width - 1, maxX + padding);
      maxY = Math.min(height - 1, maxY + padding);

      const cropWidth = maxX - minX + 1;
      const cropHeight = maxY - minY + 1;
      const output = document.createElement('canvas');
      output.width = cropWidth;
      output.height = cropHeight;
      const outputContext = output.getContext('2d');
      if (!outputContext) return null;

      const outlined = outputContext.createImageData(cropWidth, cropHeight);
      for (let y = 0; y < cropHeight; y += 1) {
        for (let x = 0; x < cropWidth; x += 1) {
          if (!expanded[((y + minY) * width) + (x + minX)]) continue;
          const i = (y * cropWidth + x) * 4;
          outlined.data[i] = 255;
          outlined.data[i + 1] = 255;
          outlined.data[i + 2] = 255;
          outlined.data[i + 3] = 255;
        }
      }
      outputContext.putImageData(outlined, 0, 0);
      return output.toDataURL('image/png');
    } catch (error) {
      console.warn('Lestra: no se pudo generar el contorno del logo para el dashboard.', error);
      return null;
    }
  })();

  outlineCache.set(src, task);
  return task;
};

const syncDashboardWatermark = async () => {
  scheduled = false;
  const version = ++renderVersion;

  const hero = document.querySelector<HTMLElement>('.new-era-dashboard .new-era-hero');
  if (!hero) return;

  const source = document.querySelector<HTMLImageElement>('.lestra-sidebar-brand img[alt^="Logo de "]');
  const existing = hero.querySelector<HTMLImageElement>('.new-era-school-watermark');

  if (!source?.src) {
    existing?.remove();
    hero.removeAttribute('data-watermark-source');
    return;
  }

  const sourceUrl = source.currentSrc || source.src;
  if (hero.dataset.watermarkSource === sourceUrl && existing) return;

  const outlineUrl = await buildLogoOutline(sourceUrl);
  if (version !== renderVersion) return;

  existing?.remove();
  hero.dataset.watermarkSource = sourceUrl;
  if (!outlineUrl) return;

  const watermark = document.createElement('img');
  watermark.className = 'new-era-school-watermark';
  watermark.src = outlineUrl;
  watermark.alt = '';
  watermark.setAttribute('aria-hidden', 'true');
  watermark.decoding = 'async';
  watermark.draggable = false;
  hero.appendChild(watermark);
};

const scheduleSync = () => {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => { void syncDashboardWatermark(); });
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
