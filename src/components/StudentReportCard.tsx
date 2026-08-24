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
              <DocumentChartBarIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black text-[#111711]">Informe de evolución del alumno</p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#657064]">
                Genera un PDF específico de <strong className="text-[#4f6900]">{branchLabel}</strong> con asistencia, evaluación, rendimiento competitivo, categorías y reconocimientos. No mezcla otras ramas.
              </p>
            </div>
          </div>
          {planQuery.isLoading ? (
            <div className="min-h-11 rounded-xl border border-[#dce3d8] bg-white px-4 py-3 text-xs font-bold text-[#657064]">Validando plan...</div>
          ) : canExport ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setOpen(true)}
              className="min-h-11 shrink-0 rounded-xl bg-[#111711] px-4 text-sm font-black text-[#b7ff00] transition hover:bg-[#1c251c] disabled:opacity-50"
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
        <div className="student-report-modal fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-[#334033] bg-[#111711] shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4 border-b border-[#334033] p-5 sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[.16em] text-[#b7ff00]">Informe familiar · {branchLabel}</p>
                <h2 className="mt-1 text-2xl font-black text-white">{studentName || 'Alumno'}</h2>
                <p className="mt-2 text-sm leading-6 text-[#c4cdc3]">El PDF se descarga siempre. También puedes enviarlo al correo registrado del apoderado.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[#4a574a] bg-[#182018] p-2 text-white transition hover:border-[#b7ff00] hover:text-[#b7ff00]" aria-label="Cerrar">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <label className="block text-xs font-black uppercase tracking-wide text-[#dce4da]">Comentario final para la familia</label>
              <textarea
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                maxLength={2500}
                placeholder="Ej.: Ha mostrado avances importantes en constancia y toma de decisiones. Recomendamos continuar reforzando..."
                className="mt-2 min-h-36 w-full resize-y rounded-xl border border-[#4a574a] bg-[#090d09] p-4 text-sm leading-6 text-white outline-none placeholder:text-[#7f8b7e] focus:border-[#b7ff00] focus:ring-2 focus:ring-[#b7ff00]/15"
              />
              <p className="mt-2 text-[11px] leading-5 text-[#aeb8ad]">El informe excluye información financiera y antecedentes médicos sensibles.</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={Boolean(processing)}
                  onClick={() => void generate(false)}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#b7ff00] bg-transparent px-4 text-sm font-black text-[#b7ff00] transition hover:bg-[#b7ff00]/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  {processing === 'download' ? 'Generando...' : 'Solo descargar PDF'}
                </button>
                <button
                  type="button"
                  disabled={Boolean(processing)}
                  onClick={() => void generate(true)}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#b7ff00] bg-[#b7ff00] px-4 text-sm font-black text-[#111711] transition hover:bg-[#caff32] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <EnvelopeIcon className="h-5 w-5" />
                  {processing === 'email' ? 'Enviando...' : 'Descargar y enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
