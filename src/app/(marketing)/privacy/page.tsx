import type { Metadata } from 'next'
import { APP } from '@/config/app'
import { LegalNotice, LegalPage } from '@/components/shared/legal'

export const metadata: Metadata = { title: 'Privacidad' }

/** §136/§137 — Draft policy. Must be reviewed by counsel before production. */
export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" updatedAt="20 de agosto de 2026">
      <LegalNotice />

      <h2>1. Responsable del tratamiento</h2>
      <p>
        {APP.name} trata los datos personales que el usuario carga o genera dentro de la plataforma. La
        identificación completa del responsable, su domicilio y sus canales de atención deben
        completarse antes de poner el servicio en producción.
      </p>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li>Datos de cuenta: nombre, correo electrónico y contraseña (almacenada con hash).</li>
        <li>Contenido cargado: documentos, notas, grabaciones de audio y transcripciones.</li>
        <li>Datos derivados: resúmenes, temas, decisiones, pendientes y representaciones vectoriales.</li>
        <li>Datos de uso: eventos de producto sin contenido privado (conteos y tipos de acción).</li>
      </ul>

      <h2>3. Finalidades</h2>
      <p>
        Los datos se tratan para prestar el servicio: almacenar y organizar la información del usuario,
        transcribir y analizar reuniones, permitir búsqueda y consultas, y operar la cuenta. No se
        utilizan para publicidad ni se venden a terceros.
      </p>

      <h2>4. Encargados y transferencias</h2>
      <p>
        Según la configuración de la instancia, {APP.name} puede transmitir contenido a proveedores de
        infraestructura, de modelos de lenguaje y de transcripción para ejecutar estas funciones. La
        lista concreta de encargados y sus países de operación depende del despliegue y debe publicarse
        antes de producción.
      </p>

      <h2>5. Grabación de reuniones</h2>
      <p>
        La responsabilidad de obtener las autorizaciones necesarias de las personas participantes en una
        grabación recae en quien graba. {APP.name} muestra un aviso previo a la primera grabación, pero
        no obtiene ni verifica consentimientos por el usuario, ni garantiza el cumplimiento normativo de
        una grabación determinada.
      </p>

      <h2>6. Seguridad</h2>
      <p>
        El audio y las transcripciones se almacenan en repositorios privados. El acceso de lectura se
        realiza mediante URLs firmadas de vigencia limitada, emitidas solo después de verificar la
        pertenencia al workspace. Las contraseñas se almacenan con derivación de clave y los tokens de
        sesión se guardan con hash.
      </p>

      <h2>7. Derechos del titular</h2>
      <p>
        De acuerdo con los principios de la Ley 1581 de 2012 y la normativa aplicable, el titular puede
        conocer, actualizar, rectificar y suprimir sus datos, y revocar la autorización otorgada. Desde la
        aplicación es posible eliminar recursos individuales y solicitar la eliminación de la cuenta. Los
        canales formales de atención deben definirse antes de producción.
      </p>

      <h2>8. Conservación</h2>
      <p>
        El contenido se conserva mientras la cuenta esté activa. La eliminación de una reunión retira su
        audio, su transcripción, su análisis y sus índices de búsqueda de forma permanente cuando el
        usuario ejecuta la eliminación definitiva.
      </p>

      <h2>9. Cambios</h2>
      <p>
        Cualquier cambio material en esta política se comunicará dentro de la aplicación antes de su
        entrada en vigor.
      </p>
    </LegalPage>
  )
}
