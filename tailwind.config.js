/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'harx': {
          50: '#fff5f5',
          100: '#ffe0e0',
          200: '#ffc2c2',
          300: '#ff9494',
          400: '#ff6b6b',
          500: '#ff4d4d', // Primary HARX red-orange
          600: '#ff3333',
          700: '#ff1a1a',
          800: '#ff0000',
          900: '#cc0000',
          950: '#990000',
        },
        'harx-alt': {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899', // Secondary HARX pink
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
          950: '#500724',
        },
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
        'gradient-harx': 'linear-gradient(to right, #ff4d4d, #ec4899)',
        'gradient-harx-soft': 'linear-gradient(135deg, #ff6b6b 0%, #f472b6 55%, #ec4899 100%)',
        'gradient-harx-header': 'linear-gradient(135deg, #fff5f5 0%, #ffffff 45%, #fdf2f8 100%)',
        'gradient-matching-page': 'radial-gradient(ellipse at top left, #fff5f5 0%, #f8fafc 40%, #ffffff 100%)',
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

