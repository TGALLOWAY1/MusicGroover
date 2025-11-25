/**
 * Knob Control Component
 * Circular knob for precise value adjustment
 */

import { motion } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'

interface KnobProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  label: string
  unit?: string
}

export function Knob({ value, min, max, onChange, label, unit = '' }: KnobProps) {
  const [isDragging, setIsDragging] = useState(false)
  const knobRef = useRef<HTMLDivElement>(null)

  const percentage = ((value - min) / (max - min)) * 100
  const rotation = (percentage / 100) * 270 - 135 // -135 to 135 degrees

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    e.preventDefault()
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!knobRef.current) return

      const rect = knobRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
      let normalizedAngle = (angle + Math.PI / 2 + (3 * Math.PI) / 4) % (2 * Math.PI)
      if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI

      const normalizedValue = Math.min(1, Math.max(0, normalizedAngle / (3 * Math.PI / 2)))
      const newValue = min + normalizedValue * (max - min)
      onChange(Math.round(newValue * 10) / 10)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, min, max, onChange])

  return (
    <div className="flex flex-col items-center space-y-2">
      <label className="text-xs text-cyber-cyan/60">{label}</label>
      <div
        ref={knobRef}
        className="relative w-16 h-16 cursor-pointer"
        onMouseDown={handleMouseDown}
      >
        <svg width="64" height="64" className="transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="#1a1f3a"
            strokeWidth="4"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="#00ffff"
            strokeWidth="4"
            strokeDasharray={`${percentage * 1.76} 176`}
            className="transition-all"
          />
        </svg>
        <motion.div
          className="absolute top-1/2 left-1/2 w-1 h-6 bg-cyber-orange origin-bottom"
          style={{
            x: '-50%',
            y: '-50%',
            rotate: rotation,
            transformOrigin: '50% 100%',
          }}
        />
      </div>
      <div className="text-sm font-mono text-cyber-cyan">
        {value.toFixed(1)}{unit}
      </div>
    </div>
  )
}

