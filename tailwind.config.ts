import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2F80ED',
        accentBlue: '#2D9CDB',
        borderLight: '#E6EEF5',
        textMain: '#333333',
        textMuted: '#4F4F4F',
        statusGreen: '#27AE60',
        statusYellow: '#F2C94C',
        statusRed: '#EB5757',
        background: '#F7FAFD',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
