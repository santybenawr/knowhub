import type { Metadata } from 'next'
import { LegalPage } from '@/components/shared/legal'

export const metadata: Metadata = { title: 'Privacidad de esta presentación' }

export default function PrivacyPage() {
  return <LegalPage title="Privacidad de esta presentación" updatedAt="8 de septiembre de 2026"><p>Esta es la página de prelanzamiento de KnowHub. No permite crear cuentas, cargar documentos, grabar audio ni enviar preguntas a una IA. La demo usa contenido ficticio y su estado se conserva solo mientras mantienes la página abierta.</p><h2>Datos de navegación</h2><p>No hemos añadido formularios, herramientas de analítica publicitaria ni cookies de seguimiento a esta presentación. El proveedor de alojamiento, Vercel, puede procesar datos técnicos de las solicitudes, como dirección IP, navegador y registros necesarios para servir y proteger el sitio.</p><h2>Cuando se lance la aplicación</h2><p>Las condiciones del servicio de KnowHub y su política de tratamiento de datos se publicarán antes de habilitar cuentas y carga de contenido. Esta presentación no sustituye esa política.</p></LegalPage>
}
