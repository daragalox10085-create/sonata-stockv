/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Professional Financial Terminal Palette
        primary: {
          deep: '#0F172A',      // Main text, logo background
          DEFAULT: '#1E40AF',   // Primary brand color
          light: '#3B82F6',     // Hover states
        },
        success: '#059669',     // Rise, profit, buy signals
        danger: '#DC2626',      // Fall, loss, stop-loss warnings
        warning: '#D97706',     // Caution, medium risk
        info: '#0284C7',        // Info hints, neutral data
        
        // Neutral palette
        text: {
          primary: '#111827',
          secondary: '#4B5563',
          tertiary: '#6B7280',
        },
        border: {
          light: '#E5E7EB',
          medium: '#D1D5DB',
        },
        bg: {
          primary: '#F9FAFB',
          surface: '#FFFFFF',
        }
      }
    },
  },
  plugins: [],
}
