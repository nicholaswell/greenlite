/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // example extension if you want a custom green later
        primary: "#2f855a"
      }
    },
  },
  plugins: [],
}
