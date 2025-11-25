import { useGrooveStore } from '../../store/useGrooveStore'
import { Knob } from './Knob'

export function ControlsPanel() {
  const { settings, updateSetting, regenerateGroove } = useGrooveStore()

  return (
    <div className="w-72 bg-slate-900 border-r border-slate-800 p-6 overflow-y-auto h-full shadow-xl custom-scrollbar">
      <h2 className="text-lg font-semibold text-slate-200 mb-8 tracking-tight">Groove Control</h2>

      <div className="space-y-8">
        
        {/* Global Group */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">GLOBAL</span>
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Centering the single knob for now as we don't have 'Groove Amount' */}
            <div className="col-span-2 flex justify-center">
              <Knob
                label="SWING %"
                value={settings.globalSwing}
                min={0}
                max={100}
                onChange={(v) => updateSetting('globalSwing', v, false)}
                onChangeEnd={regenerateGroove}
                unit="%"
                color="#22d3ee"
              />
            </div>
          </div>
        </div>

        {/* Kick Group */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">KICK</span>
            <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex justify-center">
              <Knob
                label="TIGHTNESS"
                value={settings.kickJitter}
                min={0}
                max={20}
                onChange={(v) => updateSetting('kickJitter', v, false)}
                onChangeEnd={regenerateGroove}
                unit="ms"
                color="#60a5fa"
              />
            </div>
          </div>
        </div>

        {/* Snare Group */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">SNARE</span>
            <div className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-center">
              <Knob
                label="OFFSET"
                value={settings.snareOffset}
                min={-50}
                max={50}
                onChange={(v) => updateSetting('snareOffset', v, false)}
                onChangeEnd={regenerateGroove}
                unit="ms"
                color="#2dd4bf"
              />
            </div>
            <div className="flex justify-center">
              <Knob
                label="RANDOM"
                value={settings.snareRandomness}
                min={0}
                max={20}
                onChange={(v) => updateSetting('snareRandomness', v, false)}
                onChangeEnd={regenerateGroove}
                unit="ms"
                color="#2dd4bf"
              />
            </div>
          </div>
        </div>

        {/* Hats Group */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">HATS</span>
            <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex justify-center">
              <Knob
                label="JITTER"
                value={settings.hatJitter}
                min={0}
                max={20}
                onChange={(v) => updateSetting('hatJitter', v, false)}
                onChangeEnd={regenerateGroove}
                unit="ms"
                color="#fbbf24"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
