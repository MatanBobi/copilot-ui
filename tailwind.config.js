/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{js,ts,jsx,tsx,html}'
  ],
  theme: {
    extend: {
      colors: {
        'copilot-bg': 'rgba(30, 30, 30, 0.85)',
        'copilot-surface': 'rgba(45, 45, 45, 0.9)',
        'copilot-border': 'rgba(70, 70, 70, 0.5)',
        'copilot-accent': '#58a6ff',
        'copilot-accent-hover': '#79b8ff',
        'copilot-text': '#e6edf3',
        'copilot-text-muted': '#8b949e'
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      backdropBlur: {
        'xl': '24px'
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate'
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(88, 166, 255, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(88, 166, 255, 0.6)' }
        }
      }
    }
  },
  plugins: []
}
