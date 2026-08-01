/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'harx': {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#ED1C24', // Primary HARX red
          600: '#D11920',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
          950: '#450A0A',
        },
        'harx-alt': {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#E6188D', // Secondary HARX magenta
          600: '#DB2777',
          700: '#BE185D',
          800: '#9D174D',
          900: '#831843',
          950: '#500724',
        },
        'harx-orange': {
          DEFAULT: '#F7941E',
          50: '#FFF7ED',
          100: '#FFEDD5',
          500: '#F7941E',
          600: '#D9821A',
        },
        'harx-ink': '#0F172A',
        'harx-muted': '#64748B',
        'harx-border': '#E2E8F0',
        'harx-bg': '#F4F6F8',
        'harx-sidebar': '#0B0B0F',
        'harx-chip': '#1A1A1F',
        'harx-chip-border': '#2A2A32',
      },
      borderRadius: {
        harx: '14px',
      },
      boxShadow: {
        harx: '0 1px 2px rgba(15, 23, 42, 0.04)',
        'harx-md': '0 4px 12px rgba(15, 23, 42, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
        'bounce-slow': 'bounce 3s infinite',
        'float': 'float 6s infinite ease-in-out',
        'escrow-glow': 'escrowGlow 2.5s ease-in-out infinite',
        'escrow-shine': 'escrowShine 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        escrowGlow: {
          '0%, 100%': { boxShadow: '0 0 20px -4px rgba(251, 191, 36, 0.25), 0 0 0 1px rgba(251, 191, 36, 0.15)' },
          '50%': { boxShadow: '0 0 28px -2px rgba(244, 63, 94, 0.35), 0 0 0 1px rgba(251, 191, 36, 0.35)' },
        },
        escrowShine: {
          '0%': { transform: 'translateX(-120%) skewX(-12deg)' },
          '100%': { transform: 'translateX(220%) skewX(-12deg)' },
        },
      },
      backgroundImage: {
        'gradient-harx': 'linear-gradient(90deg, #F7941E 0%, #E6188D 55%, #ED1C24 100%)',
        'gradient-harx-soft': 'linear-gradient(90deg, #F7941E 0%, #E6188D 100%)',
        'gradient-rep-accent': 'linear-gradient(135deg, #6366f1 0%, #818cf8 55%, #4f46e5 100%)',
        'gradient-rep-header': 'linear-gradient(135deg, #eef2ff 0%, #ffffff 50%, #f8fafc 100%)',
        'gradient-rep-page': 'radial-gradient(ellipse at top left, #eef2ff 0%, #f8fafc 40%, #ffffff 100%)',
        'gradient-escrow': 'linear-gradient(135deg, rgba(251, 191, 36, 0.25) 0%, rgba(244, 63, 94, 0.2) 50%, rgba(255, 77, 77, 0.15) 100%)',
        'gradient-escrow-icon': 'linear-gradient(135deg, #f59e0b 0%, #f43f5e 50%, #ff4d4d 100%)',
        'premium-gradient': 'radial-gradient(circle at top left, #fff5f5 0%, #ffffff 100%)',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '100ch',
          },
        },
      },
    },
  },
  plugins: [],
};
