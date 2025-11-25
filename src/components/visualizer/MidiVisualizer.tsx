/**
 * MIDI Visualizer Component
 * Canvas/SVG-based visualization of MIDI notes
 */

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGrooveStore } from '../../store/useGrooveStore'

interface MidiVisualizerProps {
  element: 'kick' | 'snare' | 'hat'
  width?: number
  height?: number
}

export function MidiVisualizer({ 
  element, 
  width = 800, 
  height = 100 
}: MidiVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { midiNotes, humanizedNotes } = useGrooveStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#0a0e27'
    ctx.fillRect(0, 0, width, height)

    // Draw grid
    ctx.strokeStyle = '#00ffff20'
    ctx.lineWidth = 1
    for (let i = 0; i <= 16; i++) {
      const x = (i / 16) * width
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Filter notes for this element
    const elementNotes = midiNotes.filter((note) => note.element === element)
    const elementHumanized = humanizedNotes.filter((note) => note.element === element)

    // Draw original notes
    elementNotes.forEach((note) => {
      const x = (note.time % 4) * (width / 4) // Assuming 4/4 time
      ctx.fillStyle = '#00ffff40'
      ctx.fillRect(x - 2, height / 2 - 20, 4, 40)
    })

    // Draw humanized notes
    elementHumanized.forEach((note) => {
      const x = (note.humanizedTime % 4) * (width / 4)
      ctx.fillStyle = '#ff6b35'
      ctx.fillRect(x - 3, height / 2 - 25, 6, 50)
      
      // Draw offset line
      if (note.offset !== 0) {
        ctx.strokeStyle = '#ff6b3560'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, height / 2 - 30)
        ctx.lineTo(x, height / 2 - 35)
        ctx.stroke()
      }
    })
  }, [midiNotes, humanizedNotes, element, width, height])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-cyber-cyan/30 rounded"
      />
      <div className="absolute top-2 left-2 text-xs text-cyber-cyan/60">
        {element.toUpperCase()}
      </div>
    </div>
  )
}

