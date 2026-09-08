import type { Metadata } from 'next'
import { LegalPage } from '@/components/shared/legal'

export const metadata: Metadata = { title: 'Sobre esta presentación' }

export default function TermsPage() {
  return <LegalPage title="Sobre esta presentación" updatedAt="8 de septiembre de 2026"><p>KnowHub se encuentra en etapa de prelanzamiento. Esta página presenta el concepto de la aplicación y un recorrido ilustrativo. Todavía no se ofrece aquí acceso al servicio, compra de planes ni una fecha de lanzamiento.</p><h2>Contenido de la demo</h2><p>El Proyecto Omega y la conversación de la demo son ejemplos ficticios. Las respuestas se muestran desde contenido preparado; no se generan con una IA en vivo. La interfaz es una presentación del recorrido del producto y puede evolucionar antes del lanzamiento.</p><h2>Alcance</h2><p>Esta página no constituye una garantía de disponibilidad, precisión de respuestas o conservación de información. Los términos definitivos de la aplicación se comunicarán antes de su apertura.</p></LegalPage>
}
