/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff1f4',
          100: '#ffe0e7',
          200: '#ffc6d3',
          300: '#fb9bb2',
          400: '#f56389',
          500: '#e93765',
          600: '#d21850',
          700: '#b00d42',
          800: '#8f0f3c',
          900: '#7a1238',
        },
        ink: {
          50: '#f6f5f7',
          100: '#e9e6ea',
          200: '#d0cad3',
          300: '#a89ead',
          400: '#7a6e80',
          500: '#584e5f',
          600: '#443b4a',
          700: '#372f3c',
          800: '#241e28',
          900: '#161119',
          950: '#0d0a0f',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(22,17,25,0.04), 0 4px 16px rgba(22,17,25,0.05)',
        soft: '0 12px 40px rgba(22,17,25,0.10)',
        lift: '0 20px 50px -12px rgba(178,13,66,0.28)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fadeIn .4s ease both',
        floaty: 'floaty 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
