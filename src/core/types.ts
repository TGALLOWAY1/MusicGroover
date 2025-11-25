/**
 * Core types for MIDI humanization engine
 * Pure TypeScript types - no React dependencies
 */

export type DrumElement = 'kick' | 'snare' | 'hat' | 'percussion' | 'tom' | 'ride'

export interface TimingRule {
  min: number // milliseconds
  max: number // milliseconds
  defaultOffset: number // milliseconds
}

export interface ElementTimingRules {
  kick: TimingRule
  snare: TimingRule
  hat: TimingRule
  percussion: TimingRule
  tom: TimingRule
  ride: TimingRule
}

export interface SwingSettings {
  enabled: boolean
  percentage: number // 0-100
  magnitude: number // milliseconds
  applyTo: DrumElement[]
}

export interface HumanizationParams {
  element: DrumElement
  timingRange: TimingRule
  swing?: SwingSettings
  trackDelay?: number // milliseconds
  seed?: number // for reproducible randomness
}

export interface MIDINote {
  note: number // MIDI note number
  velocity: number
  time: number // timestamp in ticks or seconds
  duration?: number
  element?: DrumElement
}

export interface HumanizedNote extends MIDINote {
  originalTime: number
  humanizedTime: number
  offset: number // milliseconds
}

export interface GroovePreset {
  name: string
  timingRules: ElementTimingRules
  swing?: SwingSettings
  trackDelays?: Record<DrumElement, number>
  seed?: number
}

/**
 * GrooveNote represents a single note event
 */
export interface GrooveNote {
  originalTime: number // in seconds
  newTime: number // in seconds (after humanization)
  velocity: number // 0-127
}

/**
 * GrooveTrack represents a single MIDI pitch with its notes
 * Each unique MIDI note gets its own track
 */
export interface GrooveTrack {
  id: string // Unique identifier (e.g., "midi-36")
  midiNumber: number // MIDI note number (e.g., 38)
  label: string // Display label (e.g., "Ghost Kick" from mapping)
  physicsCategory: 'kick' | 'snare' | 'hats' | 'perc' // Derived helper for humanization algorithms
  notes: GrooveNote[]
}

