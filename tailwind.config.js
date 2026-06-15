/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Semantic tokens driven by CSS variables (see index.css)
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        content: 'rgb(var(--content) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        'flame-2': 'rgb(var(--flame-2) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        glass: '0 8px 32px -8px rgba(0, 0, 0, 0.24)',
        glow: '0 0 0 1px rgb(var(--accent) / 0.4), 0 8px 30px -6px rgb(var(--accent) / 0.35)',
        ember:
          '0 0 0 1px rgb(var(--accent) / 0.35), 0 0 40px -8px rgb(var(--accent) / 0.55), 0 0 80px -16px rgb(var(--flame-2) / 0.4)',
      },
      backgroundImage: {
        flame: 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--flame-2)))',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        flicker: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(0.98)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.18s ease-out',
        flicker: 'flicker 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
