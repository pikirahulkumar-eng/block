/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gamebg: '#1A1A2E',
        gridbg: '#2A2A3D',
        cell: '#16213E',
      }
    },
  },
  plugins: [],
}
