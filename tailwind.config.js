/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Cyberpunk/Ableton palette
        'cyber-cyan': '#00ffff',
        'cyber-orange': '#ff6b35',
        'deep-blue': '#0a0e27',
        'midnight-blue': '#1a1f3a',
        'neon-blue': '#0066ff',
        'dark-purple': '#1e1b3d',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Monaco', 'Courier New', 'monospace'],
      },
      animation: {
        'pulse-cyan': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00ffff, 0 0 10px #00ffff' },
          '100%': { boxShadow: '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff' },
        },
      },
    },
  },
  plugins: [],
}

