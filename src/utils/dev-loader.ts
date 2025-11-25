/**
 * Development Fixture Loader
 * Automatically loads test MIDI file in development mode
 */

import { useGrooveStore } from '../store/useGrooveStore'

/**
 * Load the development test fixture
 * Fetches Test Data 4Bars.mid from public/fixtures/ and loads it into the store
 */
export async function loadDevFixture(): Promise<void> {
  try {
    // Fetch the test MIDI file from public directory
    const response = await fetch('/fixtures/Test Data 4Bars.mid')
    
    if (!response.ok) {
      throw new Error(`Failed to fetch fixture: ${response.status} ${response.statusText}`)
    }

    // Convert response to ArrayBuffer
    const arrayBuffer = await response.arrayBuffer()
    
    // Create a File object from the ArrayBuffer (mimicking file input)
    const blob = new Blob([arrayBuffer], { type: 'audio/midi' })
    const file = new File([blob], 'Test Data 4Bars.mid', { type: 'audio/midi' })

    // Load into store using the existing loadMidiFile function
    const { loadMidiFile } = useGrooveStore.getState()
    await loadMidiFile(file)
    
    console.log('✅ Development fixture loaded successfully')
  } catch (error) {
    console.error('❌ Failed to load development fixture:', error)
    // Don't throw - allow app to continue without fixture in case of error
  }
}

