import { useMemo, useRef, useEffect, useState } from 'react'
import { useGrooveStore } from '../../store/useGrooveStore'
import type { GrooveTrack } from '../../core/types'
import { useTimelineViewport } from '../../hooks/useTimelineViewport'

// --- Constants ---
const SIDEBAR_WIDTH = 150
const ROW_HEIGHT = 48
const HEADER_HEIGHT = 32
const PADDING_BOTTOM = 40 // pb-10 = 40px

// Pro Audio color mapping - Matte/Pastel colors
const PHYSICS_COLORS = {
  kick: '#60a5fa', // Matte Blue (blue-400)
  snare: '#2dd4bf', // Matte Teal (teal-400)
  hats: '#fbbf24', // Soft Yellow/Orange (amber-300)
  perc: '#818cf8', // Soft Purple (indigo-400)
} as const

// Fill colors with reduced opacity
const PHYSICS_FILL_COLORS = {
  kick: '#3b82f6', // blue-500
  snare: '#14b8a6', // teal-500
  hats: '#f59e0b', // amber-400
  perc: '#6366f1', // indigo-500
} as const

// --- Helper Functions ---

/**
 * Calculate the exact song duration in seconds
 */
function getSongDurationInSeconds(tracks: GrooveTrack[], rawMidi: any): number {
  if (tracks.length === 0 || !rawMidi) return 4 // Default 4 seconds

  // Get tempo from MIDI (default to 120 BPM)
  const tempo = rawMidi.header.tempos?.[0]?.bpm || 120
  const secondsPerBeat = 60 / tempo
  const secondsPerBar = secondsPerBeat * 4

  let maxNoteEndTime = 0
  tracks.forEach((track) => {
    track.notes.forEach((note) => {
      const noteEndTime = Math.max(note.originalTime, note.newTime)
      maxNoteEndTime = Math.max(maxNoteEndTime, noteEndTime)
    })
  })

  if (rawMidi.tracks) {
    rawMidi.tracks.forEach((track: any) => {
      track.notes.forEach((note: any) => {
        const noteEndTime = note.time + (note.duration || 0)
        maxNoteEndTime = Math.max(maxNoteEndTime, noteEndTime)
      })
    })
  }

  // Round up to nearest bar
  const bars = Math.ceil(maxNoteEndTime / secondsPerBar)
  return Math.max(bars * secondsPerBar, secondsPerBar) // Minimum 1 bar
}

// --- Components ---

interface TimelineRulerProps {
  width: number // Visible width of the timeline area
  timeToPixel: (time: number) => number
  pixelToTime: (pixel: number) => number
  songDuration: number
  rawMidi: any
}

function TimelineRuler({ width, timeToPixel, pixelToTime, songDuration, rawMidi }: TimelineRulerProps) {
  const barsAndBeats = useMemo(() => {
    const tempo = rawMidi?.header.tempos?.[0]?.bpm || 120
    const secondsPerBeat = 60 / tempo
    const secondsPerBar = secondsPerBeat * 4

    const visibleStartTime = pixelToTime(0)
    const visibleEndTime = pixelToTime(width)

    const bars = []
    const beats = []

    // Generate bars
    const startBar = Math.floor(visibleStartTime / secondsPerBar)
    const endBar = Math.ceil(visibleEndTime / secondsPerBar)

    for (let i = startBar; i <= endBar; i++) {
      const time = i * secondsPerBar
      if (time <= songDuration) {
        bars.push({ number: i + 1, time })
      }
    }

    // Generate beats
    const startBeat = Math.floor(visibleStartTime / secondsPerBeat)
    const endBeat = Math.ceil(visibleEndTime / secondsPerBeat)

    for (let i = startBeat; i <= endBeat; i++) {
      const time = i * secondsPerBeat
      if (time <= songDuration && Math.abs(time % secondsPerBar) > 0.001) {
        beats.push({ time })
      }
    }

    return { bars, beats }
  }, [rawMidi, pixelToTime, width, songDuration])

  return (
    <svg width={width} height={HEADER_HEIGHT} style={{ display: 'block' }} preserveAspectRatio="none">
      <rect width={width} height={HEADER_HEIGHT} fill="#1e293b" />
      
      {/* Beats */}
      {barsAndBeats.beats.map((beat, i) => {
        const x = timeToPixel(beat.time)
        if (x >= 0 && x <= width) {
          return <line key={`b-${i}`} x1={x} y1={HEADER_HEIGHT - 8} x2={x} y2={HEADER_HEIGHT} stroke="#475569" strokeWidth={1} />
        }
        return null
      })}

      {/* Bars */}
      {barsAndBeats.bars.map((bar, i) => {
        const x = timeToPixel(bar.time)
        if (x >= 0 && x <= width) {
          return (
            <g key={`bar-${i}`}>
              <line x1={x} y1={0} x2={x} y2={HEADER_HEIGHT} stroke="#94a3b8" strokeWidth={1} />
              <text x={x + 4} y={HEADER_HEIGHT - 12} fill="#cbd5e1" fontSize="10" fontWeight="600">
                {bar.number}
              </text>
            </g>
          )
        }
        return null
      })}

      {/* End of Song Marker */}
      <line 
        x1={timeToPixel(songDuration)} 
        y1={0} 
        x2={timeToPixel(songDuration)} 
        y2={HEADER_HEIGHT} 
        stroke="#ef4444" 
        strokeWidth={2} 
        strokeDasharray="4 4"
      />
    </svg>
  )
}

interface TrackLaneProps {
  track: GrooveTrack
  width: number
  timeToPixel: (time: number) => number
  songDuration: number
  isEven: boolean
  arrowheadId: string
}

function TrackLane({ track, width, timeToPixel, songDuration, isEven, arrowheadId }: TrackLaneProps) {
  const color = PHYSICS_COLORS[track.physicsCategory]
  const fillColor = PHYSICS_FILL_COLORS[track.physicsCategory]
  const noteHeight = ROW_HEIGHT * 0.6

  // Filter visible notes optimization could go here
  const visibleNotes = track.notes // Render all for now, can optimize later if needed

  return (
    <svg width={width} height={ROW_HEIGHT} style={{ display: 'block' }} preserveAspectRatio="none">
      {/* Background */}
      <rect width={width} height={ROW_HEIGHT} fill={isEven ? '#0f172a' : '#1e293b'} fillOpacity={0.5} />
      
      {/* Grid Lines (Vertical) - Ideally passed down or context, simplified here */}
      <line x1={timeToPixel(songDuration)} y1={0} x2={timeToPixel(songDuration)} y2={ROW_HEIGHT} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" opacity={0.5} />

      {/* Definitions for Markers */}
      <defs>
        <marker id={arrowheadId} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <polygon points="0 0, 10 3, 0 6" fill={color} fillOpacity="0.6" />
        </marker>
      </defs>

      {/* Notes */}
      {visibleNotes.map((note, i) => {
        const x1 = timeToPixel(note.originalTime)
        const x2 = timeToPixel(note.newTime)
        const y = ROW_HEIGHT / 2
        const isMoved = Math.abs(x2 - x1) > 2

        // Skip if completely out of view (simple cull)
        if (x1 < -10 && x2 < -10) return null
        if (x1 > width + 10 && x2 > width + 10) return null

        return (
          <g key={i}>
            {/* Connection Line */}
            {isMoved && (
              <line 
                x1={x1} y1={y} x2={x2} y2={y} 
                stroke={color} strokeWidth={1} strokeOpacity={0.5} 
                markerEnd={`url(#${arrowheadId})`}
              />
            )}

            {/* Ghost Note */}
            <rect
              x={x1 - 2} y={y - noteHeight / 2}
              width={4} height={noteHeight}
              fill="none" stroke="#64748b" strokeWidth={1} strokeOpacity={0.5} rx={1}
            />

            {/* Humanized Note */}
            <rect
              x={x2 - 2} y={y - noteHeight / 2}
              width={4} height={noteHeight}
              fill={fillColor} fillOpacity={0.8}
              stroke={color} strokeWidth={1} rx={1}
            />
            
            {/* Velocity Bar inside Note */}
            {note.velocity > 0 && (
              <rect
                x={x2 - 2} y={y + noteHeight / 2}
                width={4} height={Math.max(0, (noteHeight * note.velocity) / 127)}
                fill="white" fillOpacity={0.3} rx={1}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

// --- Main Component ---

export function GrooveVisualizer({ width = 1200, height = 600 }: { width?: number, height?: number }) {
  const { tracks, rawMidi, setTrackCategory } = useGrooveStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const songDuration = useMemo(() => getSongDurationInSeconds(tracks, rawMidi), [tracks, rawMidi])

  const { 
    timeToPixel, 
    pixelToTime, 
    handleWheel,
    viewStartTime,
    setZoom
  } = useTimelineViewport({ 
    songDuration, 
    defaultZoom: 100 
  })

  // Auto-fit logic on load
  useEffect(() => {
    if (tracks.length > 0 && songDuration > 0) {
      // Fit to width of the timeline container
      const availableWidth = (containerRef.current?.clientWidth || width) - SIDEBAR_WIDTH
      const fitZoom = availableWidth / songDuration
      setZoom(Math.max(10, Math.min(2000, fitZoom)))
    }
  }, [tracks.length, songDuration, width, setZoom])

  // Sort tracks
  const sortedTracks = useMemo(() => [...tracks].sort((a, b) => b.midiNumber - a.midiNumber), [tracks])

  // Determine dimensions
  // Timeline Width is effectively dynamic based on viewport logic, 
  // but the SVG container fills the remaining space in the grid.
  // We use a ResizeObserver to get exact pixel width of the timeline area for culling/rendering.
  const [timelineAreaWidth, setTimelineAreaWidth] = useState(0)

  useEffect(() => {
    if (!timelineRef.current) return
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setTimelineAreaWidth(entry.contentRect.width)
      }
    })
    obs.observe(timelineRef.current)
    return () => obs.disconnect()
  }, [])

  // Grid Layout Style
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `${SIDEBAR_WIDTH}px 1fr`,
    height: '100%',
  }

  // Dynamic Height Calculation
  const totalHeight = sortedTracks.length > 0 
    ? (sortedTracks.length * ROW_HEIGHT) + HEADER_HEIGHT + PADDING_BOTTOM
    : height

  return (
    <div 
      ref={containerRef}
      className="w-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex flex-col"
      style={{ height: totalHeight }}
      onWheel={(e) => handleWheel(e.nativeEvent)}
    >
      {/* Header Row - Sticky */}
      <div 
        className="bg-slate-800 border-b border-slate-700 flex-none sticky top-0 z-20" 
        style={{ ...gridStyle, height: HEADER_HEIGHT }}
      >
        <div className="flex items-center px-3 border-r border-slate-700 font-bold text-slate-400 text-xs uppercase tracking-wider">
          Tracks
        </div>
        <div className="relative overflow-hidden" ref={timelineRef}>
          <TimelineRuler 
            width={timelineAreaWidth} 
            timeToPixel={timeToPixel} 
            pixelToTime={pixelToTime} 
            songDuration={songDuration}
            rawMidi={rawMidi}
          />
        </div>
      </div>

      {/* Tracks List Container - No internal scrollbar, uses page scroll */}
      <div className="flex-grow bg-slate-900 pb-10">
        {sortedTracks.map((track, i) => (
          <div 
            key={track.id} 
            className="border-b border-slate-800 flex-none"
            style={{ ...gridStyle, height: ROW_HEIGHT, display: 'grid' }} // Ensure grid layout persists
          >
            {/* Track Header */}
            <div className="flex flex-col justify-center px-2 border-r border-slate-800 bg-slate-800/50 gap-1">
              <span className="text-xs font-bold uppercase truncate" style={{ color: PHYSICS_COLORS[track.physicsCategory] }}>
                {track.label}
              </span>
              <select
                value={track.physicsCategory}
                onChange={(e) => setTrackCategory(track.id, e.target.value as any)}
                className="text-[10px] bg-slate-900 border rounded px-1 py-0.5 outline-none cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
                style={{ 
                  borderColor: PHYSICS_COLORS[track.physicsCategory],
                  color: '#cbd5e1' // slate-300
                }}
              >
                <option value="kick">Kick</option>
                <option value="snare">Snare</option>
                <option value="hats">Hats</option>
                <option value="perc">Perc</option>
              </select>
            </div>

            {/* Track Lane */}
            <div className="relative overflow-hidden">
              <TrackLane 
                track={track} 
                width={timelineAreaWidth} 
                timeToPixel={timeToPixel}
                songDuration={songDuration}
                isEven={i % 2 === 0}
                arrowheadId={`arrow-${track.id}`}
              />
            </div>
          </div>
        ))}
        
        {/* Empty State */}
        {sortedTracks.length === 0 && (
          <div className="flex items-center justify-center h-64 text-slate-500 italic">
            Load a MIDI file to begin...
          </div>
        )}
      </div>
    </div>
  )
}
