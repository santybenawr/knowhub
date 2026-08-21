import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })

/**
 * §146 — Demo data.
 *
 * Runs only when `ENABLE_DEMO_DATA=true`, so it can never populate a real
 * deployment by accident. The transcript is original fiction written for this
 * seed; nothing here is presented as production content.
 */

const DEMO_EMAIL = 'demo@knowhub.test'
const DEMO_PASSWORD = 'knowhub-demo-2026'

const DEMO_TRANSCRIPT = `00:00 Santiago: Buenos días. Hoy definimos el proveedor del Proyecto Emprendimiento.
00:14 Laura: Revisé las tres propuestas. La del proveedor B es la más completa.
00:31 Carlos: ¿El proveedor B incluye capacitación para el equipo?
00:44 Laura: Sí, incluye dos sesiones de capacitación y soporte por doce meses.
01:02 Santiago: ¿Y la diferencia de precio con el proveedor A?
01:15 Laura: El proveedor B es un doce por ciento más económico en el primer año.
01:38 Santiago: Entonces vamos a seleccionar el proveedor B.
01:52 Laura: Perfecto. Yo contacto al proveedor mañana para iniciar el contrato.
02:10 Carlos: Tenemos que enviar el informe de avance antes del 30 de agosto.
02:28 Santiago: Queda pendiente definir el presupuesto de la segunda fase.
02:41 Carlos: ¿Alguien sabe si el presupuesto de la segunda fase ya fue aprobado?
02:55 Santiago: Todavía no. Lo revisamos en la próxima reunión.`

const CANVAS_DOC = `Modelo Canvas

El modelo Canvas describe cómo una organización crea, entrega y captura valor, organizado en nueve bloques.

Propuesta de valor
La propuesta de valor explica por qué un cliente elegiría esta oferta y no la de un competidor. Responde a un problema concreto o a una necesidad no atendida.

Segmentos de clientes
Una organización sirve a uno o varios segmentos. Cada segmento tiene necesidades distintas y puede requerir una propuesta de valor diferenciada.

Canales
Los canales describen cómo la empresa se comunica con sus segmentos y les entrega la propuesta de valor: canales propios, de socios, directos o indirectos.

Relación con clientes
Define el tipo de relación que la organización establece: asistencia personal, autoservicio, servicios automatizados o comunidades.

Fuentes de ingreso
Describen de dónde proviene el dinero: venta directa, suscripción, licenciamiento, comisiones o publicidad.

Recursos clave
Los activos indispensables para que el modelo funcione: físicos, intelectuales, humanos o financieros.

Actividades clave
Las acciones más importantes que la empresa debe realizar: producción, resolución de problemas o gestión de una plataforma.

Socios clave
La red de proveedores y aliados que hacen funcionar el modelo, normalmente para optimizar recursos o reducir riesgo.

Estructura de costos
Agrupa los costos fijos y variables de operar el modelo. Un modelo puede estar impulsado por costos o impulsado por valor.`

const ADMIN_DOC = `Principios administrativos

La administración se apoya en cuatro funciones básicas que se ejecutan de forma continua y no secuencial.

Planeación
Consiste en definir objetivos y determinar los cursos de acción para alcanzarlos. Una planeación útil parte de un diagnóstico honesto de la situación actual y establece indicadores verificables.

Organización
Distribuye el trabajo, la autoridad y los recursos entre las personas y las áreas. Define quién hace qué y de quién depende cada decisión.

Dirección
Es la función de influir en las personas para que contribuyan a los objetivos. Involucra comunicación, motivación y liderazgo.

Control
Compara los resultados obtenidos con los planeados y corrige las desviaciones. Sin control, la planeación se vuelve una declaración de intenciones.

Estos principios se aplican en cualquier tipo de organización, con independencia de su tamaño o sector.`

async function main() {
  const { getServerEnv } = await import('../src/config/env')
  const env = getServerEnv()

  if (!env.ENABLE_DEMO_DATA) {
    console.log('[knowhub] ENABLE_DEMO_DATA is not true. Nothing to seed.')
    console.log('[knowhub] Run: ENABLE_DEMO_DATA=true pnpm db:seed')
    return
  }

  const { getDbHandle, getDb } = await import('../src/server/db/client')
  const { eq } = await import('drizzle-orm')
  const { users } = await import('../src/server/db/schema')
  const { signup } = await import('../src/server/auth/service')
  const { createWorkspace } = await import('../src/server/workspaces')
  const { requireWorkspaceAccess } = await import('../src/server/permissions')
  const { createProject } = await import('../src/server/projects')
  const { createNote } = await import('../src/server/notes')
  const { createDocumentFromUpload } = await import('../src/server/documents')
  const { createMeeting, importTranscript } = await import('../src/server/meetings')
  const { drainJobs } = await import('../src/server/jobs')
  const { ensureJobHandlers } = await import('../src/server/jobs/register')

  ensureJobHandlers()
  const handle = await getDbHandle()
  const db = await getDb()

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_EMAIL)).limit(1)
  if (existing[0]) {
    console.log(`[knowhub] Demo user already exists (${DEMO_EMAIL}). Nothing to do.`)
    await handle.close()
    return
  }

  console.log('[knowhub] Creating demo account...')
  const { userId } = await signup({ name: 'Santiago Demo', email: DEMO_EMAIL, password: DEMO_PASSWORD })
  await db.update(users).set({ onboardingCompletedAt: new Date(), recordingConsentAt: new Date() }).where(eq(users.id, userId))

  const workspaceId = await createWorkspace({ userId, name: 'Universidad', type: 'education' })
  await db.update(users).set({ lastWorkspaceId: workspaceId }).where(eq(users.id, userId))
  const access = await requireWorkspaceAccess(userId, workspaceId)

  console.log('[knowhub] Creating projects...')
  const administracion = await createProject({
    access,
    name: 'Administración',
    description: 'Curso de fundamentos de administración.',
    icon: '📚',
  })
  const finanzas = await createProject({
    access,
    name: 'Finanzas',
    description: 'Modelos de negocio y evaluación financiera.',
    icon: '📊',
  })

  console.log('[knowhub] Uploading documents...')
  await createDocumentFromUpload({
    access,
    buffer: Buffer.from(CANVAS_DOC, 'utf8'),
    filename: 'modelo-canvas.md',
    declaredMime: 'text/markdown',
    title: 'Modelo Canvas',
    projectId: finanzas,
  })
  await createDocumentFromUpload({
    access,
    buffer: Buffer.from(ADMIN_DOC, 'utf8'),
    filename: 'principios-administrativos.md',
    declaredMime: 'text/markdown',
    title: 'Principios Administrativos',
    projectId: administracion,
  })

  console.log('[knowhub] Creating a note...')
  await createNote({
    access,
    title: 'Ideas para el proyecto final',
    content:
      'El proyecto final puede combinar el modelo Canvas con los cuatro principios administrativos. ' +
      'La propuesta de valor se conecta con la planeación, y la estructura de costos con el control. ' +
      'Falta decidir si el caso de estudio será una empresa real o una hipotética.',
    projectId: finanzas,
  })

  console.log('[knowhub] Creating a meeting with an imported transcript...')
  const meetingId = await createMeeting({
    access,
    title: 'Reunión Proyecto Emprendimiento',
    projectId: administracion,
    source: 'transcript_import',
    participants: ['Santiago', 'Laura', 'Carlos'],
    language: 'es',
  })
  await importTranscript({ access, meetingId, transcript: DEMO_TRANSCRIPT })

  console.log('[knowhub] Processing (transcription, analysis, embeddings)...')
  await drainJobs()

  console.log('')
  console.log('[knowhub] Demo data ready.')
  console.log(`  email:    ${DEMO_EMAIL}`)
  console.log(`  password: ${DEMO_PASSWORD}`)
  console.log('')
  console.log('  Try: "¿Qué decidimos sobre el proveedor?" in Preguntar a KnowHub.')

  await handle.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
