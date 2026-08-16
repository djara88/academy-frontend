from pathlib import Path
import re

p = Path('src/pages/Finanzas.tsx')
s = p.read_text()

if '📅 Calendario mensual pendiente.' not in s:
    needle = '      {/* HEADER PRINCIPAL */}'
    calendar = '''      {resumen?.calendarioMensual?.configured === false && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div><b className="text-amber-300">📅 Calendario mensual pendiente.</b><span className="ml-2 text-amber-100/80">Define el día de pago en Configuración → Perfil de Academia para automatizar las mensualidades.</span></div>
            <a href="/configuracion/perfil" className="shrink-0 rounded-lg border border-amber-400/40 px-3 py-2 text-center font-bold text-amber-200 hover:bg-amber-400/10">Configurar ahora</a>
          </div>
        </div>
      )}
      {resumen?.calendarioMensual?.configured === true && (
        <div className="rounded-2xl border border-[#289E9D]/30 bg-[#289E9D]/10 px-4 py-3 text-sm text-[#b9efee]">
          <b>📅 Cobro mensual automático:</b> día {resumen.calendarioMensual.dueDay} de cada mes · aviso {resumen.calendarioMensual.warningDays === 0 ? 'el mismo día' : `${resumen.calendarioMensual.warningDays} día(s) antes`}.
        </div>
      )}

'''
    if needle not in s:
        raise SystemExit('Header marker not found')
    s = s.replace(needle, calendar + needle, 1)

if '🟠 Próximo pago' not in s:
    pos = s.index('Saldo Pendiente')
    start = s.rfind('                  <div className="flex items-center gap-4">', 0, pos)
    end_marker = '\n                </div>\n\n                {/* TABLA DE COBROS DEL ALUMNO */}'
    end = s.index(end_marker, pos)
    if start < 0:
        raise SystemExit('Account status start not found')
    new = '''                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 font-bold uppercase block">Saldo pendiente</span>
                        <span className={`text-lg font-black ${Number(c.saldoVencido || 0) > 0 ? 'text-red-400' : Number(c.saldoTotalPendiente || 0) > 0 ? 'text-amber-300' : 'text-green-400'}`}>
                          ${Number(c.saldoVencido || c.saldoTotalPendiente || 0).toLocaleString('es-CL')}
                        </span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${Number(c.saldoVencido || 0) > 0 ? 'bg-red-900/30 text-red-400 border-red-500/30' : Number(c.saldoTotalPendiente || 0) > 0 ? 'bg-amber-900/20 text-amber-300 border-amber-500/30' : 'bg-green-900/30 text-green-400 border-green-500/30'}`}>
                        {Number(c.saldoVencido || 0) > 0 ? '🔴 Deuda vencida' : Number(c.saldoTotalPendiente || 0) > 0 ? '🟠 Próximo pago' : '🟢 Al día'}
                      </span>
                    </div>
                    {c.mostrarAlertaProximoPago && c.proximoVencimiento && Number(c.saldoVencido || 0) <= 0 && (
                      <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                        {Number(c.diasParaProximoVencimiento) === 0 ? 'Vence hoy' : `Vence en ${c.diasParaProximoVencimiento} día(s)`} · {new Date(`${c.proximoVencimiento}T12:00:00`).toLocaleDateString('es-CL')}
                      </span>
                    )}
                  </div>'''
    s = s[:start] + new + s[end:]

if "'Parcial · por vencer'" not in s:
    pattern = re.compile(r'''\s*<span className=\{`px-2 py-0\.5 rounded font-bold uppercase text-\[10px\] \$\{cob\.estado === 'Pagado' \? 'bg-green-900/40 text-green-400' : cob\.estado === 'Parcial' \? 'bg-orange-900/40 text-orange-400' : 'bg-red-900/40 text-red-400'\}`}>
\s*\{cob\.estado\}
\s*</span>''')
    replacement = '''
                              <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${cob.estado === 'Pagado' ? 'bg-green-900/40 text-green-400' : cob.estado === 'Anulado' ? 'bg-slate-800 text-slate-500' : cob.fecha_vencimiento && cob.fecha_vencimiento < (resumen?.calendarioMensual?.today || new Date().toISOString().slice(0, 10)) ? 'bg-red-900/40 text-red-400' : 'bg-amber-900/30 text-amber-300'}`}>
                                {cob.estado === 'Pagado' ? 'Pagado' : cob.estado === 'Anulado' ? 'Anulado' : cob.fecha_vencimiento && cob.fecha_vencimiento < (resumen?.calendarioMensual?.today || new Date().toISOString().slice(0, 10)) ? 'Vencido' : cob.estado === 'Parcial' ? 'Parcial · por vencer' : 'Por vencer'}
                              </span>'''
    s, count = pattern.subn(replacement, s, count=1)
    if count != 1:
        raise SystemExit('Charge status block not found')

p.write_text(s)
