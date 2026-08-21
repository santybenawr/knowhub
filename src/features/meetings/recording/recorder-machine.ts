/**
 * §62/§199 — Recording state machine.
 *
 * A pure reducer, deliberately separate from `MediaRecorder`, so the whole
 * lifecycle (including the failure paths that are awkward to reproduce with
 * real hardware) is unit-testable in Node. The hook in `use-recorder.ts` is the
 * only place that touches browser APIs.
 */

export type RecorderState =
  | 'idle'
  | 'requesting_permission'
  | 'ready'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'uploading'
  | 'completed'
  | 'error'

export type RecorderErrorCode =
  | 'permission_denied'
  | 'no_microphone'
  | 'unsupported_browser'
  | 'microphone_busy'
  | 'recorder_failed'
  | 'upload_failed'
  | 'empty_recording'

export type RecorderContext = {
  state: RecorderState
  /** Seconds of captured audio, excluding paused time. */
  elapsedSeconds: number
  /** Bytes captured so far, so the UI can show real progress. */
  capturedBytes: number
  chunkCount: number
  error: { code: RecorderErrorCode; message: string } | null
  uploadProgress: number
  mimeType: string | null
}

export type RecorderEvent =
  | { type: 'REQUEST_PERMISSION' }
  | { type: 'PERMISSION_GRANTED'; mimeType: string }
  | { type: 'FAIL'; code: RecorderErrorCode; message: string }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'TICK'; seconds: number }
  | { type: 'CHUNK'; bytes: number }
  | { type: 'STOP' }
  | { type: 'UPLOAD_START' }
  | { type: 'UPLOAD_PROGRESS'; progress: number }
  | { type: 'UPLOAD_DONE' }
  | { type: 'RESET' }

export const initialRecorderContext: RecorderContext = {
  state: 'idle',
  elapsedSeconds: 0,
  capturedBytes: 0,
  chunkCount: 0,
  error: null,
  uploadProgress: 0,
  mimeType: null,
}

/** §64 — Only these transitions exist; anything else is ignored. */
export function recorderReducer(context: RecorderContext, event: RecorderEvent): RecorderContext {
  switch (event.type) {
    case 'REQUEST_PERMISSION':
      if (context.state !== 'idle' && context.state !== 'error') return context
      return { ...initialRecorderContext, state: 'requesting_permission' }

    case 'PERMISSION_GRANTED':
      if (context.state !== 'requesting_permission') return context
      return { ...context, state: 'ready', mimeType: event.mimeType, error: null }

    case 'FAIL':
      return { ...context, state: 'error', error: { code: event.code, message: event.message } }

    case 'START':
      if (context.state !== 'ready') return context
      return { ...context, state: 'recording', elapsedSeconds: 0, capturedBytes: 0, chunkCount: 0 }

    case 'PAUSE':
      if (context.state !== 'recording') return context
      return { ...context, state: 'paused' }

    case 'RESUME':
      if (context.state !== 'paused') return context
      return { ...context, state: 'recording' }

    case 'TICK':
      // The clock only advances while actually capturing (§65).
      if (context.state !== 'recording') return context
      return { ...context, elapsedSeconds: event.seconds }

    case 'CHUNK':
      // Chunks can still arrive during `stopping`: MediaRecorder flushes its
      // buffer after stop() and losing that tail would truncate the recording.
      if (context.state !== 'recording' && context.state !== 'paused' && context.state !== 'stopping') {
        return context
      }
      return {
        ...context,
        capturedBytes: context.capturedBytes + event.bytes,
        chunkCount: context.chunkCount + 1,
      }

    case 'STOP':
      if (context.state !== 'recording' && context.state !== 'paused') return context
      return { ...context, state: 'stopping' }

    case 'UPLOAD_START':
      if (context.state !== 'stopping') return context
      return { ...context, state: 'uploading', uploadProgress: 0 }

    case 'UPLOAD_PROGRESS':
      if (context.state !== 'uploading') return context
      return { ...context, uploadProgress: Math.min(100, Math.max(0, event.progress)) }

    case 'UPLOAD_DONE':
      if (context.state !== 'uploading') return context
      return { ...context, state: 'completed', uploadProgress: 100 }

    case 'RESET':
      return initialRecorderContext

    default:
      return context
  }
}

export function isActiveRecording(state: RecorderState): boolean {
  return state === 'recording' || state === 'paused' || state === 'stopping'
}

/** §68 — States during which leaving the page risks losing captured audio. */
export function shouldWarnBeforeUnload(state: RecorderState): boolean {
  return state === 'recording' || state === 'paused' || state === 'stopping' || state === 'uploading'
}

/** §61 — Every failure gets a message a person can act on. */
export const RECORDER_ERROR_MESSAGES: Record<RecorderErrorCode, string> = {
  permission_denied:
    'No autorizaste el micrófono. Permite el acceso desde la configuración del navegador y vuelve a intentarlo.',
  no_microphone: 'No encontramos un micrófono conectado a este dispositivo.',
  unsupported_browser:
    'Tu navegador no permite grabar directamente desde KnowHub. Puedes subir una grabación o importar una transcripción.',
  microphone_busy:
    'El micrófono está en uso por otra aplicación. Ciérrala e intenta de nuevo.',
  recorder_failed: 'La grabación se interrumpió inesperadamente.',
  upload_failed: 'No pudimos subir el audio. Revisa tu conexión e intenta de nuevo.',
  empty_recording: 'No se capturó audio. Verifica que el micrófono esté activo.',
}

/**
 * §61 — Maps a `getUserMedia` rejection to one of our codes. The DOM error
 * names are the reliable signal; messages vary between browsers.
 */
export function classifyMediaError(error: unknown): RecorderErrorCode {
  const name = (error as { name?: string } | null)?.name ?? ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'permission_denied'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'no_microphone'
    case 'NotReadableError':
    case 'AbortError':
      return 'microphone_busy'
    default:
      return 'recorder_failed'
  }
}
