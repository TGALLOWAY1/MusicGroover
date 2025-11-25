/**
 * GrooveVisualizer Component
 * SVG-based visualization showing ghost notes (input) and humanized notes (output)
 * Based on Mockup 2 requirements
 */

import { useMemo, useState, useRef, useCallback } from 'react'
import { useGrooveStore } from '../../store/useGrooveStore'
import type { GrooveTrack } from '../../core/types'

interface GrooveVisualizerProps {
  width?: number
  height?: number
  rowHeight?: number
}

// Color mapping for each physics category
const PHYSICS_COLORS = {
  kick: '#00ffff', // Cyan
  snare: '#00ff00', // Green/Lime
  hats: '#ff00ff', // Purple/Pink
  perc: '#ff6b35', // Orange/Yellow
} as const

interface TrackLaneProps {
  track: GrooveTrack
  y: number
  width: number
  rowHeight: number
  timeToX: (time: number) => number
  isEven: boolean // For alternating background
}

/**
 * TrackLane Component - Renders a single lane for a GrooveTrack
 */
function TrackLane({ track, y, width, rowHeight, timeToX, isEven }: TrackLaneProps) {
  const color = PHYSICS_COLORS[track.physicsCategory]
  const noteWidth = 4
  const noteHeight = 30

  return (
    <g>
      {/* Alternating background for visual separation */}
      <rect
        x={0}
        y={y}
        width={width}
        height={rowHeight}
        fill={isEven ? '#1a1f3a20' : '#1a1f3a10'}
        opacity="0.3"
      />
      
      {/* Row divider - thicker for better separation */}
      <line
        x1={0}
        y1={y + rowHeight}
        x2={width}
        y2={y + rowHeight}
        stroke="#00ffff30"
        strokeWidth="1.5"
      />
      
      {/* Label with background for readability */}
      <rect
        x={5}
        y={y + 5}
        width={120}
        height={rowHeight - 10}
        fill="#0a0e27"
        fillOpacity="0.8"
        rx="4"
      />
      <text
        x={15}
        y={y + rowHeight / 2}
        fill={color}
        fontSize="13"
        fontWeight="bold"
        dominantBaseline="middle"
      >
        {track.label}
      </text>

      {/* Render notes for this track */}
      {track.notes.map((note, idx) => {
        const originalX = timeToX(note.originalTime)
        const newX = timeToX(note.newTime)
        const shift = (note.newTime - note.originalTime) * 1000 // Convert to milliseconds
        const showConnection = Math.abs(shift) > 2 // Show if shift > 2ms
        const noteY = y + rowHeight / 2

        return (
          <g key={idx}>
            {/* Connecting line/arrow if shift > 2ms */}
            {showConnection && (
              <line
                x1={originalX}
                y1={noteY}
                x2={newX}
                y2={noteY}
                stroke={color}
                strokeWidth="1.5"
                strokeOpacity="0.6"
                markerEnd={`url(#arrowhead-${track.physicsCategory})`}
              />
            )}

            {/* Ghost note (original/input) - hollow grey rectangle */}
            <rect
              x={originalX - noteWidth / 2}
              y={noteY - noteHeight / 2}
              width={noteWidth}
              height={noteHeight}
              fill="none"
              stroke="#888888"
              strokeWidth="2"
              strokeOpacity="0.7"
              rx="2"
            />

            {/* Humanized note (output) - filled neon rectangle */}
            <rect
              x={newX - noteWidth / 2}
              y={noteY - noteHeight / 2}
              width={noteWidth}
              height={noteHeight}
              fill={color}
              fillOpacity="0.8"
              stroke={color}
              strokeWidth="1"
              rx="2"
            />

            {/* Velocity indicator (height based on velocity) */}
            <rect
              x={newX - noteWidth / 2}
              y={noteY - noteHeight / 2}
              width={noteWidth}
              height={(noteHeight * note.velocity) / 127}
              fill={color}
              fillOpacity="1"
              rx="2"
            />
          </g>
        )
      })}
    </g>
  )
}


export function GrooveVisualizer({
  width = 1200,
  rowHeight = 80,
}: GrooveVisualizerProps) {
  const { tracks } = useGrooveStore()
  const [zoom, setZoom] = useState(50) // Pixels per second (default: 50px/s)
  const [pan, setPan] = useState(0) // Horizontal offset in seconds
  const svgRef = useRef<SVGSVGElement>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, pan: 0 })

  // Calculate time range from all tracks
  const timeRange = useMemo(() => {
    if (tracks.length === 0) {
      return { min: 0, max: 4 } // Default 4 seconds
    }

    let minTime = Infinity
    let maxTime = -Infinity

    tracks.forEach((track) => {
      track.notes.forEach((note) => {
        minTime = Math.min(minTime, note.originalTime, note.newTime)
        maxTime = Math.max(maxTime, note.originalTime, note.newTime)
      })
    })

    // Add padding
    const padding = (maxTime - minTime) * 0.1 || 0.5
    return {
      min: Math.max(0, minTime - padding),
      max: maxTime + padding,
    }
  }, [tracks])

  // Convert time to pixel X position
  const timeToX = useCallback(
    (time: number): number => {
      return (time - timeRange.min + pan) * zoom
    },
    [timeRange.min, pan, zoom]
  )

  // Sort tracks by MIDI number (descending - Kick at bottom is standard for drum maps)
  const sortedTracks = useMemo(() => {
    return [...tracks].sort((a, b) => b.midiNumber - a.midiNumber)
  }, [tracks])

  // Handle mouse wheel for zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(10, Math.min(1000, zoom * delta))
      setZoom(newZoom)
    },
    [zoom]
  )

  // Handle mouse down for panning
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return // Only left mouse button
    isDragging.current = true
    dragStart.current = { x: e.clientX, pan }
    e.preventDefault()
  }, [pan])

  // Handle mouse move for panning
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDragging.current) return
      const deltaX = (e.clientX - dragStart.current.x) / zoom
      setPan(dragStart.current.pan - deltaX)
    },
    [zoom]
  )

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // Calculate visible time range
  const visibleTimeRange = {
    start: timeRange.min - pan,
    end: timeRange.max - pan,
  }

  // Generate grid lines (beat markers)
  const gridLines = useMemo(() => {
    const lines: number[] = []
    const beatInterval = 0.5 // Show every half beat
    let currentBeat = Math.floor(visibleTimeRange.start / beatInterval) * beatInterval

    while (currentBeat <= visibleTimeRange.end) {
      lines.push(currentBeat)
      currentBeat += beatInterval
    }

    return lines
  }, [visibleTimeRange])

  return (
    <div className="w-full bg-midnight-blue border border-cyber-cyan/30 rounded-lg p-4 relative">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-cyber-orange">Groove Visualizer</h3>
        <div className="flex items-center gap-4 text-xs text-cyber-cyan/60">
          <span>Zoom: {zoom.toFixed(1)} px/s</span>
          <span className="text-slate-500">Tracks: {tracks.length}</span>
          <button
            onClick={() => setZoom(50)}
            className="px-2 py-1 bg-cyber-cyan/20 hover:bg-cyber-cyan/30 rounded text-cyber-cyan"
          >
            Reset Zoom
          </button>
        </div>
      </div>

      {/* Scrollable container for vertical overflow */}
      <div className="overflow-y-auto overflow-x-hidden max-h-[600px] border border-cyber-cyan/20 rounded">
        <svg
          ref={svgRef}
          width={width}
          height={sortedTracks.length * rowHeight}
          viewBox={`0 0 ${width} ${sortedTracks.length * rowHeight}`}
          className="w-full h-auto"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
        >
        {/* Definitions */}
        <defs>
          <pattern id="grid" width={zoom * 0.5} height={rowHeight} patternUnits="userSpaceOnUse">
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={rowHeight}
              stroke="#00ffff10"
              strokeWidth="1"
            />
          </pattern>
          {/* Arrowhead markers for each physics category */}
          <marker
            id="arrowhead-kick"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill={PHYSICS_COLORS.kick} fillOpacity="0.6" />
          </marker>
          <marker
            id="arrowhead-snare"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill={PHYSICS_COLORS.snare} fillOpacity="0.6" />
          </marker>
          <marker
            id="arrowhead-hats"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill={PHYSICS_COLORS.hats} fillOpacity="0.6" />
          </marker>
          <marker
            id="arrowhead-perc"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill={PHYSICS_COLORS.perc} fillOpacity="0.6" />
          </marker>
        </defs>
        <rect width={width} height={sortedTracks.length * rowHeight} fill="url(#grid)" />

        {/* Beat grid lines */}
        {gridLines.map((beat, idx) => {
          const x = timeToX(beat)
          if (x < 0 || x > width) return null
          return (
            <line
              key={idx}
              x1={x}
              y1={0}
              x2={x}
              y2={sortedTracks.length * rowHeight}
              stroke="#00ffff30"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )
        })}

        {/* Render TrackLane for each track */}
        {sortedTracks.map((track, idx) => {
          const y = idx * rowHeight
          return (
            <TrackLane
              key={track.id}
              track={track}
              y={y}
              width={width}
              rowHeight={rowHeight}
              timeToX={timeToX}
              isEven={idx % 2 === 0}
            />
          )
        })}
        </svg>
      </div>

      {/* Empty state - show message if no tracks */}
      {tracks.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-cyber-cyan/40">
          <p className="text-sm">Load a MIDI file to visualize the groove</p>
        </div>
      ) : (
        /* Legend */
        <div className="mt-4 flex flex-wrap items-center gap-6 text-xs text-cyber-cyan/60">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-500 rounded" />
            <span>Ghost Note (Input)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-cyber-cyan rounded" />
            <span>Kick</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span>Snare</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded" />
            <span>Hats</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded" />
            <span>Perc</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="20" height="10" className="text-cyber-cyan">
              <line x1="0" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="1.5" />
              <polygon points="15,2 20,5 15,8" fill="currentColor" />
            </svg>
            <span>Shift &gt; 2ms</span>
          </div>
        </div>
      )}
    </div>
  )
}

