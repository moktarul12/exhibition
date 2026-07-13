/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fdf2f5',
          100: '#fce8ef',
          200: '#f7c9d6',
          300: '#f09bb3',
          400: '#e56b8f',
          500: '#c93a62',
          600: '#a30d3a',
          700: '#8b0a31',
          800: '#740a2c',
          900: '#620d29',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)',
        soft: '0 8px 28px rgba(16,24,40,0.10)',
      },
    },
  },
  plugins: [],
};
