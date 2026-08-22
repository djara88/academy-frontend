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

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [requests, setRequests] = useState<DialogRequest[]>([]);
  const [toasts, setToasts] = useState<ToastRequest[]>([]);
  const nextId = useRef(0);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
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

    const focusTimer = window.setTimeout(() => primaryButtonRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCurrent(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeCurrent, current]);

  const presentation = current ? humanizeMessage(current.message, current.kind, current.tone || 'default') : null;
  const statusStyles = presentation ? {
    success: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
    error: 'border-red-400/25 bg-red-500/10 text-red-300',
    warning: 'border-amber-400/25 bg-amber-500/10 text-amber-300',
    info: 'border-sky-400/25 bg-sky-500/10 text-sky-300',
    confirm: 'border-[#48d8d0]/25 bg-[#289E9D]/10 text-[#70e4df]',
    danger: 'border-red-400/25 bg-red-500/10 text-red-300',
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

      <div className="pointer-events-none fixed right-3 top-20 z-[1100] flex w-[min(92vw,390px)] flex-col gap-2 sm:right-5">
        {toasts.map((toast) => (
          <div key={toast.id} role="status" className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-[#101922]/95 p-4 text-white shadow-[0_18px_50px_rgba(0,0,0,.32)] backdrop-blur-xl">
            <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-300"><CheckCircleIcon className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><p className="text-sm font-black">{toast.title}</p>{toast.context ? <span className="truncate text-[10px] font-bold uppercase tracking-[.12em] text-[#71808e]">{toast.context}</span> : null}</div>
              <p className="mt-1 text-sm leading-5 text-[#bdc8d1]">{toast.message}</p>
            </div>
            <button type="button" aria-label="Cerrar aviso" onClick={() => setToasts((pending) => pending.filter((item) => item.id !== toast.id))} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#71808e] hover:bg-white/5 hover:text-white">×</button>
          </div>
        ))}
      </div>

      {current && presentation ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[3px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && current.kind === 'alert') closeCurrent(false);
          }}
        >
          <section
            role={current.kind === 'alert' ? 'alertdialog' : 'dialog'}
            aria-modal="true"
            aria-labelledby={`lestra-dialog-title-${current.id}`}
            aria-describedby={`lestra-dialog-message-${current.id}`}
            className="w-full max-w-md overflow-hidden rounded-[26px] border border-white/10 bg-[#121b25] shadow-[0_28px_90px_rgba(0,0,0,0.58)]"
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${statusStyles}`}><StatusIcon className="h-6 w-6" /></div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="truncate text-[10px] font-black uppercase tracking-[.18em] text-[#71808e]">{current.title || BRAND.name}</p>
                  <h2 id={`lestra-dialog-title-${current.id}`} className="mt-1 text-xl font-black tracking-tight text-white">{presentation.title}</h2>
                </div>
              </div>

              <p id={`lestra-dialog-message-${current.id}`} className="mt-5 whitespace-pre-line text-[15px] leading-6 text-[#c2ccd5]">
                {presentation.message}
              </p>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {current.kind === 'confirm' ? (
                  <button
                    type="button"
                    onClick={() => closeCurrent(false)}
                    className="min-h-11 rounded-xl border border-white/10 px-5 font-bold text-[#9dabb7] transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {current.cancelLabel || presentation.cancelLabel}
                  </button>
                ) : null}
                <button
                  ref={primaryButtonRef}
                  type="button"
                  onClick={() => closeCurrent(true)}
                  className={`min-h-11 rounded-xl px-6 font-black text-white shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#121b25] ${
                    presentation.tone === 'danger'
                      ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500'
                      : presentation.tone === 'error' || presentation.tone === 'warning'
                        ? 'bg-[#273644] hover:bg-[#324553] focus:ring-[#70e4df]'
                        : 'bg-[#289E9D] hover:bg-[#237f80] focus:ring-[#48d8d0]'
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
