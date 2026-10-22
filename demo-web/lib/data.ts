import { z } from 'zod'

export const segmentSchema = z.object({
  time: z.string(),
  speaker: z.string(),
  text: z.string(),
})
export const resourceSchema = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum(['document', 'note', 'meeting']),
  title: z.string().max(160),
  project: z.string().max(80),
  content: z.string().max(20000),
  summary: z.string().max(20000),
  segments: z.array(segmentSchema).max(100).optional(),
  tasks: z
    .array(
      z.object({
        text: z.string(),
        owner: z.string(),
        due: z.string(),
        done: z.boolean(),
        source: z.number().int().nonnegative(),
      }),
    )
    .max(100)
    .optional(),
  decisions: z
    .array(
      z.object({ text: z.string(), source: z.number().int().nonnegative() }),
    )
    .max(100)
    .optional(),
})
export const stateSchema = z.object({
  version: z.literal(1),
  resources: z.array(resourceSchema).max(100),
  projects: z.array(z.string().min(1).max(80)).max(30),
  name: z.string().min(1).max(80),
  dark: z.boolean(),
})
export type Resource = z.infer<typeof resourceSchema>
export type DemoState = z.infer<typeof stateSchema>
export const kindLabels = {
  document: 'Documento',
  note: 'Nota',
  meeting: 'Reunión',
} as const
export const meetingExample: Resource = {
  id: 'reunion-emprendimiento',
  kind: 'meeting',
  title: 'Reunión Proyecto Emprendimiento',
  project: 'Administración',
  content: '',
  summary:
    'El equipo comparó dos proveedores y seleccionó al proveedor B por su menor costo y un plazo de entrega de cinco días. Laura solicitará la cotización final. El informe y la revisión del presupuesto siguen pendientes.',
  segments: [
    {
      time: '00:00',
      speaker: 'Santiago',
      text: 'Hoy revisamos la selección del proveedor para el proyecto de emprendimiento y las tareas de la semana.',
    },
    {
      time: '00:42',
      speaker: 'Laura',
      text: 'El proveedor A cuesta 3 millones de pesos y entrega en diez días. El proveedor B cuesta 2,5 millones de pesos y entrega en cinco días.',
    },
    {
      time: '01:38',
      speaker: 'Santiago',
      text: 'Decidimos seleccionar al proveedor B por su menor costo y su plazo de entrega de cinco días.',
    },
    {
      time: '02:15',
      speaker: 'Laura',
      text: 'Yo, Laura, contactaré al proveedor B el 21 de octubre de 2026 para solicitar la cotización final.',
    },
    {
      time: '03:10',
      speaker: 'Andrés',
      text: 'Yo, Andrés, entregaré el informe del proyecto antes del 30 de octubre de 2026.',
    },
    {
      time: '04:00',
      speaker: 'Santiago',
      text: 'Queda pendiente revisar el presupuesto. Todavía no definimos quién lo hará ni una fecha de entrega.',
    },
  ],
  decisions: [
    {
      text: 'Seleccionar al proveedor B por costo y tiempo de entrega.',
      source: 2,
    },
  ],
  tasks: [
    {
      text: 'Solicitar la cotización final al proveedor B.',
      owner: 'Laura',
      due: '21 oct 2026',
      done: false,
      source: 3,
    },
    {
      text: 'Entregar el informe del proyecto.',
      owner: 'Andrés',
      due: 'Antes del 30 oct 2026',
      done: false,
      source: 4,
    },
    {
      text: 'Revisar el presupuesto.',
      owner: 'Sin responsable',
      due: 'Sin fecha definida',
      done: false,
      source: 5,
    },
  ],
}
export const canvasExample: Resource = {
  id: 'modelo-canvas',
  kind: 'document',
  title: 'Modelo Canvas',
  project: 'Finanzas',
  summary:
    'El modelo Canvas organiza un negocio en nueve bloques. En el ejemplo de KnowHub, la propuesta de valor consiste en reunir información dispersa y facilitar consultas con fuentes.',
  content:
    'El modelo Canvas es una herramienta para describir cómo una organización crea, entrega y captura valor.\n\nSus nueve bloques son: segmentos de clientes, propuesta de valor, canales, relaciones con clientes, fuentes de ingresos, recursos clave, actividades clave, socios clave y estructura de costos.\n\nEn este ejemplo ficticio, KnowHub se dirige a estudiantes y equipos pequeños. Su propuesta de valor es organizar documentos, notas y reuniones en un solo lugar, para recuperar información con evidencia.\n\nLos canales propuestos son una aplicación web y recomendaciones entre estudiantes. Los recursos clave incluyen la plataforma, la información organizada y el equipo de desarrollo.\n\nLas posibles fuentes de ingresos son suscripciones. La estructura de costos contempla infraestructura, desarrollo y soporte. Estos elementos son hipótesis del ejercicio, no resultados de una operación comercial.',
}
export const SEED: DemoState = {
  version: 1,
  name: 'Visitante',
  dark: false,
  projects: ['Finanzas', 'Administración'],
  resources: [
    meetingExample,
    canvasExample,
    {
      id: 'principios-administrativos',
      kind: 'document',
      title: 'Principios Administrativos',
      project: 'Administración',
      summary:
        'Las cuatro funciones del proceso administrativo son planear, organizar, dirigir y controlar.',
      content:
        'El proceso administrativo comprende cuatro funciones: planear, organizar, dirigir y controlar.\n\nPlanear consiste en definir objetivos y las acciones necesarias para alcanzarlos. Organizar implica distribuir recursos, tareas y responsabilidades. Dirigir consiste en coordinar y orientar a las personas. Controlar implica comparar los resultados con los objetivos y corregir desviaciones.\n\nEn un proyecto académico, estas funciones ayudan a repartir el trabajo, establecer fechas y revisar el avance del equipo.',
    },
    {
      id: 'ideas-proyecto',
      kind: 'note',
      title: 'Ideas para el proyecto final',
      project: 'Administración',
      summary: '',
      content:
        'Objetivo: presentar una herramienta que reúna documentos, notas y reuniones.\n\nEn la exposición mostraremos: biblioteca, consultas con fuentes y decisiones de una reunión.\n\nRecordatorio: diferenciar el prototipo de las funciones que todavía requieren servicios reales.',
    },
  ],
}
export function resourceText(resource: Resource) {
  return [
    resource.title,
    resource.content,
    ...(resource.segments?.map((s) => s.text) ?? []),
  ].join('\n')
}
const STOP = new Set(
  'a al algo antes como con cual cuales cuando de del desde donde el ella en es esta este estos estas fue ha hay la las le lo los me mi o para por porque que quien se si sin son su sus un una unos unas y yo podemos puede vamos sobre debo debes necesito cuanto saber informacion explica explicar dime dame'.split(
    ' ',
  ),
)
function tokens(value: string) {
  return [
    ...new Set(
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .match(/[a-z0-9]+/g) ?? [],
    ),
  ].filter((t) => t.length > 2 && !STOP.has(t))
}
export type Evidence = { resource: Resource; text: string; segment?: number }
export function findEvidence(
  question: string,
  resources: Resource[],
): Evidence[] {
  const wanted = tokens(question)
  if (!wanted.length) return []
  return resources
    .flatMap((resource) => {
      const chunks: { text: string; segment?: number }[] =
        resource.kind === 'meeting'
          ? (resource.segments ?? []).map((s, segment) => ({
              text: s.text,
              segment,
            }))
          : resource.content
              .split(/\n+/)
              .filter(Boolean)
              .map((text) => ({ text }))
      return chunks.map((chunk) => ({
        ...chunk,
        resource,
        score: wanted.filter((word) => tokens(chunk.text).includes(word))
          .length,
      }))
    })
    .filter((hit) => hit.score / wanted.length >= 0.75)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ score: _score, ...hit }) => hit)
}
export function resourceHref(resource: Resource, segment?: number) {
  return `#/resource/${encodeURIComponent(resource.id)}${segment === undefined ? '' : `?tab=transcripcion&source=${segment}`}`
}
