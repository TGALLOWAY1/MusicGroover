/**
 * Zustand store for Music Groover application state
 */

import { create } from 'zustand'
import type {
  DrumElement,
  ElementTimingRules,
  SwingSettings,
  GroovePreset,
  MIDINote,
  HumanizedNote,
} from '../core/types'
import { DEFAULT_TIMING_RULES } from '../core/humanization'

interface GrooveState {
  // MIDI data
  midiNotes: MIDINote[]
  humanizedNotes: HumanizedNote[]
  
  // Timing rules per element
  timingRules: ElementTimingRules
  
  // Swing settings
  swing: SwingSettings | null
  
  // Track delays
  trackDelays: Record<DrumElement, number>
  
  // Current preset
  currentPreset: string | null
  
  // Actions
  setMidiNotes: (notes: MIDINote[]) => void
  setHumanizedNotes: (notes: HumanizedNote[]) => void
  updateTimingRule: (element: DrumElement, rule: Partial<ElementTimingRules[DrumElement]>) => void
  setSwing: (swing: SwingSettings | null) => void
  setTrackDelay: (element: DrumElement, delay: number) => void
  loadPreset: (preset: GroovePreset) => void
  reset: () => void
}

const initialState = {
  midiNotes: [],
  humanizedNotes: [],
  timingRules: DEFAULT_TIMING_RULES,
  swing: null,
  trackDelays: {
    kick: 0,
    snare: 0,
    hat: 0,
    percussion: 0,
    tom: 0,
    ride: 0,
  },
  currentPreset: null,
}

export const useGrooveStore = create<GrooveState>((set) => ({
  ...initialState,
  
  setMidiNotes: (notes) => set({ midiNotes: notes }),
  
  setHumanizedNotes: (notes) => set({ humanizedNotes: notes }),
  
  updateTimingRule: (element, rule) =>
    set((state) => ({
      timingRules: {
        ...state.timingRules,
        [element]: {
          ...state.timingRules[element],
          ...rule,
        },
      },
    })),
  
  setSwing: (swing) => set({ swing }),
  
  setTrackDelay: (element, delay) =>
    set((state) => ({
      trackDelays: {
        ...state.trackDelays,
        [element]: delay,
      },
    })),
  
  loadPreset: (preset) =>
    set({
      timingRules: preset.timingRules,
      swing: preset.swing || null,
      trackDelays: preset.trackDelays || initialState.trackDelays,
      currentPreset: preset.name,
    }),
  
  reset: () => set(initialState),
}))

