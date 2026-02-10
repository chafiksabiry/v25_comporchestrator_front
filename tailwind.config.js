/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        antigravity: {
          // Harx Purple/Light Theme
          bg: '#F8FAFC',       // Slate-50 (Light Background)
          surface: '#FFFFFF',  // White (Card Background)
          primary: '#4F46E5',  // Indigo-600 (Purple Header/Brand)
          secondary: '#64748B',// Slate-500 (Muted)
          accent: '#818CF8',   // Indigo-400 (Lighter Purple Accent)
          text: '#0F172A',     // Slate-900 (Dark Text)
          muted: '#64748B',    // Slate-500 (Muted Text)
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
