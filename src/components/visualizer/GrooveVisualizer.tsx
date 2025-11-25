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

// Color mapping for each instrument
const INSTRUMENT_COLORS = {
  kick: '#00ffff', // Cyan
  snare: '#00ff00', // Green
  hats: '#ff00ff', // Purple/Magenta
  perc: '#ffff00', // Yellow (for percussion if needed)
} as const

// Instrument order for rows
const INSTRUMENT_ORDER: Array<'kick' | 'snare' | 'hats' | 'perc'> = ['kick', 'snare', 'hats', 'perc']

interface NotePosition {
  originalX: number
  newX: number
  y: number
  originalTime: number
  newTime: number
  shift: number // in milliseconds
  velocity: number
}

export function GrooveVisualizer({
  width = 1200,
  height = 400,
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

  // Convert pixel X position to time
  const xToTime = useCallback(
    (x: number): number => {
      return x / zoom - pan + timeRange.min
    },
    [timeRange.min, pan, zoom]
  )

  // Organize tracks by instrument and calculate note positions
  const notePositions = useMemo(() => {
    const positions: Record<string, NotePosition[]> = {
      kick: [],
      snare: [],
      hats: [],
      perc: [],
    }

    tracks.forEach((track) => {
      // Map 'hats' to the correct instrument key
      const instrument = track.instrument === 'hats' ? 'hats' : track.instrument
      const rowIndex = INSTRUMENT_ORDER.indexOf(instrument)
      if (rowIndex === -1) return

      const y = rowIndex * rowHeight + rowHeight / 2

      track.notes.forEach((note) => {
        const shift = (note.newTime - note.originalTime) * 1000 // Convert to milliseconds
        positions[instrument].push({
          originalX: timeToX(note.originalTime),
          newX: timeToX(note.newTime),
          y,
          originalTime: note.originalTime,
          newTime: note.newTime,
          shift,
          velocity: note.velocity,
        })
      })
    })

    return positions
  }, [tracks, timeToX, rowHeight])

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
    svgRef.current?.setPointerCapture(e.pointerId)
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
    <div className="w-full bg-midnight-blue border border-cyber-cyan/30 rounded-lg p-4 overflow-hidden relative">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-cyber-orange">Groove Visualizer</h3>
        <div className="flex items-center gap-4 text-xs text-cyber-cyan/60">
          <span>Zoom: {zoom.toFixed(1)} px/s</span>
          <button
            onClick={() => setZoom(50)}
            className="px-2 py-1 bg-cyber-cyan/20 hover:bg-cyber-cyan/30 rounded text-cyber-cyan"
          >
            Reset Zoom
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={INSTRUMENT_ORDER.length * rowHeight}
        viewBox={`0 0 ${width} ${INSTRUMENT_ORDER.length * rowHeight}`}
        className="w-full h-auto border border-cyber-cyan/20 rounded"
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
          {/* Arrowhead markers for each instrument color */}
          <marker
            id="arrowhead-kick"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill={INSTRUMENT_COLORS.kick} fillOpacity="0.6" />
          </marker>
          <marker
            id="arrowhead-snare"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill={INSTRUMENT_COLORS.snare} fillOpacity="0.6" />
          </marker>
          <marker
            id="arrowhead-hats"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill={INSTRUMENT_COLORS.hats} fillOpacity="0.6" />
          </marker>
        </defs>
        <rect width={width} height={INSTRUMENT_ORDER.length * rowHeight} fill="url(#grid)" />

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
              y2={INSTRUMENT_ORDER.length * rowHeight}
              stroke="#00ffff30"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )
        })}

        {/* Instrument row labels and dividers */}
        {INSTRUMENT_ORDER.map((instrument, idx) => {
          const y = idx * rowHeight
          return (
            <g key={instrument}>
              {/* Row divider */}
              <line
                x1={0}
                y1={y}
                x2={width}
                y2={y}
                stroke="#00ffff20"
                strokeWidth="1"
              />
              {/* Label */}
              <text
                x={10}
                y={y + rowHeight / 2}
                fill={INSTRUMENT_COLORS[instrument]}
                fontSize="14"
                fontWeight="bold"
                dominantBaseline="middle"
              >
                {instrument.toUpperCase()}
              </text>
            </g>
          )
        })}

        {/* Render notes for each instrument */}
        {INSTRUMENT_ORDER.map((instrument) => {
          const notes = notePositions[instrument] || []
          const color = INSTRUMENT_COLORS[instrument]

          return (
            <g key={instrument}>
              {notes.map((note, idx) => {
                const noteWidth = 4
                const noteHeight = 30
                const showConnection = Math.abs(note.shift) > 2 // Show if shift > 2ms

                return (
                  <g key={idx}>
                    {/* Connecting line/arrow if shift > 2ms */}
                    {showConnection && (
                      <line
                        x1={note.originalX}
                        y1={note.y}
                        x2={note.newX}
                        y2={note.y}
                        stroke={color}
                        strokeWidth="1.5"
                        strokeOpacity="0.6"
                        markerEnd={`url(#arrowhead-${instrument})`}
                      />
                    )}

                    {/* Ghost note (original/input) - hollow grey rectangle */}
                    <rect
                      x={note.originalX - noteWidth / 2}
                      y={note.y - noteHeight / 2}
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
                      x={note.newX - noteWidth / 2}
                      y={note.y - noteHeight / 2}
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
                      x={note.newX - noteWidth / 2}
                      y={note.y - noteHeight / 2}
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
        })}
      </svg>

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

