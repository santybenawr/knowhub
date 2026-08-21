'use client'

import * as React from 'react'
import {
  classifyMediaError,
  initialRecorderContext,
  recorderReducer,
  RECORDER_ERROR_MESSAGES,
  shouldWarnBeforeUnload,
  type RecorderContext,
  type RecorderErrorCode,
} from './recorder-machine'

/**
 * §60/§67/§174 — Browser audio capture.
 *
 * `MediaRecorder` lives only here, behind the pure state machine. Audio is
 * captured with a timeslice so long meetings arrive as a sequence of blobs
 * rather than one buffer held open for hours, and so a crash mid-recording
 * still leaves the chunks already flushed (§177).
 */

/** §195 — Pick a container the browser actually implements; never assume. */
const CANDIDATE_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
]

const TIMESLICE_MS = 5000

export function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  for (const type of CANDIDATE_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  // Some browsers implement MediaRecorder but report no supported type; letting
  // them pick their own default is better than refusing to record.
  return ''
}

export function isRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  )
}

export type UseRecorderOptions = {
  onComplete: (blob: Blob, durationSeconds: number) => Promise<void>
}

export type UseRecorderResult = {
  context: RecorderContext
  /** 0–1 microphone activity, for the level indicator (§66). */
  level: number
  requestPermission: () => Promise<void>
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => Promise<void>
  reset: () => void
}

export function useRecorder({ onComplete }: UseRecorderOptions): UseRecorderResult {
  const [context, dispatch] = React.useReducer(recorderReducer, initialRecorderContext)
  const [level, setLevel] = React.useState(0)

  const streamRef = React.useRef<MediaStream | null>(null)
  const recorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const audioContextRef = React.useRef<AudioContext | null>(null)
  const animationRef = React.useRef<number | null>(null)
  const startedAtRef = React.useRef<number>(0)
  const accumulatedRef = React.useRef<number>(0)
  const onCompleteRef = React.useRef(onComplete)

  React.useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const fail = React.useCallback((code: RecorderErrorCode, message?: string) => {
    dispatch({ type: 'FAIL', code, message: message ?? RECORDER_ERROR_MESSAGES[code] })
  }, [])

  const teardown = React.useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
    animationRef.current = null
    void audioContextRef.current?.close().catch(() => undefined)
    audioContextRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
    setLevel(0)
  }, [])

  React.useEffect(() => teardown, [teardown])

  /** §68/§188 — Warn before navigating away mid-recording. */
  React.useEffect(() => {
    if (!shouldWarnBeforeUnload(context.state)) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [context.state])

  /** §65 — Timer driven by wall clock, so a throttled tab cannot drift. */
  React.useEffect(() => {
    if (context.state !== 'recording') return
    const interval = setInterval(() => {
      const seconds = accumulatedRef.current + (Date.now() - startedAtRef.current) / 1000
      dispatch({ type: 'TICK', seconds: Math.floor(seconds) })
    }, 250)
    return () => clearInterval(interval)
  }, [context.state])

  const monitorLevel = React.useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const audioContext = new AudioCtx()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let peak = 0
        for (const value of data) peak = Math.max(peak, Math.abs(value - 128) / 128)
        setLevel(peak)
        animationRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      // The level meter is decorative; losing it must not stop the recording.
    }
  }, [])

  const requestPermission = React.useCallback(async () => {
    if (!isRecordingSupported()) {
      fail('unsupported_browser')
      return
    }
    dispatch({ type: 'REQUEST_PERMISSION' })
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      streamRef.current = stream
      monitorLevel(stream)
      dispatch({ type: 'PERMISSION_GRANTED', mimeType: pickMimeType() ?? '' })
    } catch (error) {
      teardown()
      fail(classifyMediaError(error))
    }
  }, [fail, monitorLevel, teardown])

  const start = React.useCallback(() => {
    const stream = streamRef.current
    if (!stream) {
      fail('recorder_failed')
      return
    }

    try {
      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      accumulatedRef.current = 0
      startedAtRef.current = Date.now()

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
          dispatch({ type: 'CHUNK', bytes: event.data.size })
        }
      }
      recorder.onerror = () => fail('recorder_failed')

      recorder.start(TIMESLICE_MS)
      recorderRef.current = recorder
      dispatch({ type: 'START' })
    } catch {
      fail('recorder_failed')
    }
  }, [fail])

  const pause = React.useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return
    recorder.pause()
    accumulatedRef.current += (Date.now() - startedAtRef.current) / 1000
    dispatch({ type: 'PAUSE' })
  }, [])

  const resume = React.useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'paused') return
    recorder.resume()
    startedAtRef.current = Date.now()
    dispatch({ type: 'RESUME' })
  }, [])

  const stop = React.useCallback(async () => {
    const recorder = recorderRef.current
    if (!recorder) return

    const elapsed =
      recorder.state === 'paused'
        ? accumulatedRef.current
        : accumulatedRef.current + (Date.now() - startedAtRef.current) / 1000

    dispatch({ type: 'STOP' })

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
    })
    recorder.stop()
    await stopped
    teardown()

    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
    if (blob.size === 0) {
      fail('empty_recording')
      return
    }

    dispatch({ type: 'UPLOAD_START' })
    try {
      await onCompleteRef.current(blob, Math.max(1, Math.round(elapsed)))
      dispatch({ type: 'UPLOAD_DONE' })
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined
      fail('upload_failed', message)
    }
  }, [fail, teardown])

  const reset = React.useCallback(() => {
    teardown()
    chunksRef.current = []
    dispatch({ type: 'RESET' })
  }, [teardown])

  return { context, level, requestPermission, start, pause, resume, stop, reset }
}
