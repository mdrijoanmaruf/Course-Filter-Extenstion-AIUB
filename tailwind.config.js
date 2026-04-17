/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        aiub: {
          navy: '#0d3a73',
          blue: '#1159b8',
          sky: '#eaf3ff',
          success: '#0f7b44',
          warning: '#7b5800',
          danger: '#b02525',
        },
      },
      fontFamily: {
        display: ['Poppins', 'Trebuchet MS', 'Verdana', 'sans-serif'],
      },
      boxShadow: {
        card: '0 12px 30px rgba(17, 89, 184, 0.10)',
      },
      backgroundImage: {
        'aiub-radial': 'radial-gradient(circle at 0% 0%, #ffffff 0%, #eef5ff 45%, #e3eeff 100%)',
      },
    },
  },
  plugins: [],
}
