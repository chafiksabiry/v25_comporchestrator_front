/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        antigravity: {
          // Remapped to Harx Light Theme (Blue, Grey, White, Green)
          bg: '#F8FAFC',       // Slate-50 (Very light grey/white)
          surface: '#FFFFFF',  // White
          primary: '#0284c7',  // Harx Blue (sky-600/700 equivalent)
          secondary: '#64748B',// Slate-500 (Grey)
          accent: '#10B981',   // Emerald-500 (Green)
          text: '#1E293B',     // Slate-800 (Dark Grey text)
          muted: '#94A3B8',    // Slate-400 (Muted Grey)
          border: '#E2E8F0',   // Slate-200 (Light Border)
        },
        harx: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          accent: {
            300: '#7dd3fc',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
