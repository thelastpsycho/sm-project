/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Nunito Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      colors: {
        'sm-primary': '#0066CC', // Deep Blue — spent once per screen
        'sm-secondary': '#8E8E93', // Apple Gray
        'sm-accent': '#30D158', // iOS Green
        'sm-bg': '#F2F2F7', // iOS System Gray 6
        'sm-bg-dark': '#000000', // OLED Black
        'sm-card': '#FFFFFF',
        'sm-card-dark': '#1C1C1E', // iOS Gray 6 Dark
        // Action-queue editorial palette — ink, hairline, whitespace
        'sm-ink': '#1C1C1E', // near-black — primary text, buttons, FABs
        'sm-ink-soft': '#6B7280', // secondary reading text
        'sm-muted': '#8E8E93', // micro-labels, meta
        'sm-faint': '#C7C7CC', // placeholders, disabled marks
        'sm-line': '#E5E5EA', // section hairline
        'sm-hair': '#F0F0F2', // list-row hairline
        'sm-surface': '#FAFAFA', // page canvas
        // Semantic status
        'sm-won': '#1E9E4A',
        'sm-warn': '#C77700',
        'sm-bad': '#D92F2F',
        'sm-wed': '#7C3AED'
      },
      animation: {
        shake: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: [],
}