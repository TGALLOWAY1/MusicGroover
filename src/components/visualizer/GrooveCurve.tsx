/**
 * GrooveCurve Component
 * Static SVG cubic bezier curve representing average timing deviation
 */

import { useMemo } from 'react'
import { useGrooveStore } from '../../store/useGrooveStore'

interface GrooveCurveProps {
  width?: number
  height?: number
}

export function GrooveCurve({ width = 1200, height = 120 }: GrooveCurveProps) {
  const { tracks } = useGrooveStore()

  // Calculate average timing deviation over time
  const curvePoints = useMemo(() => {
    if (tracks.length === 0) {
      // Return a flat line if no tracks
      return {
        points: `M 0 ${height / 2} L ${width} ${height / 2}`,
        controlPoints: [],
      }
    }

    // Collect all notes with their timing deviations
    const deviations: Array<{ time: number; deviation: number }> = []
    
    tracks.forEach((track) => {
      track.notes.forEach((note) => {
        const deviation = (note.newTime - note.originalTime) * 1000 // Convert to ms
        deviations.push({
          time: note.originalTime,
          deviation,
        })
      })
    })

    if (deviations.length === 0) {
      return {
        points: `M 0 ${height / 2} L ${width} ${height / 2}`,
        controlPoints: [],
      }
    }

    // Sort by time
    deviations.sort((a, b) => a.time - b.time)

    // Find time range
    const minTime = deviations[0].time
    const maxTime = deviations[deviations.length - 1].time
    const timeRange = maxTime - minTime || 1

    // Bin deviations by time windows (for averaging)
    const bins = 20
    const binSize = timeRange / bins
    const binnedDeviations: number[] = []
    const binCounts: number[] = []

    for (let i = 0; i < bins; i++) {
      binnedDeviations[i] = 0
      binCounts[i] = 0
    }

    deviations.forEach(({ time, deviation }) => {
      const binIndex = Math.min(
        Math.floor(((time - minTime) / timeRange) * bins),
        bins - 1
      )
      binnedDeviations[binIndex] += deviation
      binCounts[binIndex] += 1
    })

    // Calculate averages
    const averages = binnedDeviations.map((sum, i) =>
      binCounts[i] > 0 ? sum / binCounts[i] : 0
    )

    // Find max deviation for scaling
    const maxDeviation = Math.max(
      ...averages.map(Math.abs),
      1 // Avoid division by zero
    )

    // Generate path points
    const points: Array<{ x: number; y: number }> = []
    averages.forEach((avg, i) => {
      const x = (i / (bins - 1)) * width
      // Center at height/2, scale deviation to fit in height
      const y = height / 2 - (avg / maxDeviation) * (height / 2 - 20)
      points.push({ x, y })
    })

    // Create cubic bezier path
    if (points.length < 2) {
      return {
        points: `M 0 ${height / 2} L ${width} ${height / 2}`,
        controlPoints: [],
      }
    }

    // Build SVG path with cubic bezier curves
    let path = `M ${points[0].x} ${points[0].y}`
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const next = points[i + 1] || curr
      
      // Control points for smooth curve
      const cp1x = prev.x + (curr.x - prev.x) / 3
      const cp1y = prev.y
      const cp2x = curr.x - (next.x - curr.x) / 3
      const cp2y = curr.y
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`
    }

    return {
      points: path,
      controlPoints: points,
    }
  }, [tracks, width, height])

  return (
    <div className="w-full bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-300">Groove Curve</h3>
        <span className="text-xs text-slate-500">
          Average timing deviation over time
        </span>
      </div>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
      >
        {/* Grid lines */}
        <defs>
          <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Center line (zero deviation) */}
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#475569"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* Fill area under curve */}
        <path
          d={`${curvePoints.points} L ${width} ${height} L 0 ${height} Z`}
          fill="url(#curveGradient)"
          opacity="0.3"
        />

        {/* Main curve */}
        <path
          d={curvePoints.points}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Control points (optional, for debugging) */}
        {curvePoints.controlPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="2"
            fill="#06b6d4"
            opacity="0.5"
          />
        ))}
      </svg>

      {/* Labels */}
      <div className="flex justify-between text-xs text-slate-500 mt-2">
        <span>Early</span>
        <span>On Time</span>
        <span>Late</span>
      </div>
    </div>
  )
}

