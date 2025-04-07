/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        brand: ['MuseoModerno', 'cursive'],
      },
      minWidth: {
        '20': '4.5rem', // Reduzido para 72px para caber na resolução menor
        '16': '4rem',   // 64px
      },
    },
  },
  plugins: [],
};