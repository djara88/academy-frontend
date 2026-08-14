import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Logo } from '../components/Logo';
import { BRAND } from '../config/brand';

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

type DialogContextValue = {
  notify: (message: string, options?: DialogOptions) => Promise<void>;
  confirmAction: (message: string, options?: DialogOptions) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [requests, setRequests] = useState<DialogRequest[]>([]);
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

  const notify = useCallback(async (message: string, options?: DialogOptions) => {
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

  return (
    <DialogContext.Provider value={contextValue}>
      {children}

      {current ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && current.kind === 'alert') closeCurrent(false);
          }}
        >
          <section
            role={current.kind === 'alert' ? 'alertdialog' : 'dialog'}
            aria-modal="true"
            aria-labelledby={`syncademia-dialog-title-${current.id}`}
            aria-describedby={`syncademia-dialog-message-${current.id}`}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-[#289E9D]/50 bg-[#161b22] shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
          >
            <div className="h-1 bg-gradient-to-r from-[#1f7a79] via-[#48d8d0] to-[#289E9D]" />
            <div className="p-6 sm:p-7">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#289E9D]/40 bg-[#0d1117] p-2 shadow-[0_0_24px_rgba(40,158,157,0.2)]">
                  <Logo variant="mark" className="h-full w-full" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#48d8d0]">Mensaje de</p>
                  <h2 id={`syncademia-dialog-title-${current.id}`} className="truncate text-xl font-black text-white">
                    {current.title || BRAND.name}
                  </h2>
                </div>
              </div>

              <p id={`syncademia-dialog-message-${current.id}`} className="whitespace-pre-line text-[15px] leading-7 text-[#d0d7de]">
                {current.message}
              </p>

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {current.kind === 'confirm' ? (
                  <button
                    type="button"
                    onClick={() => closeCurrent(false)}
                    className="rounded-lg border border-[#30363d] px-5 py-2.5 font-bold text-[#b1bac4] transition-colors hover:bg-[#21262d] hover:text-white"
                  >
                    {current.cancelLabel || 'Cancelar'}
                  </button>
                ) : null}
                <button
                  ref={primaryButtonRef}
                  type="button"
                  onClick={() => closeCurrent(true)}
                  className={`rounded-lg px-6 py-2.5 font-black text-white shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#161b22] ${
                    current.tone === 'danger'
                      ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500'
                      : 'bg-[#289E9D] hover:bg-[#207f7e] focus:ring-[#48d8d0]'
                  }`}
                >
                  {current.confirmLabel || (current.kind === 'confirm' ? 'Confirmar' : 'Aceptar')}
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
