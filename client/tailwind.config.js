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
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f15fb0',
          500: '#db2777',
          600: '#c01860',
          700: '#9d1450',
          800: '#82123f',
          900: '#6b1035',
        },
        grape: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        night: {
          700: '#221f4a',
          800: '#1a1740',
          900: '#141230',
          950: '#0e0c22',
        },
        ink: {
          50: '#f6f6f9',
          100: '#eceaf1',
          200: '#d7d3e0',
          300: '#aca4bd',
          400: '#7c7392',
          500: '#585070',
          600: '#453f5b',
          700: '#363048',
          800: '#232032',
          900: '#151321',
          950: '#0c0b15',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,18,48,0.04), 0 6px 20px rgba(20,18,48,0.06)',
        soft: '0 16px 44px rgba(20,18,48,0.12)',
        lift: '0 24px 55px -14px rgba(214,32,110,0.42)',
        grape: '0 20px 45px -14px rgba(124,58,237,0.45)',
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
