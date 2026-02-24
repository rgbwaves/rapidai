/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // ── Typography ──────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Display — hero numbers
        'display-lg': ['3.5rem', { lineHeight: '1', fontWeight: '800', letterSpacing: '-0.02em' }],
        'display-md': ['2.5rem', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.015em' }],
        'display-sm': ['1.75rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }],
        // Headings
        'heading-lg': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'heading-md': ['1rem',    { lineHeight: '1.5', fontWeight: '600' }],
        'heading-sm': ['0.875rem',{ lineHeight: '1.5', fontWeight: '600' }],
        // Body
        'body-lg':    ['0.9375rem',{ lineHeight: '1.6', fontWeight: '400' }],
        'body-md':    ['0.875rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm':    ['0.8125rem',{ lineHeight: '1.5', fontWeight: '400' }],
        // Labels / caps
        'label-lg':   ['0.75rem', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.06em' }],
        'label-md':   ['0.6875rem',{ lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.07em' }],
        'label-sm':   ['0.625rem', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.08em' }],
        // Mono data
        'data-lg':    ['1.5rem',  { lineHeight: '1.2', fontWeight: '700', fontFamily: 'JetBrains Mono, monospace' }],
        'data-md':    ['1rem',    { lineHeight: '1.3', fontWeight: '600', fontFamily: 'JetBrains Mono, monospace' }],
        'data-sm':    ['0.8125rem',{ lineHeight: '1.4', fontWeight: '500', fontFamily: 'JetBrains Mono, monospace' }],
      },

      // ── Colors ──────────────────────────────────────────────────────────────
      colors: {
        // Surface hierarchy — three levels over slate-950 base
        surface: {
          0: '#020617',  // slate-950  — page background
          1: '#0f172a',  // slate-900  — primary surface (cards, panels)
          2: '#1e293b',  // slate-800  — elevated surface (nested cards, modals)
          3: '#293548',  // slate-750  — highest elevation (tooltips, popovers)
        },
        // Border hierarchy
        edge: {
          subtle: '#1e293b',   // barely visible separation
          default: '#334155',  // standard border
          strong: '#475569',   // emphasis border
          accent: '#38bdf8',   // interactive highlight
        },
        // Original rapid- namespace kept + extended
        rapid: {
          bg: '#020617',
          surface: '#0f172a',
          panel: '#1e293b',
          border: '#334155',
          text: '#e2e8f0',
          muted: '#94a3b8',
          subtle: '#64748b',
          accent: '#38bdf8',
          'accent-dim': '#0ea5e9',
          'accent-glow': 'rgba(56,189,248,0.15)',
        },
        // Severity — with glow variants for chart use
        severity: {
          normal: '#22c55e',
          'normal-dim': '#16a34a',
          'normal-glow': 'rgba(34,197,94,0.2)',
          watch: '#eab308',
          'watch-dim': '#ca8a04',
          'watch-glow': 'rgba(234,179,8,0.2)',
          warning: '#f97316',
          'warning-dim': '#ea580c',
          'warning-glow': 'rgba(249,115,22,0.2)',
          alarm: '#ef4444',
          'alarm-dim': '#dc2626',
          'alarm-glow': 'rgba(239,68,68,0.2)',
        },
        // Health stages
        health: {
          healthy: '#22c55e',
          'healthy-dim': '#16a34a',
          degrading: '#eab308',
          'degrading-dim': '#ca8a04',
          unstable: '#f97316',
          'unstable-dim': '#ea580c',
          critical: '#ef4444',
          'critical-dim': '#dc2626',
          blocked: '#6b7280',
        },
        // Chart palette — 6 colors, visually distinct in dark context
        chart: {
          1: '#38bdf8',  // sky      — primary
          2: '#a78bfa',  // violet   — secondary
          3: '#34d399',  // emerald  — positive
          4: '#fb923c',  // orange   — caution
          5: '#f472b6',  // pink     — accent
          6: '#94a3b8',  // slate    — neutral/baseline
        },
        // Status indicator states
        status: {
          live: '#22c55e',
          idle: '#94a3b8',
          processing: '#38bdf8',
          error: '#ef4444',
          warning: '#f97316',
        },
      },

      // ── Spacing (8px base grid) ──────────────────────────────────────────────
      spacing: {
        // Named semantic spacing on top of Tailwind's default scale
        'sidebar-collapsed': '56px',
        'sidebar-expanded': '220px',
        'command-bar': '56px',
        'canvas-gutter': '24px',
      },

      // ── Border radius ────────────────────────────────────────────────────────
      borderRadius: {
        'card': '12px',
        'badge': '6px',
        'pill': '9999px',
      },

      // ── Box shadows ──────────────────────────────────────────────────────────
      boxShadow: {
        'card':     '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'elevated': '0 4px 12px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.4)',
        'float':    '0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.5)',
        'glow-sky': '0 0 16px rgba(56,189,248,0.35)',
        'glow-alarm': '0 0 16px rgba(239,68,68,0.4)',
        'glow-normal': '0 0 12px rgba(34,197,94,0.35)',
        'inset-edge': 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },

      // ── Keyframe animations ─────────────────────────────────────────────────
      keyframes: {
        // Entrance
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Status pulses
        'pulse-ring': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.4', transform: 'scale(1.4)' },
        },
        'breathe': {
          '0%, 100%': { opacity: '0.7' },
          '50%':      { opacity: '1' },
        },
        // Data animations
        'gauge-fill': {
          '0%':   { strokeDashoffset: 'var(--gauge-circumference)' },
          '100%': { strokeDashoffset: 'var(--gauge-offset)' },
        },
        'count-up': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // View transition
        'slide-in-right': {
          '0%':   { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // Loading skeleton shimmer
        'shimmer': {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        // Command bar processing indicator
        'scan-line': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      animation: {
        // Entrance — stagger via CSS custom property delay
        'fade-up':     'fade-up 0.3s ease-out both',
        'scale-in':    'scale-in 0.2s ease-out both',
        'fade-in':     'fade-in 0.2s ease-out both',
        // Status
        'pulse-ring':  'pulse-ring 2s ease-in-out infinite',
        'breathe':     'breathe 3s ease-in-out infinite',
        // Data
        'count-up':    'count-up 0.4s ease-out both',
        // View transitions
        'slide-in-right': 'slide-in-right 0.25s ease-out both',
        'slide-in-left':  'slide-in-left 0.25s ease-out both',
        // Loading
        'shimmer':     'shimmer 1.6s linear infinite',
        'scan-line':   'scan-line 1.2s ease-in-out infinite',
      },

      // ── Transitions ──────────────────────────────────────────────────────────
      transitionDuration: {
        'fast':   '100ms',
        'base':   '150ms',
        'slow':   '250ms',
        'slower': '400ms',
        'view':   '300ms',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      // ── Backgrounds ──────────────────────────────────────────────────────────
      backgroundImage: {
        'surface-gradient': 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
        'card-glass': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
        'accent-gradient': 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
        'alarm-gradient':  'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
        'healthy-gradient': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
        // Noise texture for cockpit feel
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },

      // ── Backdrop blur ────────────────────────────────────────────────────────
      backdropBlur: {
        'glass': '12px',
      },
    },
  },
  plugins: [],
}
