import { useRef, useEffect } from 'react'
import { ControlsPanel } from './components/controls'
import { GrooveCurve, GrooveVisualizer } from './components/visualizer'
import { useGrooveStore } from './store/useGrooveStore'
import { loadDevFixture } from './utils/dev-loader'

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { loadMidiFile, exportMidi, tracks } = useGrooveStore()

  // Auto-load development fixture in dev mode
  useEffect(() => {
    if (import.meta.env.DEV) {
      loadDevFixture()
    }
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        await loadMidiFile(file)
      } catch (error) {
        console.error('Failed to load MIDI file:', error)
        alert(`Failed to load MIDI file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const handleExport = () => {
    try {
      exportMidi()
    } catch (error) {
      console.error('Failed to export MIDI file:', error)
      alert(`Failed to export MIDI file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 flex">
      {/* Left Sidebar - Controls Panel */}
      <ControlsPanel />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - File Upload */}
        <div className="p-4 border-b border-slate-700 bg-slate-800 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-200">Music Groover</h1>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".mid,.midi"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md transition-colors font-medium text-sm"
            >
              Load MIDI File
            </button>
            <button
              onClick={handleExport}
              disabled={tracks.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium text-sm"
            >
              Export
            </button>
          </div>
        </div>

        {/* Top - Groove Curve */}
        <div className="p-4 border-b border-slate-700">
          <GrooveCurve width={1200} height={120} />
        </div>

        {/* Middle - Groove Visualizer */}
        <div className="flex-1 p-4 overflow-y-auto">
          <GrooveVisualizer width={1200} height={400} rowHeight={80} />
        </div>

        {/* Bottom - Waveform Container (Placeholder) */}
        <div
          id="waveform-container"
          className="h-32 bg-slate-800 border-t border-slate-700 p-4 flex items-center justify-center"
        >
          <p className="text-sm text-slate-500">Waveform view placeholder</p>
        </div>
      </div>
    </div>
  )
}

export default App

