import type { Metadata } from 'next'
import { APP } from '@/config/app'
import { LegalNotice, LegalPage } from '@/components/shared/legal'

export const metadata: Metadata = { title: 'Términos' }

/** §138 — Draft terms. Must be reviewed by counsel before production. */
export default function TermsPage() {
  return (
    <LegalPage title="Términos y condiciones" updatedAt="20 de agosto de 2026">
      <LegalNotice />

      <h2>1. Objeto</h2>
      <p>
        Estos términos regulan el uso de {APP.name}, una plataforma para capturar, organizar y recuperar
        documentos, notas y reuniones.
      </p>

      <h2>2. Cuenta</h2>
      <p>
        El usuario es responsable de la veracidad de los datos de registro y de la custodia de sus
        credenciales. Debe notificar cualquier uso no autorizado de su cuenta.
      </p>

      <h2>3. Responsabilidad sobre las grabaciones</h2>
      <p>
        El usuario declara que cuenta con las autorizaciones necesarias de las personas participantes
        antes de grabar, y que utilizará las grabaciones conforme a la normativa aplicable en su
        jurisdicción. {APP.name} no obtiene consentimientos en nombre del usuario ni garantiza la
        licitud de una grabación concreta.
      </p>

      <h2>4. Contenido del usuario</h2>
      <p>
        El contenido cargado sigue siendo del usuario. Se otorga a {APP.name} una licencia limitada para
        almacenarlo y procesarlo con el único fin de prestar el servicio: transcribir, indexar, analizar y
        permitir su recuperación.
      </p>

      <h2>5. Procesamiento con inteligencia artificial</h2>
      <p>
        Los resúmenes, decisiones, pendientes y respuestas se generan automáticamente y pueden contener
        errores u omisiones. {APP.name} enlaza cada afirmación a su evidencia para que el usuario pueda
        verificarla, y esa verificación es responsabilidad del usuario. Los resultados no constituyen
        asesoría profesional de ningún tipo.
      </p>

      <h2>6. Uso aceptable</h2>
      <p>
        No está permitido usar la plataforma para cargar contenido ilícito, vulnerar derechos de terceros,
        intentar acceder a información de otros workspaces, ni interferir con la operación del servicio.
      </p>

      <h2>7. Disponibilidad</h2>
      <p>
        El servicio se presta en su estado actual. Las funciones de transcripción y análisis dependen de
        proveedores externos y pueden verse afectadas por su disponibilidad.
      </p>

      <h2>8. Terminación</h2>
      <p>
        El usuario puede eliminar su cuenta en cualquier momento. {APP.name} puede suspender cuentas que
        incumplan estos términos, notificando el motivo cuando resulte posible.
      </p>

      <h2>9. Ley aplicable</h2>
      <p>
        La ley aplicable y la jurisdicción competente deben definirse antes de la puesta en producción.
      </p>
    </LegalPage>
  )
}
