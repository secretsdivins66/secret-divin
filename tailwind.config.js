/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bleu': '#0a0e2e',
        'bleu-clair': '#1a237e',
        'or': '#f9a825',
        'or-pale': '#ffd54f',
      },
      fontFamily: {
        'arabe': ['Noto Naskh Arabic', 'serif'],
        'latin': ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
