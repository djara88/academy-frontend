import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useLestraRealtime } from './LestraRealtimeProvider';

const QUERY_NATIVE_PATHS = [
  '/dashboard',
  '/alumnos',
  '/jugadores',
  '/apoderado',
  '/apoderado/mensajes',
];

const matchesAny = (scope: string, patterns: RegExp[]) => patterns.some((pattern) => pattern.test(scope));

export function realtimeScopeAffectsPath(scope: string | null, path: string) {
  if (!scope) return false;
  if (path === '/dashboard') return true;

  const rules: Array<[string, RegExp[]]> = [
    ['/alumnos', [/^jugadores$/, /^matriculas$/, /^inscripciones_deportivas$/, /^evaluaciones$/, /^insignias$/, /^jugador_/, /^deportista_/, /^asistencias$/, /^entrenamientos$/]],
    ['/asistencias', [/^asistencias$/, /^entrenamientos$/, /^alertas_asistencia$/, /^asistencia_/, /^jugadores$/, /^categorias$/, /^ramas$/]],
    ['/finanzas', [/^pagos/, /^cobros$/, /^cobro_/, /^egresos$/, /^configuracion_financiera$/, /^payment_gateway_/, /^pagos_informados$/, /^academia_facturacion$/]],
    ['/profesores', [/^usuarios$/, /^profesor_/, /^categorias$/, /^ramas$/, /^sedes$/]],
    ['/apoderados', [/^tutores$/, /^jugador_tutor$/, /^usuarios$/, /^jugadores$/]],
    ['/solicitudes', [/^solicitudes_admision$/, /^prematriculas$/, /^matriculas$/, /^jugadores$/, /^tutores$/]],
    ['/matricula', [/^matriculas$/, /^prematriculas$/, /^jugadores$/, /^tutores$/, /^cobros$/, /^cobro_/]],
    ['/inscripciones', [/^inscripciones_deportivas$/, /^solicitudes_inscripcion_deportiva$/, /^jugadores$/, /^categorias$/, /^ramas$/, /^sedes$/]],
    ['/uniformes', [/^pedidos_indumentaria$/, /^prendas_catalogo$/, /^jugadores$/, /^tutores$/]],
    ['/torneos', [/^torneos$/, /^torneo_/, /^partidos$/, /^partido_/, /^competencia_/]],
    ['/nuevo-torneo', [/^torneos$/, /^torneo_/, /^categorias$/, /^ramas$/, /^sedes$/]],
    ['/partidos', [/^partidos$/, /^partido_/, /^competencia_/, /^deportista_/, /^jugadores$/]],
    ['/rendimiento', [/^partidos$/, /^partido_/, /^competencia_/, /^deportista_/, /^evaluaciones$/, /^jugadores$/]],
    ['/salud-deportiva', [/^deportista_/, /^jugadores$/, /^matriculas$/, /^inscripciones_/]],
    ['/privacidad', [/^solicitudes_privacidad/, /^consentimientos_alumnos$/, /^jugadores$/, /^tutores$/]],
    ['/whatsapp', [/^whatsapp_/, /^tutores$/, /^jugadores$/]],
    ['/comunicaciones', [/^chat_/, /^whatsapp_/, /^usuarios$/, /^tutores$/, /^jugadores$/]],
    ['/configuracion', [/^academias$/, /^ramas$/, /^sedes$/, /^categorias$/, /^configuracion_financiera$/, /^academia_pagina_fotos$/]],
    ['/profesor', [/^asistencias$/, /^entrenamientos$/, /^partidos$/, /^partido_/, /^competencia_/, /^profesor_/, /^jugadores$/, /^categorias$/, /^deportista_/]],
    ['/apoderado', [/^partidos$/, /^partido_citaciones$/, /^torneos$/, /^torneo_/, /^pagos/, /^cobros$/, /^cobro_/, /^payment_gateway_/, /^jugadores$/, /^tutores$/, /^inscripciones_/, /^solicitudes_/]],
  ];

  const rule = rules.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return rule ? matchesAny(scope, rule[1]) : true;
}

const isEditing = () => {
  const element = document.activeElement as HTMLElement | null;
  if (!element) return false;
  return element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
};

export default function RealtimeRouteBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { revision, scope } = useLestraRealtime();
  const [appliedRevision, setAppliedRevision] = useState(0);
  const timer = useRef<number | null>(null);
  const pending = useRef<number | null>(null);

  const queryNative = useMemo(
    () => QUERY_NATIVE_PATHS.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`)),
    [location.pathname],
  );

  useEffect(() => {
    if (!revision || queryNative || !realtimeScopeAffectsPath(scope, location.pathname)) return;

    const apply = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setAppliedRevision(revision);
        pending.current = null;
      }, 220);
    };

    if (isEditing()) {
      pending.current = revision;
      const onFocusOut = () => {
        window.setTimeout(() => {
          if (!isEditing() && pending.current === revision) apply();
        }, 120);
      };
      window.addEventListener('focusout', onFocusOut, { once: true });
      return () => window.removeEventListener('focusout', onFocusOut);
    }

    apply();
    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [location.pathname, queryNative, revision, scope]);

  return <Fragment key={`${location.pathname}:${appliedRevision}`}>{children}</Fragment>;
}
