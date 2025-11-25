/**
 * MidiEngine - Core MIDI parsing and humanization engine
 * Pure TypeScript class with no React dependencies
 */

import { Midi } from '@tonejs/midi'
import type { GrooveTrack } from './types'

/**
 * MIDI note number mappings for GM (General MIDI) drum kit
 * Standard drum mapping for identifying kick, snare, and hi-hats
 */
const DRUM_MAPPING = {
  kick: [35, 36], // Acoustic Bass Drum (35), Bass Drum 1 (36)
  snare: [38, 40], // Acoustic Snare (38), Electric Snare (40)
  hats: [42, 44, 46], // Closed Hi-Hat (42), Pedal Hi-Hat (44), Open Hi-Hat (46)
} as const

/**
 * Humanization parameters for the humanize() method
 */
export interface HumanizationParams {
  kickTightness: number // Standard deviation in milliseconds for kick timing jitter
  snareLag: number // Mean delay in milliseconds for snare (typically positive for "late" feel)
  globalSwing: number // Swing percentage (0-100), where 50 = no swing, >50 = swung
}

/**
 * Box-Muller transform state for Gaussian random number generation
 */
class GaussianRandom {
  private spare: number | null = null
  private hasSpare = false
  private seed: number

  constructor(seed?: number) {
    this.seed = seed ?? Date.now()
  }

  /**
   * Seeded random number generator (linear congruential generator)
   */
  private random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  /**
   * Generate a Gaussian random number using Box-Muller transform
   * @param mean Mean of the distribution
   * @param stdDev Standard deviation of the distribution
   * @returns Gaussian random number
   */
  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    if (this.hasSpare) {
      this.hasSpare = false
      return this.spare! * stdDev + mean
    }

    this.hasSpare = true

    let u: number, v: number, s: number
    do {
      u = 2.0 * this.random() - 1.0
      v = 2.0 * this.random() - 1.0
      s = u * u + v * v
    } while (s >= 1.0 || s === 0.0)

    const multiplier = Math.sqrt(-2.0 * Math.log(s) / s)
    this.spare = v * multiplier
    return (u * multiplier) * stdDev + mean
  }
}

/**
 * MidiEngine - Parses MIDI files and applies humanization
 */
export class MidiEngine {
  private midi: Midi | null = null
  private tracks: GrooveTrack[] = []
  private gaussianRandom: GaussianRandom

  constructor(seed?: number) {
    this.gaussianRandom = new GaussianRandom(seed)
  }

  /**
   * Parse a MIDI file from an ArrayBuffer
   * @param buffer ArrayBuffer containing MIDI file data
   * @returns Array of GrooveTrack objects
   */
  parse(buffer: ArrayBuffer): GrooveTrack[] {
    try {
      // @tonejs/midi constructor accepts ArrayBuffer
      this.midi = new Midi(buffer)
      this.tracks = this.convertToGrooveTracks()
      return this.tracks
    } catch (error) {
      throw new Error(`Failed to parse MIDI file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert parsed MIDI tracks into GrooveTrack format
   * Groups notes by instrument (kick, snare, hats) based on MIDI note numbers
   */
  private convertToGrooveTracks(): GrooveTrack[] {
    const trackMap: Map<'kick' | 'snare' | 'hats', GrooveTrack['notes']> = new Map([
      ['kick', []],
      ['snare', []],
      ['hats', []],
    ])

    // Process all tracks
    this.midi!.tracks.forEach((track) => {
      track.notes.forEach((note) => {
        const midiNote = note.midi
        let instrument: 'kick' | 'snare' | 'hats' | null = null

        // Identify instrument by MIDI note number
        if (DRUM_MAPPING.kick.includes(midiNote)) {
          instrument = 'kick'
        } else if (DRUM_MAPPING.snare.includes(midiNote)) {
          instrument = 'snare'
        } else if (DRUM_MAPPING.hats.includes(midiNote)) {
          instrument = 'hats'
        }

        if (instrument) {
          const notes = trackMap.get(instrument)!
          notes.push({
            originalTime: note.time, // @tonejs/midi provides time in seconds
            newTime: note.time, // Will be updated by humanize()
            velocity: note.velocity * 127, // Convert from 0-1 to 0-127
          })
        }
      })
    })

    // Sort notes by time within each track
    trackMap.forEach((notes) => {
      notes.sort((a, b) => a.originalTime - b.originalTime)
    })

    // Convert to GrooveTrack array
    const tracks: GrooveTrack[] = []
    trackMap.forEach((notes, instrument) => {
      if (notes.length > 0) {
        tracks.push({
          instrument,
          notes,
        })
      }
    })

    return tracks
  }

  /**
   * Apply humanization to the parsed tracks
   * @param params Humanization parameters (kickTightness, snareLag, globalSwing)
   * @returns Array of humanized GrooveTrack objects
   */
  humanize(params: HumanizationParams): GrooveTrack[] {
    if (!this.midi || this.tracks.length === 0) {
      throw new Error('No MIDI data loaded. Call parse() first.')
    }

    const humanizedTracks: GrooveTrack[] = this.tracks.map((track) => {
      const humanizedNotes = track.notes.map((note, index) => {
        let timingOffset = 0 // in milliseconds

        // Apply instrument-specific humanization
        if (track.instrument === 'kick') {
          // Kick: Gaussian jitter with specified tightness (stdDev)
          timingOffset = this.gaussianRandom.nextGaussian(0, params.kickTightness)
        } else if (track.instrument === 'snare') {
          // Snare: Gaussian jitter + lag (mean delay)
          timingOffset = this.gaussianRandom.nextGaussian(params.snareLag, params.kickTightness * 1.5)
        } else if (track.instrument === 'hats') {
          // Hats: Slightly looser jitter, can be late for pocket
          timingOffset = this.gaussianRandom.nextGaussian(params.snareLag * 0.5, params.kickTightness * 2)
        }

        // Apply swing if enabled (globalSwing > 50)
        if (params.globalSwing > 50) {
          const swingOffset = this.calculateSwingOffset(note.originalTime, index, params.globalSwing)
          timingOffset += swingOffset
        }

        // Convert milliseconds to seconds and apply offset
        const offsetInSeconds = timingOffset / 1000
        const newTime = note.originalTime + offsetInSeconds

        return {
          ...note,
          newTime: Math.max(0, newTime), // Ensure time doesn't go negative
        }
      })

      return {
        ...track,
        notes: humanizedNotes,
      }
    })

    return humanizedTracks
  }

  /**
   * Calculate swing offset for a note based on its position
   * Swing affects odd-positioned 16th notes (1st, 3rd, 5th, etc.)
   * @param time Original time in seconds
   * @param noteIndex Index of the note in the track
   * @param swingPercentage Swing percentage (50-100)
   * @returns Swing offset in milliseconds
   */
  private calculateSwingOffset(time: number, noteIndex: number, swingPercentage: number): number {
    // Determine if this is an odd-positioned 16th note
    // Assuming 4/4 time at 120 BPM default, calculate position within a beat
    const defaultBPM = 120
    const beatsPerSecond = defaultBPM / 60
    const secondsPerBeat = 1 / beatsPerSecond
    const positionInBeat = (time % secondsPerBeat) / secondsPerBeat

    // Check if this is approximately on an odd 16th note position
    // Odd 16th notes are at 0.25, 0.75 within a beat (the "and" of the beat)
    const isOdd16th = Math.abs(positionInBeat - 0.25) < 0.1 || Math.abs(positionInBeat - 0.75) < 0.1

    if (isOdd16th) {
      // Apply swing: delay odd-positioned notes
      // Swing percentage: 50 = no swing, 100 = maximum swing
      const swingAmount = ((swingPercentage - 50) / 50) * 20 // Max 20ms swing
      return swingAmount
    }

    return 0
  }

  /**
   * Get the parsed MIDI object (for advanced access)
   */
  getMidi(): Midi | null {
    return this.midi
  }

  /**
   * Get the current tracks (before or after humanization)
   */
  getTracks(): GrooveTrack[] {
    return this.tracks
  }

  /**
   * Export humanized tracks to a MIDI file
   * @param humanizedTracks The humanized GrooveTrack array with modified timestamps
   * @returns ArrayBuffer of the MIDI file data
   */
  exportMidi(humanizedTracks: GrooveTrack[]): ArrayBuffer {
    if (!this.midi) {
      throw new Error('No MIDI data loaded. Parse a MIDI file first.')
    }

    // Create a new MIDI object
    const exportMidi = new Midi()

    // Create a map to track which notes have been updated
    // Key: instrument-originalTime, Value: newTime
    const noteUpdateMap = new Map<string, number>()
    
    // Build map of humanized note times
    humanizedTracks.forEach((track) => {
      track.notes.forEach((note) => {
        // Create a unique key: instrument + originalTime (rounded to avoid floating point issues)
        const key = `${track.instrument}-${note.originalTime.toFixed(6)}`
        noteUpdateMap.set(key, note.newTime)
      })
    })

    // Process each track from the original MIDI
    this.midi.tracks.forEach((originalTrack) => {
      const newTrack = exportMidi.addTrack()
      
      // Copy track name if it exists
      if (originalTrack.name) {
        newTrack.name = originalTrack.name
      }

      // Process notes and update their times
      originalTrack.notes.forEach((note) => {
        const midiNote = note.midi
        let instrument: 'kick' | 'snare' | 'hats' | null = null

        // Identify instrument by MIDI note number
        if (DRUM_MAPPING.kick.includes(midiNote)) {
          instrument = 'kick'
        } else if (DRUM_MAPPING.snare.includes(midiNote)) {
          instrument = 'snare'
        } else if (DRUM_MAPPING.hats.includes(midiNote)) {
          instrument = 'hats'
        }

        // If this note belongs to a humanized instrument, use the new time
        let noteTime = note.time
        if (instrument) {
          const key = `${instrument}-${note.time.toFixed(6)}`
          const newTime = noteUpdateMap.get(key)
          if (newTime !== undefined) {
            noteTime = newTime
          }
        }

        // Add note with updated time
        newTrack.addNote({
          midi: midiNote,
          time: noteTime,
          duration: note.duration,
          velocity: note.velocity,
        })
      })
    })

    // Convert to binary ArrayBuffer using toArray()
    const midiArray = exportMidi.toArray()
    return new Uint8Array(midiArray).buffer
  }

  /**
   * Reset the engine and clear parsed data
   */
  reset(): void {
    this.midi = null
    this.tracks = []
    this.gaussianRandom = new GaussianRandom()
  }
}

