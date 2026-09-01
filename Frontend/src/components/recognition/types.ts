/* =============================================================
   RECOGNITION TYPES  (public recognition camera)

   The recognition-result / camera shapes are owned by
   services/recognitionService and re-exported here.
============================================================= */

import type { RecognitionResult } from '../../services/recognitionService'

export type {
  RecognitionCamera,
  RecognitionResult,
} from '../../services/recognitionService'

// The public recognition state machine (auto + manual share it).
//   starting     camera stream not live yet
//   scanning     idle: auto waits for the interval; manual waits
//                for the person to press Recognise
//   checking     a recognition request is in flight
//   result_hold  showing a non-match result briefly, no calls
//   watching     showing a matched person; no calls; waiting for
//                the person to leave the frame before scanning
//   unavailable  the camera was disabled / removed mid-session
export type PublicRecognitionPhase =
  | 'starting'
  | 'scanning'
  | 'checking'
  | 'result_hold'
  | 'watching'
  | 'unavailable'

export type RecognitionOutcome =
  | { kind: 'idle' }
  | { kind: 'no_face' }
  | { kind: 'multi_face' }
  | {
      kind: 'matched'
      result: RecognitionResult
    }
  | { kind: 'no_match'; distance: number }
  | { kind: 'error'; message: string }

// Why the camera could not be used (from a backend 404 on
// GET /cameras/slug/{slug}, told apart by the detail text).
export type CameraUnavailableKind =
  | 'notfound'
  | 'unavailable'
