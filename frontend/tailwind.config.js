/** @type {import('tailwindcss').Config} */
// Colors are theme tokens defined in src/index.css so they can switch with the dark-mode toggle.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Geist', 'SF Pro', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
