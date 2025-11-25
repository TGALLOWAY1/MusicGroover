/**
 * Pure functions for MIDI humanization
 * No side effects, no React dependencies
 */

import type {
  DrumElement,
  TimingRule,
  HumanizationParams,
  MIDINote,
  HumanizedNote,
  SwingSettings,
} from './types'

/**
 * Default timing rules per drum element
 */
export const DEFAULT_TIMING_RULES: Record<DrumElement, TimingRule> = {
  kick: { min: -2, max: 6, defaultOffset: 0 },
  snare: { min: -5, max: 12, defaultOffset: 5 },
  hat: { min: -5, max: 20, defaultOffset: 8 },
  percussion: { min: -10, max: 30, defaultOffset: 10 },
  tom: { min: -3, max: 8, defaultOffset: 0 },
  ride: { min: -5, max: 15, defaultOffset: 5 },
}

/**
 * Seeded random number generator for reproducible randomness
 */
class SeededRandom {
  private seed: number

  constructor(seed: number = Date.now()) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  nextInRange(min: number, max: number): number {
    return min + this.next() * (max - min)
  }
}

/**
 * Calculate swing offset for a note
 */
export function calculateSwingOffset(
  noteIndex: number,
  swing: SwingSettings
): number {
  if (!swing.enabled) return 0

  // Apply swing to odd-positioned notes (1st, 3rd, 5th, etc. in 16th notes)
  if (noteIndex % 2 === 1 && swing.applyTo.length > 0) {
    const swingAmount = ((swing.percentage - 50) / 50) * swing.magnitude
    return swingAmount
  }

  return 0
}

/**
 * Humanize a single MIDI note
 */
export function humanizeNote(
  note: MIDINote,
  params: HumanizationParams
): HumanizedNote {
  const random = new SeededRandom(params.seed)
  const { timingRange, swing, trackDelay = 0 } = params

  // Base random jitter within timing range
  const jitter = random.nextInRange(timingRange.min, timingRange.max)

  // Apply swing if enabled
  let swingOffset = 0
  if (swing && swing.applyTo.includes(params.element)) {
    // Note: This is simplified - in real implementation, noteIndex would be calculated
    // based on the note's position in the measure/pattern
    swingOffset = calculateSwingOffset(0, swing)
  }

  // Combine offsets
  const totalOffset = jitter + swingOffset + trackDelay

  // Convert offset to same units as note.time (assuming ticks or seconds)
  // For now, assuming time is in seconds, so convert ms to seconds
  const offsetInTimeUnits = totalOffset / 1000

  return {
    ...note,
    originalTime: note.time,
    humanizedTime: note.time + offsetInTimeUnits,
    offset: totalOffset,
  }
}

/**
 * Humanize an array of MIDI notes
 */
export function humanizeNotes(
  notes: MIDINote[],
  params: HumanizationParams
): HumanizedNote[] {
  return notes.map((note) => humanizeNote(note, params))
}

/**
 * Constrain offset to maximum allowed deviation per element
 */
export function constrainOffset(
  offset: number,
  element: DrumElement
): number {
  const maxDeviation: Record<DrumElement, number> = {
    kick: 10,
    snare: 12,
    hat: 25,
    percussion: 30,
    tom: 10,
    ride: 15,
  }

  const max = maxDeviation[element]
  return Math.max(-max, Math.min(max, offset))
}

