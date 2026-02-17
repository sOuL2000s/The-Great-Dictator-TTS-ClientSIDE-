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
  // Safelist classes used dynamically in App.jsx for theme switching
  safelist: [
    // Covers multiple color sets for dynamic theme switching:
    { 
      pattern: /(bg|text|focus:border|accent)-(slate|gray|cyan|purple|dictator|zinc|green|blue|yellow|amber|pink|sky|neutral|fuchsia|orange)-(950|900|800|700|600|500|400|300|200|100|50|light|accent)/, 
      variants: ['focus'] 
    },
  ],
  plugins: [],
}