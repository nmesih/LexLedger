/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0F1B2D',
        },
        gold: {
          50: '#fdf8ec',
          100: '#f9edcc',
          200: '#f3d98a',
          300: '#edc54a',
          400: '#C9A84C',
          500: '#b8922d',
          600: '#9a7524',
          700: '#7c5c1e',
          800: '#634a1a',
          900: '#523d17',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: []
}
