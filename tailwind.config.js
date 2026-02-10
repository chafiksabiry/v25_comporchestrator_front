/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        antigravity: {
          bg: '#0B0C15',       // Deep Space Black
          surface: '#1A1D2D',  // Dark Blue-Grey
          primary: '#8b5cf6',  // Electric Violet
          secondary: '#3b82f6',// Neon Blue
          accent: '#f43f5e',   // Rose/Alert
          text: '#E2E8F0',     // Off-white
          muted: '#94A3B8',    // Slate Grey
          border: '#2D3748',   // Dark Border
        },
        harx: { // Keeping harx colors available but remapping if needed or just adding new ones
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7', // Existing harx-600
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          accent: {
            300: '#7dd3fc', // Existing harx-accent-300
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'], // Ensure a clean font
      }
    },
  },
  plugins: [],
};
