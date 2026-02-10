/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        antigravity: {
          // Harx Dark Theme (Professional Deep Blue/Grey)
          bg: '#0F172A',       // Slate-900 (Deep Blue Black)
          surface: '#1E293B',  // Slate-800 (Card Background)
          primary: '#38BDF8',  // Sky-400 (Bright Blue accent)
          secondary: '#64748B',// Slate-500 (Muted Blue/Grey)
          accent: '#34D399',   // Emerald-400 (Bright Green)
          text: '#F8FAFC',     // Slate-50 (White text)
          muted: '#94A3B8',    // Slate-400 (Secondary text)
          border: '#334155',   // Slate-700 (Borders)
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
