/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dictator-dark': '#0f172a', // slate-900
        'dictator-accent': '#e11d48', // rose-600
        'dictator-light': '#f1f5f9',
      }
    },
  },
  plugins: [],
}