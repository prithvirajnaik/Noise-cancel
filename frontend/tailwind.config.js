/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#1a1b26',
          secondary: '#24283b',
        },
        card: {
          DEFAULT: '#2a2f45',
        },
        border: {
          DEFAULT: '#3b4261',
        },
        primary: {
          DEFAULT: '#7aa2f7',
        },
        success: {
          DEFAULT: '#9ece6a',
        },
        warning: {
          DEFAULT: '#e0af68',
        },
        error: {
          DEFAULT: '#f7768e',
        },
        text: {
          primary: '#c0caf5',
          secondary: '#7d8590',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'SF Pro', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
