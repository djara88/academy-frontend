import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../config/supabase';
import { Logo } from '../components/Logo';
import PublicAdmissionForm from '../components/PublicAdmissionForm';

type Socials = { instagram?: string; facebook?: string; tiktok?: string; youtube?: string; website?: string };
type Academy = { nombre: string; slug: string; descripcion?: string | null; logo?: string | null; direccion?: string | null; ciudad?: string | null; telefono?: string | null; correo?: string | null; colores?: { primario?: string; secundario?: string; fondo?: string }; rrss?: Socials };
type Site = { id: string; nombre: string; direccion?: string | null; ciudad?: string | null; comuna?: string | null; ubicacion_entrenamiento?: string | null; dias_entrenamiento?: string | null; horarios_entrenamiento?: string | null };
type Branch = { id: string; nombre: string; disciplina: string; sede_id?: string | null };
type Category = { id: string; nombre: string; rama_id: string; sede_id?: string | null };
type Photo = { id: string; url: string; alt_text?: string | null; orden: number };
type Payload = { academia: Academy; fotos: Photo[]; sedes: Site[]; ramas: Branch[]; categorias: Category[] };

type PublicVars = CSSProperties & {
  '--academy-accent': string;
  '--academy-accent-2': string;
  '--academy-bg': string;
  '--academy-text': string;
  '--academy-accent-text': string;
};

const validHex = (value: string | null | undefined, fallback: string) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
const rgb = (hex: string) => {
  const clean = hex.replace('#', '');
  return [0, 2, 4].map((offset) => Number.parseInt(clean.slice(offset, offset + 2), 16) / 255);
};
const linear = (channel: number) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrastRatio = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};
const contrastText = (background: string) => contrastRatio(background, '#FFFFFF') >= contrastRatio(background, '#10140F') ? '#FFFFFF' : '#10140F';
const socialLabels: Record<keyof Socials, string> = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube', website: 'Sitio web' };

export default function PublicAcademy() {
  const { slug = '' } = useParams();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setData(null);
    setError('');

    const load = async () => {
      const cleanSlug = String(slug || '').trim().toLowerCase();
      try {
        const { data: fastData, error: fastError } = await supabase.rpc('get_public_academy_catalog', { p_slug: cleanSlug });
        if (!fastError && fastData) {
          if (active) setData(fastData as Payload);
          return;
        }
        const { default: api } = await import('../api/axiosConfig');
        const response = await api.get(`/api/public/academias/${encodeURIComponent(cleanSlug)}`);
        if (active) setData(response.data.data as Payload);
      } catch (requestError: any) {
        if (active) setError(requestError?.response?.data?.error || 'No fue posible cargar esta academia.');
      }
    };

    void load();
    return () => { active = false; };
  }, [slug]);

  const grouped = useMemo(() => !data ? [] : data.ramas.map((branch) => ({ ...branch, categorias: data.categorias.filter((category) => category.rama_id === branch.id) })), [data]);

  if (error) return <main className="academy-front-door academy-public-state"><Logo variant="mark" className="academy-public-state-mark" /><h1>Academia no disponible</h1><p>{error}</p></main>;
  if (!data) return <main className="academy-front-door academy-public-state"><span className="academy-public-spinner" aria-hidden="true" /><p>Cargando academia…</p></main>;

  const primary = validHex(data.academia.colores?.primario, '#289E9D');
  const secondary = validHex(data.academia.colores?.secundario, '#9FCF23');
  const background = validHex(data.academia.colores?.fondo, '#10140F');
  const pageText = contrastText(background);
  const primaryText = contrastText(primary);
  const vars: PublicVars = {
    '--academy-accent': primary,
    '--academy-accent-2': secondary,
    '--academy-bg': background,
    '--academy-text': pageText,
    '--academy-accent-text': primaryText,
  };
  const phone = String(data.academia.telefono || '').replace(/\D/g, '');
  const whatsapp = phone ? `https://wa.me/${phone.startsWith('56') ? phone : `56${phone}`}` : '';
  const socialEntries = Object.entries(data.academia.rrss || {}).filter(([, url]) => String(url || '').startsWith('https://')) as Array<[keyof Socials, string]>;
  const publicSlug = data.academia.slug || slug;

  return (
    <div className="academy-front-door" style={vars}>
      <header className="academy-public-nav">
        <a href="#inicio" className="academy-public-brand" aria-label={`Inicio de ${data.academia.nombre}`}>
          <span className="academy-public-logo">{data.academia.logo ? <img src={data.academia.logo} alt="" decoding="async" fetchPriority="high" /> : <Logo variant="mark" />}</span>
          <span><small>Academia deportiva</small><strong>{data.academia.nombre}</strong></span>
        </a>
        <nav aria-label="Secciones de la academia">
          <a href="#disciplinas">Disciplinas</a>
          <a href="#entrenamientos">Entrenamientos</a>
          {data.fotos.length ? <a href="#galeria">Galería</a> : null}
        </nav>
      </header>

      <main>
        <section id="inicio" className="academy-public-hero">
          <div className="academy-public-story">
            <p className="academy-public-kicker">Entrena · compite · evoluciona</p>
            <h1>{data.academia.nombre}</h1>
            <p className="academy-public-description">{data.academia.descripcion || 'Conoce nuestras disciplinas, categorías y lugares de entrenamiento. Elige el próximo paso para tu deportista.'}</p>
            <div className="academy-public-facts">
              <span><strong>{data.ramas.length}</strong> disciplina{data.ramas.length === 1 ? '' : 's'}</span>
              <span><strong>{data.categorias.length}</strong> categoría{data.categorias.length === 1 ? '' : 's'}</span>
              <span><strong>{data.sedes.length}</strong> sede{data.sedes.length === 1 ? '' : 's'}</span>
            </div>
            {socialEntries.length ? <div className="academy-public-socials">{socialEntries.map(([key, url]) => <a key={key} href={url} target="_blank" rel="noreferrer">{socialLabels[key]}</a>)}</div> : null}
          </div>

          <aside className="academy-public-next" aria-label="Próximo paso">
            <p>Tu próximo paso</p>
            <h2>Conoce la academia antes de decidir.</h2>
            <span>La solicitud de ingreso no genera cobros. Si ya eres parte de la academia, entra al portal seguro para revisar tu estado de cuenta.</span>
            <div className="academy-public-actions">
              <PublicAdmissionForm slug={publicSlug} academyName={data.academia.nombre} branches={data.ramas} categories={data.categorias} sites={data.sedes} primary={primary} secondary={secondary} primaryText={primaryText} />
              <a href={`/a/${encodeURIComponent(publicSlug)}/pagos`} className="academy-public-action secondary"><CreditCardIcon aria-hidden="true" />Consultar pagos<ArrowRightIcon aria-hidden="true" /></a>
              {whatsapp ? <a href={whatsapp} target="_blank" rel="noreferrer" className="academy-public-action quiet"><ChatBubbleLeftRightIcon aria-hidden="true" />Hablar con la academia</a> : null}
            </div>
            <div className="academy-public-location"><MapPinIcon aria-hidden="true" /><span>{data.academia.direccion || data.academia.ciudad || 'Ubicación informada por la academia'}</span></div>
          </aside>
        </section>

        <section id="disciplinas" className="academy-programs">
          <div className="academy-public-section-heading"><div><p>Programas deportivos</p><h2>Encuentra tu disciplina</h2></div><span>{data.ramas.length} opciones activas</span></div>
          <div className="academy-program-ledger">
            {grouped.map((branch, index) => (
              <article key={branch.id}>
                <span className="academy-program-number">{String(index + 1).padStart(2, '0')}</span>
                <div className="academy-program-name"><small>{branch.disciplina}</small><strong>{branch.nombre}</strong></div>
                <div className="academy-program-categories">{branch.categorias.length ? branch.categorias.map((category) => <span key={category.id}>{category.nombre}</span>) : <span>Preguntar por categorías</span>}</div>
              </article>
            ))}
            {!grouped.length ? <p className="academy-public-empty">La academia aún no publica sus disciplinas.</p> : null}
          </div>
        </section>

        <section id="entrenamientos" className="academy-training-places">
          <div className="academy-public-section-heading"><div><p>Entrenamientos</p><h2>Dónde y cuándo entrenamos</h2></div><CalendarDaysIcon aria-hidden="true" /></div>
          <div className="academy-training-ledger">
            {data.sedes.map((site, index) => (
              <article key={site.id}>
                <span className="academy-training-index">{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{site.nombre}</strong><span>{site.ubicacion_entrenamiento || site.direccion || [site.comuna, site.ciudad].filter(Boolean).join(', ') || 'Ubicación por confirmar'}</span></div>
                <div><small>Días</small><strong>{site.dias_entrenamiento || 'Por confirmar'}</strong></div>
                <div><small>Horario</small><strong>{site.horarios_entrenamiento || 'Por confirmar'}</strong></div>
              </article>
            ))}
            {!data.sedes.length ? <p className="academy-public-empty">La academia aún no publica lugares de entrenamiento.</p> : null}
          </div>
        </section>

        {data.fotos.length ? (
          <section id="galeria" className="academy-public-gallery">
            <div className="academy-public-section-heading"><div><p>Vida de academia</p><h2>Así se vive el deporte aquí</h2></div><span>{data.fotos.length} imágenes</span></div>
            <div className="academy-gallery-layout">{data.fotos.map((photo, index) => <figure key={photo.id} className={index === 0 ? 'is-featured' : ''}><img src={photo.url} alt={photo.alt_text || `${data.academia.nombre} · actividad deportiva`} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" /></figure>)}</div>
          </section>
        ) : null}
      </main>

      <footer className="academy-public-footer"><span>{data.academia.nombre}</span><small>Experiencia digital gestionada con Lestra Deportivo</small></footer>
    </div>
  );
}
