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
 * GrooveTrack represents a track of notes for a specific drum instrument
 */
export interface GrooveTrack {
  instrument: 'kick' | 'snare' | 'hats'
  notes: {
    originalTime: number // in seconds
    newTime: number // in seconds (after humanization)
    velocity: number // 0-127
  }[]
}

