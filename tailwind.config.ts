import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        suspect: {
          primary: '#e9213d',      // Brand Color (red)
          body: '#0b0c10',         // Body background (dark)
          header: '#14151a',       // Header Background
          text: '#ffffff',         // Header Text
          nav: '#14151a',          // Main Navigation Background
          navText: '#ffffff',      // Main Navigation Text
          selected: '#ebf4f9',     // Selected
          selectedBorder: '#e9213d', // Selected Border
          dark: '#181a20',         // Light area background
          gray: {
            100: '#f8fafc',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
          }
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config 