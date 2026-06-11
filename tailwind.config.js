/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4f9',
          100: '#d9e4f0',
          200: '#b3c9e1',
          300: '#7da4c8',
          400: '#4d7faf',
          500: '#2d5a8e',
          600: '#1e3a5f',
          700: '#162d4a',
          800: '#0f2035',
          900: '#081220',
        },
        gold: '#c9a227',
      },
    },
  },
  plugins: [],
}
