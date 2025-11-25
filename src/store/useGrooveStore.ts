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
  snareRandomness: number // 0-50 ms (standard deviation for snare timing jitter)
  hatJitter: number // 0-50 ms (standard deviation for hats timing)
  percJitter: number // 0-50 ms (standard deviation for percussion timing)
  seed?: number // Optional: random seed for reproducibility
}

interface GrooveState {
  // MIDI data
  rawMidi: Midi | null // Original parsed MIDI object
  midiBuffer: ArrayBuffer | null // Original MIDI file buffer (for regeneration)
  tracks: GrooveTrack[] // Active humanized tracks
  engine: MidiEngine | null // MidiEngine instance
  
  // Category Overrides
  trackCategoryOverrides: Record<string, 'kick' | 'snare' | 'hats' | 'perc'>

  // Humanization settings
  settings: GrooveSettings
  
  // Actions
  loadMidiFile: (file: File) => Promise<void>
  updateSetting: <K extends keyof GrooveSettings>(key: K, value: GrooveSettings[K]) => void
  setTrackCategory: (trackId: string, category: 'kick' | 'snare' | 'hats' | 'perc') => void
  regenerateGroove: () => void
  exportMidi: () => void
  reset: () => void
}

const defaultSettings: GrooveSettings = {
  globalSwing: 50, // No swing by default
  kickJitter: 3, // 3ms standard deviation for kick
  snareOffset: 5, // 5ms late for snare (typical "pocket" feel)
  snareRandomness: 4.5, // 4.5ms standard deviation for snare (slightly looser than kick)
  hatJitter: 6, // 6ms for hats (looser than kick)
  percJitter: 7.5, // 7.5ms for percussion (most variance)
}

const initialState: Omit<GrooveState, 'loadMidiFile' | 'updateSetting' | 'setTrackCategory' | 'regenerateGroove' | 'reset' | 'exportMidi'> = {
  rawMidi: null,
  midiBuffer: null,
  tracks: [],
  engine: null,
  trackCategoryOverrides: {},
  settings: defaultSettings,
}

/**
 * Apply humanization to tracks using current settings
 * Maps GrooveSettings to HumanizationParams with strict category separation
 */
function applyHumanization(engine: MidiEngine, settings: GrooveSettings): GrooveTrack[] {
  const params: HumanizationParams = {
    kickTightness: settings.kickJitter,
    snareLag: settings.snareOffset,
    snareRandomness: settings.snareRandomness,
    hatJitter: settings.hatJitter,
    percJitter: settings.percJitter,
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

      // Reset overrides on new file load
      set({ trackCategoryOverrides: {} })
      
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
   * @param shouldRegenerate Whether to trigger groove regeneration (default: true)
   */
  updateSetting: <K extends keyof GrooveSettings>(key: K, value: GrooveSettings[K], shouldRegenerate = true) => {
    const state = get()
    
    // Update the setting
    const newSettings: GrooveSettings = {
      ...state.settings,
      [key]: value,
    }
    
    set({ settings: newSettings })
    
    // If we have an engine and tracks, regenerate immediately if requested
    if (shouldRegenerate && state.engine && state.tracks.length > 0) {
      const humanizedTracks = applyHumanization(state.engine, newSettings)
      set({ tracks: humanizedTracks })
    }
  },

  /**
   * Update the physics category for a specific track
   * @param trackId The ID of the track to update
   * @param category The new physics category
   */
  setTrackCategory: (trackId: string, category: 'kick' | 'snare' | 'hats' | 'perc') => {
    const state = get()
    
    // Update overrides in state
    const newOverrides = {
      ...state.trackCategoryOverrides,
      [trackId]: category
    }
    
    set({ trackCategoryOverrides: newOverrides })
    
    // Regenerate the groove to apply the new category and re-randomize
    // This ensures the engine is updated with the new category
    state.regenerateGroove()
  },
  
  /**
   * Regenerate the groove with current settings
   * Useful for re-randomizing with the same settings (new seed)
   */
  regenerateGroove: () => {
    const state = get()
    
    if (!state.midiBuffer || !state.rawMidi) {
      // Fail silently if no MIDI loaded, or throw? 
      // If called from setTrackCategory and no MIDI is loaded (unlikely), just return.
      if (!state.midiBuffer) return
      throw new Error('No MIDI file loaded. Load a MIDI file first.')
    }
    
    // Create new engine with new seed (or same seed if specified)
    // If seed is not set, use a new random seed for fresh randomization
    const newSeed = state.settings.seed ?? Date.now()
    const newEngine = new MidiEngine(newSeed)
    
    // Re-parse the MIDI with the new engine (for fresh randomness)
    newEngine.parse(state.midiBuffer)
    
    // Apply Category Overrides
    Object.entries(state.trackCategoryOverrides).forEach(([id, category]) => {
      newEngine.overrideTrackCategory(id, category)
    })

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
      trackCategoryOverrides: {},
    })
  },
}))
