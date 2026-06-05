/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        capture: {
          bg: '#020617',
          surface: '#0f172a',
          card: '#1e293b',
          primary: '#06b6d4',
          glow: '#67e8f9',
          metallic: '#94a3b8',
          navy: '#0f172a',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#f43f5e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(6, 182, 212, 0.25)',
        'glow-md': '0 0 24px rgba(6, 182, 212, 0.35)',
        'glow-lg': '0 0 40px rgba(103, 232, 249, 0.2)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'inner-glow': 'inset 0 1px 0 rgba(148, 163, 184, 0.12)',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(6, 182, 212, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.04) 1px, transparent 1px)',
        'metallic-gradient':
          'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 40%, #64748b 70%, #94a3b8 100%)',
        'surface-gradient':
          'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 1) 100%)',
      },
      backgroundSize: {
        grid: '32px 32px',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'scan-line': 'scan-line 4s linear infinite',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'slide-in-rtl': 'slide-in-rtl 0.35s ease-out forwards',
        'slide-in-ltr': 'slide-in-ltr 0.35s ease-out forwards',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(6, 182, 212, 0.2)' },
          '50%': { boxShadow: '0 0 28px rgba(103, 232, 249, 0.45)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-rtl': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-ltr': {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      borderColor: {
        DEFAULT: 'rgba(148, 163, 184, 0.12)',
      },
    },
  },
  plugins: [],
};
