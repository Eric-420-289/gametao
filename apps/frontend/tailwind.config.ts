import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0f172a',
        accent: '#38bdf8',
        accentSoft: '#1e293b'
      }
    }
  },
  plugins: []
} satisfies Config;
