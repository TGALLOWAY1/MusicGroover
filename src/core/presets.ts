/**
 * Groove presets for different musical styles
 */

import type { GroovePreset, ElementTimingRules, SwingSettings } from './types'
import { DEFAULT_TIMING_RULES } from './humanization'

export const PRESETS: GroovePreset[] = [
  {
    name: 'Human Drummer',
    timingRules: DEFAULT_TIMING_RULES,
    seed: 12345,
  },
  {
    name: 'Tight Pop',
    timingRules: {
      kick: { min: -1, max: 3, defaultOffset: 0 },
      snare: { min: -2, max: 5, defaultOffset: 2 },
      hat: { min: -3, max: 8, defaultOffset: 3 },
      percussion: { min: -5, max: 15, defaultOffset: 5 },
      tom: { min: -2, max: 4, defaultOffset: 0 },
      ride: { min: -3, max: 8, defaultOffset: 2 },
    },
    seed: 23456,
  },
  {
    name: 'LA Late Snare',
    timingRules: {
      ...DEFAULT_TIMING_RULES,
      snare: { min: 3, max: 12, defaultOffset: 8 },
      hat: { min: 5, max: 20, defaultOffset: 12 },
    },
    seed: 34567,
  },
  {
    name: 'UKG Shuffle',
    timingRules: DEFAULT_TIMING_RULES,
    swing: {
      enabled: true,
      percentage: 62, // Classic UK garage swing
      magnitude: 50,
      applyTo: ['hat', 'snare'],
    },
    seed: 45678,
  },
  {
    name: 'Funky Swung',
    timingRules: {
      ...DEFAULT_TIMING_RULES,
      hat: { min: 8, max: 25, defaultOffset: 15 },
      snare: { min: 5, max: 15, defaultOffset: 10 },
    },
    swing: {
      enabled: true,
      percentage: 65,
      magnitude: 60,
      applyTo: ['hat', 'snare', 'percussion'],
    },
    seed: 56789,
  },
  {
    name: 'Straight but Human',
    timingRules: {
      kick: { min: -1, max: 2, defaultOffset: 0 },
      snare: { min: -2, max: 4, defaultOffset: 1 },
      hat: { min: -3, max: 6, defaultOffset: 2 },
      percussion: { min: -5, max: 10, defaultOffset: 3 },
      tom: { min: -1, max: 3, defaultOffset: 0 },
      ride: { min: -2, max: 5, defaultOffset: 1 },
    },
    seed: 67890,
  },
]

export function getPreset(name: string): GroovePreset | undefined {
  return PRESETS.find((p) => p.name === name)
}

