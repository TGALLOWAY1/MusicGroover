/**
 * Zustand store for Music Groover application state
 * Integrates with MidiEngine for MIDI parsing and humanization
 */

import { create } from 'zustand'
import { Midi } from '@tonejs/midi'
import { MidiEngine, type HumanizationParams } from '../core/engine'
import type { GrooveTrack } from '../core/types'

/**
 * Humanization settings interface
 */
export interface GrooveSettings {
  globalSwing: number // 0-100, where 50 = no swing
  kickJitter: number // 0-50 ms (standard deviation for kick timing)
  snareOffset: number // -20 to 20 ms (mean delay for snare)
  hatJitter?: number // Optional: standard deviation for hats (defaults to kickJitter * 2)
  seed?: number // Optional: random seed for reproducibility
}

interface GrooveState {
  // MIDI data
  rawMidi: Midi | null // Original parsed MIDI object
  midiBuffer: ArrayBuffer | null // Original MIDI file buffer (for regeneration)
  tracks: GrooveTrack[] // Active humanized tracks
  engine: MidiEngine | null // MidiEngine instance
  
  // Humanization settings
  settings: GrooveSettings
  
  // Actions
  loadMidiFile: (file: File) => Promise<void>
  updateSetting: <K extends keyof GrooveSettings>(key: K, value: GrooveSettings[K]) => void
  regenerateGroove: () => void
  exportMidi: () => void
  reset: () => void
}

const defaultSettings: GrooveSettings = {
  globalSwing: 50, // No swing by default
  kickJitter: 3, // 3ms standard deviation for kick
  snareOffset: 5, // 5ms late for snare (typical "pocket" feel)
  hatJitter: 6, // 6ms for hats (looser than kick)
}

const initialState: Omit<GrooveState, 'loadMidiFile' | 'updateSetting' | 'regenerateGroove' | 'reset'> = {
  rawMidi: null,
  midiBuffer: null,
  tracks: [],
  engine: null,
  settings: defaultSettings,
}

/**
 * Apply humanization to tracks using current settings
 */
function applyHumanization(engine: MidiEngine, settings: GrooveSettings): GrooveTrack[] {
  const params: HumanizationParams = {
    kickTightness: settings.kickJitter,
    snareLag: settings.snareOffset,
    globalSwing: settings.globalSwing,
  }
  
  return engine.humanize(params)
}

export const useGrooveStore = create<GrooveState>((set, get) => ({
  ...initialState,
  
  /**
   * Load and parse a MIDI file
   * @param file File object from file input
   */
  loadMidiFile: async (file: File) => {
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      
      // Create new engine instance with seed from settings
      const engine = new MidiEngine(get().settings.seed)
      
      // Parse MIDI file
      const tracks = engine.parse(arrayBuffer)
      
      // Get the parsed Midi object
      const rawMidi = engine.getMidi()
      
      if (!rawMidi) {
        throw new Error('Failed to parse MIDI file')
      }
      
      // Apply initial humanization with current settings
      const humanizedTracks = applyHumanization(engine, get().settings)
      
      set({
        rawMidi,
        midiBuffer: arrayBuffer, // Store buffer for regeneration
        tracks: humanizedTracks,
        engine,
      })
    } catch (error) {
      throw new Error(
        `Failed to load MIDI file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  },
  
  /**
   * Update a setting and immediately regenerate the groove
   * @param key Setting key to update
   * @param value New value for the setting
   */
  updateSetting: <K extends keyof GrooveSettings>(key: K, value: GrooveSettings[K]) => {
    const state = get()
    
    // Update the setting
    const newSettings: GrooveSettings = {
      ...state.settings,
      [key]: value,
    }
    
    set({ settings: newSettings })
    
    // If we have an engine and tracks, regenerate immediately
    if (state.engine && state.tracks.length > 0) {
      const humanizedTracks = applyHumanization(state.engine, newSettings)
      set({ tracks: humanizedTracks })
    }
  },
  
  /**
   * Regenerate the groove with current settings
   * Useful for re-randomizing with the same settings (new seed)
   */
  regenerateGroove: () => {
    const state = get()
    
    if (!state.midiBuffer || !state.rawMidi) {
      throw new Error('No MIDI file loaded. Load a MIDI file first.')
    }
    
    // Create new engine with new seed (or same seed if specified)
    // If seed is not set, use a new random seed for fresh randomization
    const newSeed = state.settings.seed ?? Date.now()
    const newEngine = new MidiEngine(newSeed)
    
    // Re-parse the MIDI with the new engine (for fresh randomness)
    const tracks = newEngine.parse(state.midiBuffer)
    
    // Get the parsed Midi object (should be the same structure)
    const rawMidi = newEngine.getMidi()
    
    if (!rawMidi) {
      throw new Error('Failed to re-parse MIDI file')
    }
    
    // Apply humanization with current settings
    const humanizedTracks = applyHumanization(newEngine, state.settings)
    
    set({
      rawMidi,
      tracks: humanizedTracks,
      engine: newEngine,
    })
  },
  
  /**
   * Export the humanized MIDI file
   * Triggers browser download of "humanized_groove.mid"
   */
  exportMidi: () => {
    const state = get()
    
    if (!state.engine || !state.tracks.length) {
      throw new Error('No MIDI data to export. Load a MIDI file first.')
    }

    try {
      // Export MIDI using the engine
      const midiBuffer = state.engine.exportMidi(state.tracks)
      
      // Create blob and trigger download
      const blob = new Blob([midiBuffer], { type: 'audio/midi' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = 'humanized_groove.mid'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      URL.revokeObjectURL(url)
    } catch (error) {
      throw new Error(
        `Failed to export MIDI: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  },

  /**
   * Reset the store to initial state
   */
  reset: () => {
    set({
      ...initialState,
      settings: defaultSettings,
    })
  },
}))

