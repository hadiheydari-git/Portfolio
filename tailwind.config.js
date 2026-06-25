/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Vazirmatn', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#070809',
        panel: '#0d1014',
        line: 'rgba(255,255,255,0.1)',
        mist: '#a7afb8',
        neon: '#7dd3fc',
        citrus: '#ff8a1d',
        signal: '#2ed15f',
      },
      boxShadow: {
        glow: '0 0 34px rgba(125, 211, 252, 0.12)',
        orange: '0 0 30px rgba(255, 138, 29, 0.18)',
        green: '0 0 30px rgba(46, 209, 95, 0.16)',
      },
    },
  },
  plugins: [],
}
