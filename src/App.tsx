import { motion } from 'framer-motion'

function App() {
  return (
    <div className="min-h-screen bg-deep-blue text-cyber-cyan">
      <div className="container mx-auto px-4 py-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold glow-cyan mb-2">
            🎵 Music Groover
          </h1>
          <p className="text-cyber-orange text-sm">
            MIDI Humanization Tool
          </p>
        </motion.header>

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-8"
        >
          {/* Placeholder for laned UI */}
          <div className="grid gap-4">
            <div className="bg-midnight-blue border border-cyber-cyan/20 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-cyber-orange">
                Kick Lane
              </h2>
              <p className="text-sm text-cyber-cyan/60">
                Visualizer and controls will go here
              </p>
            </div>
            
            <div className="bg-midnight-blue border border-cyber-cyan/20 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-cyber-orange">
                Snare Lane
              </h2>
              <p className="text-sm text-cyber-cyan/60">
                Visualizer and controls will go here
              </p>
            </div>
            
            <div className="bg-midnight-blue border border-cyber-cyan/20 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-cyber-orange">
                Hats Lane
              </h2>
              <p className="text-sm text-cyber-cyan/60">
                Visualizer and controls will go here
              </p>
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  )
}

export default App

