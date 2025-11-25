import React, { useState, useEffect, useRef, useCallback } from 'react'

interface KnobProps {
  value: number
  min: number
  max: number
  onChange: (val: number) => void
  onChangeEnd?: (val: number) => void
  label: string
  size?: number
  color?: string
  units?: string
}

// Helper to convert polar coordinates to cartesian
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  // SVG angle convention: 0 is 3 o'clock, clockwise is positive.
  // We want 0 to be 12 o'clock (top), so we subtract 90 degrees.
  // But since our input angles are already relative to "top is 0",
  // we just need to adjust them to SVG space.
  // SVG 0 = Right. Top = -90.
  // So angle -90 + angleInDegrees.
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

// Helper to describe an SVG arc
function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  const d = [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
  return d;
}

export function Knob({
  value,
  min,
  max,
  onChange,
  onChangeEnd,
  label,
  size = 64,
  color = '#00ffff', // default cyber-cyan
  units = ''
}: KnobProps) {
  const props = { value, min, max, onChange, onChangeEnd, label, size, color, units }
  const [isDragging, setIsDragging] = useState(false)
  
  // Refs to track drag state
  const dragStartRef = useRef<{ y: number; value: number } | null>(null)
  const lastValueRef = useRef(value)

  // Keep lastValueRef in sync with value prop when not dragging
  useEffect(() => {
    if (!isDragging) {
      lastValueRef.current = value
    }
  }, [value, isDragging])
  
  // Constants for arc rendering
  const STROKE_WIDTH = size * 0.08 // Dynamic stroke width based on size
  const RADIUS = (size / 2) - STROKE_WIDTH // Radius accounting for stroke
  const CENTER = size / 2
  const MIN_ANGLE = -135
  const MAX_ANGLE = 135
  const ANGLE_RANGE = MAX_ANGLE - MIN_ANGLE
  
  // Calculate current angle based on value
  // Clamp value to ensure it's within bounds for display
  const clampedValue = Math.min(Math.max(value, min), max)
  const valueRatio = (clampedValue - min) / (max - min)
  const currentAngle = MIN_ANGLE + (valueRatio * ANGLE_RANGE)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      y: e.clientY,
      value: value
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current) return

    const deltaY = dragStartRef.current.y - e.clientY // Positive when dragging up
    const SENSITIVITY = 200 // Pixels to cover full range
    
    const deltaValue = (deltaY / SENSITIVITY) * (max - min)
    const newValue = Math.min(Math.max(dragStartRef.current.value + deltaValue, min), max)
    
    onChange(newValue)
    lastValueRef.current = newValue
  }, [max, min, onChange])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
    if (props.onChangeEnd) {
      props.onChangeEnd(lastValueRef.current)
    }
  }, [props.onChangeEnd])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div className="flex flex-col items-center select-none group">
      {/* Knob Container */}
      <div 
        className="relative cursor-ns-resize"
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
      >
        {/* SVG Ring */}
        <svg width={size} height={size} className="pointer-events-none">
          {/* Background Track (Dark Grey) */}
          <path
            d={describeArc(CENTER, CENTER, RADIUS, MIN_ANGLE, MAX_ANGLE)}
            fill="none"
            stroke="#334155" // slate-700
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
          
          {/* Active Value Arc (Colored) */}
          <path
            d={describeArc(CENTER, CENTER, RADIUS, MIN_ANGLE, currentAngle)}
            fill="none"
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            style={{ 
              filter: `drop-shadow(0 0 4px ${color}40)` // Subtle glow
            }}
          />
        </svg>

        {/* Pointer / Cap */}
        <div 
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ transform: `rotate(${currentAngle}deg)` }}
        >
          {/* Dot/Line indicator on the edge */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 bg-white rounded-full shadow-sm"
            style={{
              top: STROKE_WIDTH / 2, // Center on the track
              width: STROKE_WIDTH,
              height: STROKE_WIDTH,
              boxShadow: `0 0 4px ${color}`
            }}
          />
        </div>

        {/* Center Value Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs font-bold text-slate-200 leading-none">
            {Math.round(value)}
          </span>
          {units && (
            <span className="text-[10px] text-slate-500 leading-none mt-0.5">
              {units}
            </span>
          )}
        </div>
      </div>

      {/* External Label */}
      <div className="mt-2 text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
        {label}
      </div>
    </div>
  )
}
