/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dictator-dark': '#0f172a', // dark mode background (slate-900)
        'dictator-accent': '#e11d48', // accent color (rose-600)
        'dictator-light': '#f1f5f9', // light mode background (slate-100)
      }
    },
  },
  // Safelist classes used dynamically in App.jsx for theme switching
  safelist: [
    // Covers multiple color sets for dynamic theme switching and dark/light modes:
    { 
      pattern: /(bg|text|focus:border|accent|file:bg|hover:bg|border)-(slate|gray|cyan|purple|dictator|zinc|green|blue|yellow|amber|pink|sky|neutral|fuchsia|orange|white|black)-(950|900|800|700|600|500|400|300|200|100|50|light|dark|accent)/, 
      variants: ['focus', 'hover'] 
    },
  ],
  plugins: [],
}