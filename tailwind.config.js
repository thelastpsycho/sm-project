/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'sm-primary': '#0066CC', // Deep Blue
        'sm-secondary': '#8E8E93', // Apple Gray
        'sm-accent': '#30D158', // iOS Green
        'sm-bg': '#F2F2F7', // iOS System Gray 6
        'sm-bg-dark': '#000000', // OLED Black
        'sm-card': '#FFFFFF',
        'sm-card-dark': '#1C1C1E' // iOS Gray 6 Dark
      },
      animation: {
        shake: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
      },
      keyframes: {
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        }
      }
    }
  },
  plugins: [],
}

