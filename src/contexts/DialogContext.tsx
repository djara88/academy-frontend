import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { BRAND } from '../config/brand';
import { humanizeMessage } from '../utils/humanMessages';

type DialogOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
};

type DialogRequest = DialogOptions & {
  id: number;
  kind: 'alert' | 'confirm';
  message: string;
  resolve: (accepted: boolean) => void;
};

type ToastRequest = {
  id: number;
  context?: string;
  title: string;
  message: string;
};

type DialogContextValue = {
  notify: (message: string, options?: DialogOptions) => Promise<void>;
  confirmAction: (message: string, options?: DialogOptions) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

const focusableSelector = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [requests, setRequests] = useState<DialogRequest[]>([]);
  const [toasts, setToasts] = useState<ToastRequest[]>([]);
  const nextId = useRef(0);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const current = requests[0];

  const enqueue = useCallback((kind: DialogRequest['kind'], message: string, options: DialogOptions = {}) => (
    new Promise<boolean>((resolve) => {
      nextId.current += 1;
      setRequests((pending) => [
        ...pending,
        { id: nextId.current, kind, message, resolve, ...options },
      ]);
    })
  ), []);

  const notify = useCallback(async (message: string, options: DialogOptions = {}) => {
    const presentation = humanizeMessage(message, 'alert', options.tone || 'default');
    if (presentation.toast) {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((pending) => [...pending.slice(-2), { id, context: options.title, title: presentation.title, message: presentation.message }]);
      window.setTimeout(() => setToasts((pending) => pending.filter((toast) => toast.id !== id)), 3200);
      return;
    }
    await enqueue('alert', message, options);
  }, [enqueue]);

  const confirmAction = useCallback((message: string, options?: DialogOptions) => (
    enqueue('confirm', message, options)
  ), [enqueue]);

  const contextValue = useMemo(() => ({ notify, confirmAction }), [confirmAction, notify]);

  const closeCurrent = useCallback((accepted: boolean) => {
    if (!current) return;
    current.resolve(accepted);
    setRequests((pending) => pending.slice(1));
  }, [current]);

  useEffect(() => {
    if (!current) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => primaryButtonRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCurrent(false);
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      window.setTimeout(() => previousFocusRef.current?.focus(), 0);
    };
  }, [closeCurrent, current]);

  const presentation = current ? humanizeMessage(current.message, current.kind, current.tone || 'default') : null;
  const statusStyles = presentation ? {
    success: 'border-[#cce6d6] bg-[#eef9f2] text-[#118255]',
    error: 'border-[#f0c8cc] bg-[#fff1f2] text-[#c5303d]',
    warning: 'border-[#efdca8] bg-[#fff8e8] text-[#8a5b00]',
    info: 'border-[#cdd7ff] bg-[#f0f3ff] text-[#3157ff]',
    confirm: 'border-[#d8e5b0] bg-[#f6fae9] text-[#597400]',
    danger: 'border-[#f0c8cc] bg-[#fff1f2] text-[#c5303d]',
  }[presentation.tone] : '';
  const StatusIcon = presentation?.tone === 'error' || presentation?.tone === 'warning' || presentation?.tone === 'danger'
    ? ExclamationTriangleIcon
    : presentation?.tone === 'confirm'
      ? QuestionMarkCircleIcon
      : presentation?.tone === 'success'
        ? CheckCircleIcon
        : InformationCircleIcon;

  return (
    <DialogContext.Provider value={contextValue}>
      {children}

      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed right-3 top-20 z-[1100] flex w-[min(92vw,390px)] flex-col gap-2 sm:right-5">
        {toasts.map((toast) => (
          <div key={toast.id} role="status" className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-[#dfe4dc] bg-white p-4 text-[#151a16] shadow-[0_16px_45px_rgba(18,24,19,.14)]">
            <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eef9f2] text-[#118255]"><CheckCircleIcon aria-hidden="true" className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><p className="text-sm font-black">{toast.title}</p>{toast.context ? <span className="truncate text-[10px] font-bold uppercase tracking-[.1em] text-[#7a827a]">{toast.context}</span> : null}</div>
              <p className="mt-1 text-sm leading-5 text-[#697169]">{toast.message}</p>
            </div>
            <button type="button" aria-label="Cerrar aviso" onClick={() => setToasts((pending) => pending.filter((item) => item.id !== toast.id))} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#7a827a] hover:bg-[#f1f3ee] hover:text-[#151a16]">×</button>
          </div>
        ))}
      </div>

      {current && presentation ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto overscroll-contain bg-[#111512]/55 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && current.kind === 'alert') closeCurrent(false);
          }}
        >
          <section
            ref={dialogRef}
            role={current.kind === 'alert' ? 'alertdialog' : 'dialog'}
            aria-modal="true"
            aria-labelledby={`lestra-dialog-title-${current.id}`}
            aria-describedby={`lestra-dialog-message-${current.id}`}
            className="w-full max-w-md overflow-hidden rounded-[22px] border border-[#dfe4dc] bg-white text-[#151a16] shadow-[0_28px_90px_rgba(18,24,19,.22)]"
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${statusStyles}`}><StatusIcon aria-hidden="true" className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="truncate text-[10px] font-black uppercase tracking-[.12em] text-[#818981]">{current.title || BRAND.name}</p>
                  <h2 id={`lestra-dialog-title-${current.id}`} className="mt-1 text-xl font-black tracking-[-.025em] text-[#151a16]">{presentation.title}</h2>
                </div>
              </div>

              <p id={`lestra-dialog-message-${current.id}`} className="mt-5 whitespace-pre-line text-[15px] leading-6 text-[#646d64]">
                {presentation.message}
              </p>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {current.kind === 'confirm' ? (
                  <button
                    type="button"
                    onClick={() => closeCurrent(false)}
                    className="min-h-11 rounded-xl border border-[#d9ded6] bg-white px-5 font-bold text-[#596259] hover:bg-[#f5f7f3] hover:text-[#151a16]"
                  >
                    {current.cancelLabel || presentation.cancelLabel}
                  </button>
                ) : null}
                <button
                  ref={primaryButtonRef}
                  type="button"
                  onClick={() => closeCurrent(true)}
                  className={`min-h-11 rounded-xl px-6 font-black ${
                    presentation.tone === 'danger'
                      ? 'bg-[#c5303d] text-white hover:bg-[#ad2733]'
                      : 'bg-[#151a16] text-white hover:bg-[#2b322c]'
                  }`}
                >
                  {current.confirmLabel || presentation.confirmLabel}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </DialogContext.Provider>
  );
};

export const useAppDialog = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useAppDialog debe utilizarse dentro de DialogProvider.');
  return context;
};