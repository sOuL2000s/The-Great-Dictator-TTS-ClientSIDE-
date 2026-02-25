/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dictator-dark': '#0b0f19', 
        'dictator-sidebar': '#0f172a',
        'dictator-accent': '#e11d48', // Rose-600 primary
        'dictator-accent-hover': '#be123c',
        'dictator-light': '#f8fafc',
        'dictator-secondary': '#64748b',
      }
    },
  },
  // Safelist classes used dynamically in App.jsx for theme switching
  safelist: [
    { 
      pattern: /(bg|text|focus:border|accent|file:bg|hover:bg|border|decoration|ring)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|dictator)-(950|900|800|700|600|500|400|300|200|100|50|light|dark|accent|success|danger|sidebar|secondary)/, 
      variants: ['focus', 'hover', 'active', 'group-hover'] 
    },
  ],
  plugins: [],
}