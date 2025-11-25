/**
 * MidiEngine - Core MIDI parsing and humanization engine
 * Pure TypeScript class with no React dependencies
 */

import { Midi } from '@tonejs/midi'
import type { GrooveTrack, GrooveNote } from './types'
import { GET_LANE_TYPE, DEV_NOTE_MAPPING } from '../config/mappings'

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
  snareRandomness: number // Standard deviation in milliseconds for snare timing jitter
  hatJitter: number // Standard deviation in milliseconds for hats timing jitter
  percJitter: number // Standard deviation in milliseconds for percussion timing jitter
  globalSwing: number // Swing percentage (0-100), where 50 = no swing, >50 = swung
}

/**
 * Box-Muller transform state for Gaussian random number generation
 */
class GaussianRandom {
  private spare: number | null = null
  private hasSpare = false
  private seed: number
  private initialSeed: number

  constructor(seed?: number) {
    this.initialSeed = seed ?? Date.now()
    this.seed = this.initialSeed
  }

  /**
   * Reset the RNG to its initial seed state
   * This ensures deterministic sequences across multiple runs
   */
  resetState(): void {
    this.seed = this.initialSeed
    this.hasSpare = false
    this.spare = null
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
   * Creates a separate GrooveTrack for each unique MIDI note pitch
   * Does NOT merge notes into buckets - each pitch gets its own lane
   */
  private convertToGrooveTracks(): GrooveTrack[] {
    // Map to store notes by MIDI number
    const notesByMidi: Map<number, GrooveNote[]> = new Map()

    // Process all tracks and collect notes by MIDI number
    this.midi!.tracks.forEach((track) => {
      track.notes.forEach((note) => {
        const midiNote = note.midi
        
        // Get or create notes array for this MIDI number
        if (!notesByMidi.has(midiNote)) {
          notesByMidi.set(midiNote, [])
        }
        
        const notes = notesByMidi.get(midiNote)!
        notes.push({
          originalTime: note.time, // @tonejs/midi provides time in seconds
          newTime: note.time, // Will be updated by humanize()
          velocity: note.velocity * 127, // Convert from 0-1 to 0-127
        })
      })
    })

    // Sort notes by time within each MIDI number
    notesByMidi.forEach((notes) => {
      notes.sort((a, b) => a.originalTime - b.originalTime)
    })

    // Convert to GrooveTrack array - one track per unique MIDI number
    const tracks: GrooveTrack[] = []
    notesByMidi.forEach((notes, midiNumber) => {
      // Get label from DEV_NOTE_MAPPING, fallback to "Note {number}"
      const label = DEV_NOTE_MAPPING[midiNumber] || `Note ${midiNumber}`
      
      // Get physics category for humanization algorithms
      const physicsCategory = GET_LANE_TYPE(midiNumber)
      
      tracks.push({
        id: `midi-${midiNumber}`,
        midiNumber,
        label,
        physicsCategory,
        notes,
      })
    })

    // Sort tracks by MIDI number (ascending: 36, 37, 38...)
    tracks.sort((a, b) => a.midiNumber - b.midiNumber)

    return tracks
  }

  /**
   * Override the physics category for a specific track
   * @param trackId The ID of the track to update (e.g., "midi-36")
   * @param category The new physics category
   */
  overrideTrackCategory(trackId: string, category: 'kick' | 'snare' | 'hats' | 'perc'): void {
    const track = this.tracks.find(t => t.id === trackId)
    if (track) {
      track.physicsCategory = category
    }
  }

  /**
   * Apply humanization to the parsed tracks
   * Strictly isolates instrument physics by category.
   * 
   * Formula: newTime = originalTime + instrumentSpecificOffset + (swingOffset * swingFactor)
   * 
   * @param params Humanization parameters
   * @returns Array of humanized GrooveTrack objects
   */
  humanize(params: HumanizationParams): GrooveTrack[] {
    if (!this.midi || this.tracks.length === 0) {
      throw new Error('No MIDI data loaded. Call parse() first.')
    }

    // CRITICAL FIX: Reset the RNG state before each humanization pass.
    // This ensures that changing one parameter (like Kick Tightness) does not
    // alter the random sequence for other instruments (like Snare).
    // The snare will now receive the EXACT SAME random numbers as before,
    // preserving its "jitter" unless its own parameters change.
    this.gaussianRandom.resetState()

    return this.tracks.map((track) => {
      // SANITY CHECK LOG (as requested)
      console.log(`Applying ${track.physicsCategory} logic to track ${track.label}. Settings used:`, {
        kickTightness: params.kickTightness,
        snareLag: params.snareLag,
        snareRandomness: params.snareRandomness,
        hatJitter: params.hatJitter,
        percJitter: params.percJitter,
        globalSwing: params.globalSwing
      })

      const humanizedNotes = track.notes.map((note, index) => {
        let instrumentOffset = 0 // in milliseconds

        // STRICT Category Isolation
        // Only read settings specific to the track's category
        switch (track.physicsCategory) {
          case 'kick':
            // Kick: Only kickTightness
            // Gaussian centered at 0 with stdDev = kickTightness
            instrumentOffset = this.gaussianRandom.nextGaussian(0, params.kickTightness)
            break

          case 'snare':
            // Snare: snareLag (fixed mean) + snareRandomness (stdDev variance)
            instrumentOffset = params.snareLag + this.gaussianRandom.nextGaussian(0, params.snareRandomness)
            break

          case 'hats':
            // Hats: Only hatJitter
            instrumentOffset = this.gaussianRandom.nextGaussian(0, params.hatJitter)
            break

          case 'perc':
            // Perc: Only percJitter
            instrumentOffset = this.gaussianRandom.nextGaussian(0, params.percJitter)
            break

          default:
            instrumentOffset = 0
            break
        }

        // Calculate Swing (Global) - Applied regardless of category, but calculated separately
        let swingOffset = 0
        if (params.globalSwing > 50) {
          swingOffset = this.calculateSwingOffset(note.originalTime, index, params.globalSwing)
        }

        // Final Calculation
        // newTime = originalTime + instrumentSpecificOffset + swingOffset
        // No global jitter is applied here, ensuring strict isolation
        const totalOffsetInSeconds = (instrumentOffset + swingOffset) / 1000
        const newTime = Math.max(0, note.originalTime + totalOffsetInSeconds)

        return {
          ...note,
          newTime,
        }
      })

      return {
        ...track,
        notes: humanizedNotes,
      }
    })
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
    // Key: midiNumber-originalTime, Value: newTime
    const noteUpdateMap = new Map<string, number>()
    
    // Build map of humanized note times
    humanizedTracks.forEach((track) => {
      track.notes.forEach((note) => {
        // Create a unique key: midiNumber + originalTime (rounded to avoid floating point issues)
        const key = `${track.midiNumber}-${note.originalTime.toFixed(6)}`
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
        
        // Look up the humanized time by MIDI number and original time
        let noteTime = note.time
        const key = `${midiNote}-${note.time.toFixed(6)}`
        const newTime = noteUpdateMap.get(key)
        if (newTime !== undefined) {
          noteTime = newTime
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
