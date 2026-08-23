import { ArrowLeftIcon, CheckCircleIcon, CloudIcon, LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const UPDATED_AT = '23 de agosto de 2026';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-[24px] border border-[#d9ddd3] bg-white p-5 shadow-[0_10px_32px_rgba(23,32,24,.055)] sm:p-7">
    <h2 className="text-xl font-black tracking-tight text-[#172018] sm:text-2xl">{title}</h2>
    <div className="mt-4 space-y-4 text-sm leading-7 text-[#5f685e]">{children}</div>
  </section>
);

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-3">
    <CheckCircleIcon className="mt-1 h-4 w-4 shrink-0 text-[#79a800]" />
    <span>{children}</span>
  </li>
);

export default function LestraPrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#eef0e9] text-[#172018]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-black text-[#4e584d] transition hover:text-[#172018]">
          <ArrowLeftIcon className="h-4 w-4" /> Volver a Lestra
        </Link>

        <header className="relative mt-5 overflow-hidden rounded-[30px] bg-[#172018] px-6 py-8 text-white shadow-[0_24px_70px_rgba(23,32,24,.18)] sm:px-9 sm:py-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[36px] border-[#b9e937]/10" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#b9e937] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.15em] text-[#11170f]">
                <ShieldCheckIcon className="h-4 w-4" /> Privacidad Lestra
              </span>
              <span className="rounded-full border border-white/15 bg-white/[.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-white/75">
                Versión 2026.2
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-[-.035em] text-white sm:text-5xl">Política de privacidad y tratamiento de datos</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              Esta política explica qué información puede procesar Lestra, para qué se utiliza, qué responsabilidades corresponden a la academia y qué principios aplicamos para protegerla.
            </p>
            <p className="mt-3 text-xs font-bold uppercase tracking-[.1em] text-[#b9e937]">Actualizada · {UPDATED_AT}</p>
          </div>
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { icon: LockClosedIcon, title: 'Finalidad limitada', text: 'Los datos se tratan para prestar, asegurar y soportar las funciones contratadas.' },
            { icon: ShieldCheckIcon, title: 'Acceso controlado', text: 'El acceso privado requiere autenticación y permisos asociados a cada organización y perfil.' },
            { icon: CloudIcon, title: 'Protección continua', text: 'Aplicamos medidas técnicas y organizativas para proteger la información durante la prestación del servicio.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-[22px] border border-[#d9ddd3] bg-white p-5">
              <Icon className="h-6 w-6 text-[#79a800]" />
              <p className="mt-3 text-sm font-black text-[#172018]">{title}</p>
              <p className="mt-1.5 text-xs leading-5 text-[#70786f]">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          <Section title="1. Qué rol cumple cada parte">
            <p><strong className="text-[#172018]">La academia</strong> define qué información necesita de sus deportistas, apoderados y equipo, con qué finalidad la utiliza y qué funciones de Lestra activa. Para esos tratamientos, la academia actúa normalmente como responsable del tratamiento.</p>
            <p><strong className="text-[#172018]">Lestra</strong> procesa esa información para prestar la plataforma y las funciones contratadas, siguiendo la configuración e instrucciones de la academia. En ese contexto, Lestra actúa normalmente como encargado del tratamiento.</p>
            <p>Respecto de información propia de la relación directa con Lestra —por ejemplo cuentas de acceso, contratación, facturación del servicio, soporte, seguridad y prevención de abuso— Lestra puede actuar como responsable del tratamiento para esas finalidades específicas.</p>
          </Section>

          <Section title="2. Qué información puede procesar Lestra">
            <ul className="space-y-2">
              <Bullet>Datos de cuenta y administración, como nombre, correo, rol, academia y antecedentes necesarios para gestionar el acceso.</Bullet>
              <Bullet>Datos de deportistas y apoderados necesarios para matrícula, categorías, asistencia, comunicaciones y operación deportiva.</Bullet>
              <Bullet>Información deportiva, evaluaciones, competencias, estadísticas y registros operativos ingresados por la academia.</Bullet>
              <Bullet>Información mínima de salud o emergencia cuando la academia habilita esa función y existe una base válida para tratarla.</Bullet>
              <Bullet>Fotografías o material audiovisual cuando corresponda y conforme a las autorizaciones aplicables.</Bullet>
              <Bullet>Información de cobros, pagos y comprobantes necesaria para las funciones financieras habilitadas.</Bullet>
              <Bullet>Registros técnicos, de autenticación, seguridad, soporte y actividad necesarios para operar y proteger el servicio.</Bullet>
            </ul>
          </Section>

          <Section title="3. Para qué tratamos los datos">
            <p>Procesamos información para entregar las funciones que la academia decide utilizar: gestión deportiva y administrativa, asistencia, categorías, comunicaciones, cobros, soporte, seguridad, trazabilidad de autorizaciones y continuidad del servicio.</p>
            <p>No utilizamos los datos de deportistas para crear perfiles publicitarios propios ni para vender bases de datos personales. Cuando una integración externa es activada por la academia, solo se comunica la información necesaria para ejecutar esa función.</p>
          </Section>

          <Section title="4. Menores, salud e imágenes">
            <p>Lestra está diseñado para que información especialmente delicada no quede mezclada en una aceptación genérica. Las autorizaciones relacionadas con salud de emergencia, fotografía interna y difusión pública se gestionan como decisiones separadas cuando la academia las habilita.</p>
            <p>Las autorizaciones registradas pueden conservar información de trazabilidad, incluyendo tipo, finalidad, versión del texto, representante, canal y fechas relevantes. La posibilidad técnica de registrar una autorización no reemplaza el deber de la academia de verificar que exista una base jurídica válida para el tratamiento.</p>
          </Section>

          <Section title="5. Cómo protegemos la información">
            <p>El acceso privado a Lestra requiere autenticación y se limita según la organización y el perfil del usuario. Aplicamos controles destinados a reducir accesos indebidos, limitar privilegios y separar lógicamente la información administrada por distintas academias.</p>
            <p>Lestra utiliza medidas técnicas y organizativas orientadas a proteger la confidencialidad, integridad y disponibilidad de la información, incluyendo comunicaciones protegidas, controles de acceso, supervisión operativa y mecanismos de continuidad y recuperación.</p>
          </Section>

          <Section title="6. Almacenamiento y transferencias internacionales">
            <p>Lestra utiliza servicios tecnológicos especializados para almacenar y procesar información necesaria para prestar el servicio. Algunos tratamientos pueden realizarse fuera de Chile, dependiendo de las funciones utilizadas y de los servicios involucrados.</p>
            <p>Cuando corresponda una transferencia o tratamiento internacional, Lestra procurará aplicar las salvaguardas contractuales, técnicas y organizativas exigibles y mantener disponible la información necesaria para efectos de transparencia y cumplimiento.</p>
          </Section>

          <Section title="7. Proveedores tecnológicos y subencargados">
            <p>Para operar la plataforma pueden intervenir proveedores especializados en categorías como alojamiento y procesamiento de datos, autenticación, comunicaciones, continuidad operativa y, cuando la academia los habilita, pagos o mensajería.</p>
            <p>Estos terceros deben intervenir únicamente en la medida necesaria para prestar las funciones correspondientes y bajo condiciones destinadas a proteger la información tratada.</p>
            <p>Cuando un cambio de proveedor sea material para el tratamiento de datos, deberá reflejarse en la documentación contractual o de privacidad aplicable.</p>
          </Section>

          <Section title="8. Conservación y eliminación">
            <p>Los datos operativos se conservan mientras sean necesarios para prestar el servicio a la academia y durante los períodos adicionales que resulten necesarios por obligaciones contractuales, contables, de seguridad, prevención de fraude, ejercicio de derechos o cumplimiento legal.</p>
            <p>Cuando corresponda eliminar información y no exista una obligación legítima de conservarla, la eliminación debe considerar dependencias técnicas, respaldos y registros cuya conservación sea necesaria para seguridad, continuidad o trazabilidad.</p>
          </Section>

          <Section title="9. Derechos y solicitudes de privacidad">
            <p>Cuando una solicitud se refiere a datos de un deportista o apoderado administrados por una academia, el canal principal es la propia academia, como organización que determinó el tratamiento. Lestra colaborará técnicamente con ella cuando corresponda.</p>
            <p>Cuando la solicitud se relaciona directamente con datos tratados por Lestra como responsable —por ejemplo cuenta, contratación o soporte— el usuario puede utilizar los canales oficiales disponibles en la plataforma o los datos de contacto informados en la relación contractual.</p>
          </Section>

          <Section title="10. Ley 21.719 y vigencia de esta política">
            <p>La Ley chilena N.º 21.719 entra en vigencia el 1 de diciembre de 2026. Lestra continúa adaptando producto, documentación y prácticas para fortalecer transparencia, trazabilidad, ejercicio de derechos y tratamiento de información especialmente protegida.</p>
            <p>Esta política describe los principios y compromisos aplicables al servicio. No constituye una certificación automática de cumplimiento para cada academia ni reemplaza el asesoramiento jurídico que una organización pueda requerir por sus actividades particulares.</p>
            <p>Si cambia materialmente la forma en que Lestra trata información personal, esta política será actualizada y la versión vigente permanecerá disponible en la plataforma.</p>
          </Section>
        </div>

        <footer className="py-8 text-center text-xs leading-5 text-[#7b8379]">
          Lestra Deportivo · Plataforma de gestión para academias y clubes deportivos<br />
          Política versión 2026.2 · {UPDATED_AT}
        </footer>
      </div>
    </main>
  );
}
