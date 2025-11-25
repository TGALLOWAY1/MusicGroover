/**
 * Development Note Mapping
 * Chromatic mapping based on user's specific drum rack
 */

export const DEV_NOTE_MAPPING: Record<number, string> = {
  36: 'Kick',        // C1
  37: 'Snare',       // C#1
  38: 'Ghost Kick',  // D1
  39: 'Ghost Snare', // D#1
  40: 'Hat Closed A',// E1
  41: 'Hat Closed B',// F1
  42: 'Hat Closed C',// F#1
  43: 'Crash',        // G1
}

/**
 * Helper to categorize notes into UI lanes
 * @param note MIDI note number
 * @returns Lane type for visualization
 */
export const GET_LANE_TYPE = (note: number): 'kick' | 'snare' | 'hats' | 'perc' => {
  if (note === 36 || note === 38) return 'kick'
  if (note === 37 || note === 39) return 'snare'
  if (note >= 40 && note <= 42) return 'hats'
  return 'perc' // Crash goes here for now
}

