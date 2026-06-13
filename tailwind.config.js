/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Warm cream/beige palette — replaces cold navy tones
        navy: {
          50:  '#f7f3ed',  // warm cream — main page background
          100: '#eee7da',  // light warm — card borders, hover states
          200: '#d8cbba',  // warm tan — dividers, disabled
          300: '#b8a692',  // warm brown-gray — placeholder/muted
          400: '#8f7a69',  // medium warm — subdued text
          500: '#6b5c4d',  // warm brown — labels, captions
          600: '#4a3929',  // dark warm — secondary text
          700: '#321f13',  // very dark warm
          800: '#1f1009',  // near-black warm — sidebar top
          900: '#0e0805',  // darkest — sidebar bottom
        },
        gold:  '#c9a227',
        brand: {
          400: '#4a8a72',  // light forest green
          500: '#2e6b52',  // forest green — primary actions
          600: '#1f4d3a',  // dark forest green
        },
      },
    },
  },
  plugins: [],
}
