import { describe, expect, it } from 'vitest'
import {
  classifyMediaError,
  initialRecorderContext,
  recorderReducer,
  shouldWarnBeforeUnload,
  type RecorderContext,
  type RecorderEvent,
} from '@/features/meetings/recording/recorder-machine'

function run(events: RecorderEvent[], from: RecorderContext = initialRecorderContext) {
  return events.reduce(recorderReducer, from)
}

const grant: RecorderEvent[] = [
  { type: 'REQUEST_PERMISSION' },
  { type: 'PERMISSION_GRANTED', mimeType: 'audio/webm' },
]

describe('recorder state machine', () => {
  it('walks the full happy path: permission, record, pause, resume, stop, upload', () => {
    const result = run([
      ...grant,
      { type: 'START' },
      { type: 'TICK', seconds: 12 },
      { type: 'PAUSE' },
      { type: 'RESUME' },
      { type: 'TICK', seconds: 30 },
      { type: 'STOP' },
      { type: 'UPLOAD_START' },
      { type: 'UPLOAD_PROGRESS', progress: 50 },
      { type: 'UPLOAD_DONE' },
    ])

    expect(result.state).toBe('completed')
    expect(result.elapsedSeconds).toBe(30)
    expect(result.uploadProgress).toBe(100)
  })

  it('refuses to start before permission has been granted', () => {
    expect(run([{ type: 'START' }]).state).toBe('idle')
  })

  it('does not advance the clock while paused', () => {
    const paused = run([...grant, { type: 'START' }, { type: 'TICK', seconds: 10 }, { type: 'PAUSE' }])
    const stillPaused = recorderReducer(paused, { type: 'TICK', seconds: 40 })
    expect(stillPaused.elapsedSeconds).toBe(10)
  })

  it('keeps counting chunks that arrive after stop, so the tail is not lost', () => {
    const stopping = run([
      ...grant,
      { type: 'START' },
      { type: 'CHUNK', bytes: 1000 },
      { type: 'STOP' },
      { type: 'CHUNK', bytes: 500 },
    ])
    expect(stopping.state).toBe('stopping')
    expect(stopping.chunkCount).toBe(2)
    expect(stopping.capturedBytes).toBe(1500)
  })

  it('ignores a second START, so one session cannot record twice', () => {
    const recording = run([...grant, { type: 'START' }, { type: 'TICK', seconds: 8 }])
    const again = recorderReducer(recording, { type: 'START' })
    expect(again.elapsedSeconds).toBe(8)
    expect(again).toBe(recording)
  })

  it('records a failure from any state and can be reset', () => {
    const failed = run([...grant, { type: 'START' }, { type: 'FAIL', code: 'recorder_failed', message: 'boom' }])
    expect(failed.state).toBe('error')
    expect(failed.error?.code).toBe('recorder_failed')
    expect(recorderReducer(failed, { type: 'RESET' })).toEqual(initialRecorderContext)
  })

  it('warns before unload while audio could still be lost', () => {
    expect(shouldWarnBeforeUnload('recording')).toBe(true)
    expect(shouldWarnBeforeUnload('paused')).toBe(true)
    expect(shouldWarnBeforeUnload('uploading')).toBe(true)
    expect(shouldWarnBeforeUnload('completed')).toBe(false)
    expect(shouldWarnBeforeUnload('idle')).toBe(false)
  })
})

describe('media error classification', () => {
  it.each([
    ['NotAllowedError', 'permission_denied'],
    ['SecurityError', 'permission_denied'],
    ['NotFoundError', 'no_microphone'],
    ['NotReadableError', 'microphone_busy'],
    ['SomethingElse', 'recorder_failed'],
  ])('maps %s to %s', (name, expected) => {
    expect(classifyMediaError({ name })).toBe(expected)
  })
})
