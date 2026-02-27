/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f7f3ee',
          100: '#ece4d2',
          200: '#dfd4bb',
          300: '#cbb89a',
          400: '#b79f81',
          500: '#927f61',
          600: '#7a6a52',
          700: '#625543',
          800: '#4a4034',
          900: '#322b25',
        },
      },
    },
  },
  plugins: [],
}
