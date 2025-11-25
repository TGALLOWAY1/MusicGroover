/**
 * ControlsPanel Component
 * Left sidebar with Pro Audio-style sliders for humanization settings
 */

import { useGrooveStore } from '../../store/useGrooveStore'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}

function ProAudioSlider({ label, value, min, max, step = 1, unit = '', onChange }: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="text-xs text-slate-400 font-mono">
          {value.toFixed(1)}{unit}
        </span>
      </div>
      <div className="relative">
        {/* Track */}
        <div className="h-1 bg-slate-700 rounded-full relative">
          {/* Filled portion */}
          <div
            className="h-1 bg-cyan-500 rounded-full transition-all"
            style={{ width: `${((value - min) / (max - min)) * 100}%` }}
          />
        </div>
        {/* Thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute top-0 left-0 w-full h-1 opacity-0 cursor-pointer"
          style={{
            background: 'transparent',
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
        />
        {/* Custom thumb indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full border-2 border-slate-900 shadow-lg shadow-cyan-500/50 transition-all pointer-events-none"
          style={{
            left: `calc(${((value - min) / (max - min)) * 100}% - 6px)`,
            boxShadow: '0 0 8px rgba(34, 211, 238, 0.6), 0 0 12px rgba(34, 211, 238, 0.4)',
          }}
        />
      </div>
    </div>
  )
}

function RegenerateButton() {
  const regenerateGroove = useGrooveStore((state) => state.regenerateGroove)
  
  return (
    <button
      onClick={regenerateGroove}
      className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md transition-colors font-medium text-sm"
    >
      Regenerate Groove
    </button>
  )
}

export function ControlsPanel() {
  const { settings, updateSetting } = useGrooveStore()

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 p-6 space-y-6 overflow-y-auto">
      <h2 className="text-lg font-semibold text-slate-200 mb-4">Controls</h2>

      <div className="space-y-6">
        {/* Global Swing */}
        <div>
          <ProAudioSlider
            label="Global Swing"
            value={settings.globalSwing}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={(value) => updateSetting('globalSwing', value)}
          />
          <p className="text-xs text-slate-500 mt-1">
            50 = no swing, 100 = maximum swing
          </p>
        </div>

        {/* Kick Jitter */}
        <div>
          <ProAudioSlider
            label="Kick Jitter"
            value={settings.kickJitter}
            min={0}
            max={50}
            step={0.5}
            unit="ms"
            onChange={(value) => updateSetting('kickJitter', value)}
          />
          <p className="text-xs text-slate-500 mt-1">
            Timing variance for kick drum
          </p>
        </div>

        {/* Snare Offset */}
        <div>
          <ProAudioSlider
            label="Snare Offset"
            value={settings.snareOffset}
            min={-20}
            max={20}
            step={0.5}
            unit="ms"
            onChange={(value) => updateSetting('snareOffset', value)}
          />
          <p className="text-xs text-slate-500 mt-1">
            Positive = late, negative = early
          </p>
        </div>

        {/* Hat Jitter (if defined) */}
        {settings.hatJitter !== undefined && (
          <div>
            <ProAudioSlider
              label="Hat Jitter"
              value={settings.hatJitter}
              min={0}
              max={100}
              step={0.5}
              unit="ms"
              onChange={(value) => updateSetting('hatJitter', value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              Timing variance for hi-hats
            </p>
          </div>
        )}

        {/* Regenerate Button */}
        <div className="pt-4 border-t border-slate-700">
          <RegenerateButton />
        </div>
      </div>
    </div>
  )
}

