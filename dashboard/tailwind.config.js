/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rapid: {
          bg: '#0f172a',       // slate-900
          surface: '#1e293b',  // slate-800
          border: '#334155',   // slate-700
          text: '#e2e8f0',     // slate-200
          muted: '#94a3b8',    // slate-400
          accent: '#38bdf8',   // sky-400
        },
        severity: {
          normal: '#22c55e',   // green-500
          watch: '#eab308',    // yellow-500
          warning: '#f97316',  // orange-500
          alarm: '#ef4444',    // red-500
        },
        health: {
          healthy: '#22c55e',
          degrading: '#eab308',
          unstable: '#f97316',
          critical: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}
