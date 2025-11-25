/**
 * Timing Slider Control
 * Adjusts timing range for a specific drum element
 */

import { motion } from 'framer-motion'
import { useGrooveStore } from '../../store/useGrooveStore'
import type { DrumElement } from '../../core/types'

interface TimingSliderProps {
  element: DrumElement
  label: string
}

export function TimingSlider({ element, label }: TimingSliderProps) {
  const { timingRules, updateTimingRule } = useGrooveStore()
  const rule = timingRules[element]

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold text-cyber-orange">
          {label}
        </label>
        <span className="text-xs text-cyber-cyan/60">
          {rule.min}ms / {rule.max}ms
        </span>
      </div>
      
      <div className="space-y-1">
        <div>
          <label className="text-xs text-cyber-cyan/60">Min</label>
          <input
            type="range"
            min="-30"
            max="0"
            value={rule.min}
            onChange={(e) =>
              updateTimingRule(element, { min: Number(e.target.value) })
            }
            className="w-full accent-cyber-cyan"
          />
        </div>
        
        <div>
          <label className="text-xs text-cyber-cyan/60">Max</label>
          <input
            type="range"
            min="0"
            max="30"
            value={rule.max}
            onChange={(e) =>
              updateTimingRule(element, { max: Number(e.target.value) })
            }
            className="w-full accent-cyber-orange"
          />
        </div>
      </div>
    </div>
  )
}

