import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownTrayIcon, DocumentChartBarIcon, EnvelopeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';

type Props = {
  studentId: string;
  branchId: string;
  branchLabel: string;
  studentName?: string;
  disabled?: boolean;
  onNotice?: (message: string) => void;
};

type PlanPayload = {
  plan?: { code?: string; name?: string; trial?: boolean };
  features?: string[];
};

type ReportResponse = {
  filename: string;
  pdf_base64: string;
  email_sent: boolean;
  email_reason?: string | null;
  discipline?: string;
};

const downloadBase64Pdf = (base64: string, filename: string) => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'Informe_Alumno.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default function StudentReportCard({ studentId, branchId, branchLabel, studentName, disabled = false, onNotice }: Props) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState<'download' | 'email' | null>(null);

  const planQuery = useQuery({
    queryKey: ['mi-plan-informe-alumno'],
    queryFn: async () => (await api.get('/api/academias/mi-plan')).data?.data as PlanPayload,
    staleTime: 5 * 60 * 1000,
  });

  const canExport = Boolean(planQuery.data?.features?.includes('exportaciones'));
  const dialogTitleId = `student-report-title-${studentId}`;
  const dialogDescriptionId = `student-report-description-${studentId}`;

  const generate = async (sendEmail: boolean) => {
    if (!studentId || !branchId) return;
    setProcessing(sendEmail ? 'email' : 'download');
    try {
      const response = await api.post(`/api/alumnos/${studentId}/informe`, {
        rama_id: branchId,
        comentarios: comments,
        enviar_email: sendEmail,
      });
      const report = response.data?.data as ReportResponse;
      if (!report?.pdf_base64) throw new Error('El servidor no devolvió el PDF generado.');
      downloadBase64Pdf(report.pdf_base64, report.filename);

      if (sendEmail) {
        onNotice?.(
          report.email_sent
            ? `Informe de ${report.discipline || branchLabel} descargado y enviado al apoderado por correo.`
            : `Informe descargado, pero no se pudo enviar por correo: ${report.email_reason || 'sin detalle'}`,
        );
      } else {
        onNotice?.(`Informe de ${report.discipline || branchLabel} descargado correctamente.`);
      }
      setOpen(false);
      setComments('');
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } }; message?: string };
      onNotice?.(apiError.response?.data?.error || apiError.message || 'No fue posible generar el informe del alumno.');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <>
      <div className="student-report-card mt-5 rounded-2xl border border-[#dce3d8] bg-[#f5f7f3] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#263126] bg-[#111711] text-[#b7ff00]">
              <DocumentChartBarIcon aria-hidden="true" className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black text-[#111711]">Informe de evolución del alumno</p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#657064]">
                Genera un PDF específico de <strong className="text-[#4f6900]">{branchLabel}</strong> con asistencia, evaluación, rendimiento competitivo, categorías y reconocimientos. No mezcla otras ramas.
              </p>
            </div>
          </div>
          {planQuery.isLoading ? (
            <div className="min-h-11 rounded-xl border border-[#dce3d8] bg-white px-4 py-3 text-xs font-bold text-[#657064]">Validando plan…</div>
          ) : canExport ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setOpen(true)}
              className="min-h-11 shrink-0 rounded-xl bg-[#111711] px-4 text-sm font-black text-white transition-[background-color,color] hover:bg-[#1c251c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#111711]/15 disabled:opacity-50"
            >
              Generar informe
            </button>
          ) : (
            <div className="max-w-52 rounded-xl border border-[#dce3d8] bg-white px-4 py-2 text-center text-[11px] leading-5 text-[#657064]">
              Disponible desde <strong className="text-[#111711]">Competencia</strong>.
            </div>
          )}
        </div>
      </div>

      {open ? (
        <div
          className="student-report-modal fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[#111512]/55 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !processing) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            aria-describedby={dialogDescriptionId}
            className="w-full max-w-xl overflow-hidden rounded-[24px] border border-[#dce2d8] bg-white text-[#151a16] shadow-[0_28px_90px_rgba(14,20,15,.24)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#e6eae3] p-5 sm:p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#657d00]">Informe familiar · {branchLabel}</p>
                <h2 id={dialogTitleId} className="mt-1 text-2xl font-black tracking-[-.03em] text-[#151a16]">{studentName || 'Alumno'}</h2>
                <p id={dialogDescriptionId} className="mt-2 text-sm leading-6 text-[#667066]">El PDF se descarga siempre. También puedes enviarlo al correo registrado del apoderado.</p>
              </div>
              <button
                type="button"
                disabled={Boolean(processing)}
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#d8ded5] bg-[#f6f8f4] text-[#4f584f] transition-[background-color,border-color,color] hover:bg-[#edf1e9] hover:text-[#151a16] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#111711]/10 disabled:opacity-45"
                aria-label="Cerrar"
              >
                <XMarkIcon aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <label htmlFor={`student-report-comments-${studentId}`} className="block text-[11px] font-black uppercase tracking-[.09em] text-[#657064]">Comentario final para la familia</label>
              <textarea
                id={`student-report-comments-${studentId}`}
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                maxLength={2500}
                placeholder="Ej.: Ha mostrado avances importantes en constancia y toma de decisiones. Recomendamos continuar reforzando…"
                className="mt-2 min-h-36 w-full resize-y rounded-xl border border-[#d4dbd1] bg-white p-4 text-sm leading-6 text-[#151a16] outline-none placeholder:text-[#8b938b] focus-visible:border-[#8fae20] focus-visible:ring-4 focus-visible:ring-[#b7ff00]/15"
              />
              <p className="mt-2 text-[11px] leading-5 text-[#737c73]">El informe excluye información financiera y antecedentes médicos sensibles.</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={Boolean(processing)}
                  onClick={() => void generate(false)}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#c8d5ad] bg-white px-4 text-sm font-black text-[#526700] transition-[background-color,border-color,color] hover:border-[#a9bd7c] hover:bg-[#f4f8eb] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b7ff00]/15 disabled:cursor-not-allowed disabled:bg-[#f1f3ef] disabled:text-[#747c6e]"
                >
                  <ArrowDownTrayIcon aria-hidden="true" className="h-5 w-5" />
                  {processing === 'download' ? 'Generando…' : 'Solo descargar PDF'}
                </button>
                <button
                  type="button"
                  disabled={Boolean(processing)}
                  onClick={() => void generate(true)}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#a8dc00] bg-[#b8ee13] px-4 text-sm font-black text-[#151a16] transition-[background-color,border-color] hover:bg-[#c3f52f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b7ff00]/20 disabled:cursor-not-allowed disabled:border-[#d4dcc7] disabled:bg-[#e8eddf] disabled:text-[#747c6e]"
                >
                  <EnvelopeIcon aria-hidden="true" className="h-5 w-5" />
                  {processing === 'email' ? 'Enviando…' : 'Descargar y enviar'}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
