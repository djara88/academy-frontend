import React, { type ErrorInfo, type ReactNode } from 'react';
import { recordClientError } from '../observability/browserTelemetry';

type Props = { children: ReactNode };
type State = { failed: boolean };

export default class ClientErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const enriched = new Error(error.message);
    enriched.name = error.name;
    enriched.stack = [error.stack, info.componentStack].filter(Boolean).join('\n');
    recordClientError(enriched, 'react');
  }

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="grid min-h-dvh place-items-center bg-[#eef1eb] p-6 text-[#151a16]" role="main">
        <section className="w-full max-w-lg rounded-3xl border border-[#dce2d9] bg-white p-7 text-center shadow-[0_20px_60px_rgba(18,24,19,.10)]">
          <p className="text-xs font-black uppercase tracking-[.14em] text-[#617d00]">Lestra · Recuperación segura</p>
          <h1 className="mt-3 text-2xl font-black">No pudimos mostrar esta pantalla.</h1>
          <p className="mt-3 text-sm leading-6 text-[#657065]">El error fue registrado sin enviar tu correo, contraseña ni datos personales. Puedes recargar y continuar.</p>
          <button type="button" onClick={this.reload} className="mt-6 min-h-12 rounded-xl bg-[#1c231d] px-6 font-black text-white hover:bg-[#2d372f]">
            Recargar Lestra
          </button>
        </section>
      </main>
    );
  }
}
