import { ArrowLeftIcon, CheckCircleIcon, CloudIcon, LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const UPDATED_AT = '22 de agosto de 2026';

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
                Versión 2026.1
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-[-.035em] text-white sm:text-5xl">Política de privacidad y tratamiento de datos</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              Esta política explica de forma transparente qué información procesa Lestra, para qué la utiliza, cómo participa la academia y qué medidas aplicamos al prestar el servicio.
            </p>
            <p className="mt-3 text-xs font-bold uppercase tracking-[.1em] text-[#b9e937]">Actualizada · {UPDATED_AT}</p>
          </div>
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { icon: LockClosedIcon, title: 'Finalidad limitada', text: 'Tratamos datos para prestar, asegurar y soportar las funciones contratadas.' },
            { icon: ShieldCheckIcon, title: 'Acceso controlado', text: 'Las operaciones privadas pasan por autenticación y controles asociados a academia y rol.' },
            { icon: CloudIcon, title: 'Cloud informado', text: 'La plataforma utiliza infraestructura cloud especializada y puede implicar tratamiento internacional.' },
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
            <p>Respecto de información propia de la relación directa con Lestra —por ejemplo, cuentas de acceso, contratación, facturación del servicio, soporte, seguridad y prevención de abuso— Lestra puede actuar como responsable del tratamiento para esas finalidades específicas.</p>
          </Section>

          <Section title="2. Qué información puede procesar Lestra">
            <ul className="space-y-2">
              <Bullet>Datos de cuenta y administración, como nombre, correo, rol, academia y credenciales gestionadas por el sistema de autenticación.</Bullet>
              <Bullet>Datos de deportistas y apoderados necesarios para matrícula, categorías, asistencia, comunicaciones y operación deportiva.</Bullet>
              <Bullet>Información deportiva, evaluaciones, competencias, estadísticas y registros operativos ingresados por la academia.</Bullet>
              <Bullet>Información mínima de salud o emergencia únicamente cuando la academia habilita esa función y existe una base válida para tratarla.</Bullet>
              <Bullet>Fotografías o material audiovisual cuando corresponda y conforme a las autorizaciones aplicables.</Bullet>
              <Bullet>Información de cobros, pagos y comprobantes necesaria para las funciones financieras habilitadas. Lestra no necesita almacenar credenciales bancarias del apoderado para registrar una transferencia.</Bullet>
              <Bullet>Registros técnicos, de autenticación, seguridad, soporte y actividad necesarios para operar y proteger el servicio.</Bullet>
            </ul>
          </Section>

          <Section title="3. Para qué tratamos los datos">
            <p>Procesamos información para entregar las funciones que la academia decide utilizar: gestión deportiva y administrativa, asistencia, categorías, comunicaciones, cobros, soporte, seguridad, trazabilidad de autorizaciones y continuidad del servicio.</p>
            <p>No utilizamos los datos de deportistas para crear perfiles publicitarios propios ni para vender bases de datos personales. Cuando una integración externa es activada por la academia —por ejemplo comunicaciones o pagos— se comunica únicamente la información necesaria para ejecutar esa función.</p>
          </Section>

          <Section title="4. Menores, salud e imágenes">
            <p>Lestra está diseñado para que información especialmente delicada no quede mezclada en una aceptación genérica. Los consentimientos de salud de emergencia, fotografía interna y difusión pública se gestionan como decisiones separadas cuando la academia los habilita.</p>
            <p>Las autorizaciones registradas conservan información de trazabilidad, incluyendo tipo, finalidad, versión del texto, representante, canal y fechas relevantes. La posibilidad técnica de registrar una autorización no reemplaza el deber de la academia de verificar que exista una base jurídica válida para el tratamiento.</p>
          </Section>

          <Section title="5. Cómo protegemos el acceso">
            <p>El acceso privado a la operación de Lestra requiere autenticación. El backend valida la identidad del usuario antes de procesar las solicitudes y aplica controles asociados a la academia y al rol. Los perfiles de profesor y apoderado disponen de restricciones adicionales respecto de la información que pueden consultar u operar.</p>
            <p>Aplicamos separación lógica por academia, control de privilegios en el backend, conexiones cifradas provistas por la infraestructura cloud y medidas operativas orientadas a limitar el acceso a personal y servicios que lo necesitan para prestar o soportar la plataforma.</p>
            <p>Ningún sistema conectado a Internet puede prometer riesgo cero. Por eso evitamos afirmaciones de “seguridad absoluta” y mantenemos un proceso continuo de revisión y endurecimiento técnico.</p>
          </Section>

          <Section title="6. Dónde se almacena y procesa la información">
            <p>La base de datos principal de Lestra utiliza infraestructura administrada de Supabase y, actualmente, su proyecto productivo se encuentra en la región <strong className="text-[#172018]">Canada Central</strong>. El frontend y el backend utilizan servicios cloud especializados para entregar la aplicación, ejecutar la lógica y distribuir contenido.</p>
            <p>Esto significa que determinados datos pueden ser almacenados o procesados fuera de Chile. Lestra documentará estas transferencias y los proveedores involucrados dentro de su marco contractual y de privacidad, y procurará utilizar proveedores con estándares de seguridad adecuados a la naturaleza del servicio.</p>
          </Section>

          <Section title="7. Proveedores y subencargados">
            <p>Para operar la plataforma utilizamos proveedores tecnológicos por categorías, entre ellos infraestructura de base de datos/autenticación, hosting de backend, distribución de frontend, comunicaciones y, cuando la academia los habilita, servicios de pago o mensajería.</p>
            <p>Los proveedores principales de infraestructura actualmente incluyen <strong className="text-[#172018]">Supabase</strong> para servicios de datos, <strong className="text-[#172018]">Render</strong> para ejecución del backend y <strong className="text-[#172018]">Vercel</strong> para distribución del frontend. Las integraciones opcionales solo reciben la información necesaria para ejecutar la función activada.</p>
            <p>La lista de proveedores puede cambiar cuando sea necesario mejorar seguridad, continuidad o funcionalidad. Los cambios materiales que afecten el tratamiento de datos deberán reflejarse en la documentación vigente.</p>
          </Section>

          <Section title="8. Conservación y eliminación">
            <p>Los datos operativos se conservan mientras sean necesarios para prestar el servicio a la academia y durante los períodos adicionales que resulten necesarios por obligaciones contractuales, contables, de seguridad, prevención de fraude, ejercicio de derechos o cumplimiento legal.</p>
            <p>Cuando corresponda eliminar información y no exista una obligación legítima de conservarla, la eliminación debe considerar también dependencias técnicas, respaldos y registros cuya conservación sea necesaria para seguridad o trazabilidad. Lestra continuará formalizando políticas de retención por categoría de dato a medida que avance la implementación regulatoria.</p>
          </Section>

          <Section title="9. Derechos y solicitudes de privacidad">
            <p>Cuando la solicitud se refiere a datos de un deportista o apoderado administrados por una academia, el canal principal es la propia academia, como organización que determinó el tratamiento. Lestra dispone de herramientas para registrar y dar seguimiento a solicitudes de privacidad y colaborará técnicamente con la academia cuando corresponda.</p>
            <p>Cuando la solicitud se relaciona directamente con datos tratados por Lestra como responsable —por ejemplo cuenta, contratación o soporte— el usuario puede utilizar los canales oficiales disponibles dentro de la plataforma o los datos de contacto informados en la relación contractual.</p>
          </Section>

          <Section title="10. Ley 21.719 y evolución de esta política">
            <p>La Ley chilena N.º 21.719 entra en vigencia el 1 de diciembre de 2026. Lestra está adaptando su producto, documentación y prácticas para fortalecer transparencia, trazabilidad, ejercicio de derechos y tratamiento de información especialmente protegida.</p>
            <p>Esta política describe el funcionamiento actual y los compromisos operativos de la plataforma. No constituye una certificación automática de cumplimiento para cada academia ni reemplaza el asesoramiento jurídico que una organización pueda requerir por sus actividades particulares.</p>
          </Section>

          <section className="rounded-[24px] border border-[#b9e937]/55 bg-[#f5fbdf] p-5 sm:p-7">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#6d8500]">Transparencia antes que promesas</p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-[#172018]">Nuestra regla es simple: explicar qué hacemos con los datos y mejorar continuamente cómo los protegemos.</h2>
            <p className="mt-3 text-sm leading-6 text-[#5f685e]">Si una característica futura cambia materialmente la forma en que Lestra procesa información, esta política deberá actualizarse y la versión vigente permanecerá accesible desde la plataforma.</p>
          </section>
        </div>

        <footer className="py-8 text-center text-xs leading-5 text-[#7b8379]">
          Lestra Deportivo · Plataforma de gestión para academias y clubes deportivos<br />
          Política versión 2026.1 · {UPDATED_AT}
        </footer>
      </div>
    </main>
  );
}
