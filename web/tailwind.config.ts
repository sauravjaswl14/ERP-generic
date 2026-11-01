import type { Config } from 'tailwindcss';

/**
 * Palette taken from a triplicate (carbon-copy) form set: the white top sheet, the canary and
 * pink copies beneath it, ballpoint ink to fill it in, and carbon-tinted black for text.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chalk: '#F4F6F3',
        sheet: '#FDFDFB',
        canary: '#F6E27B',
        pink: '#F2B2C3',
        ink: '#1630D0', // ballpoint blue
        carbon: '#12161D',
        graphite: '#4A5260',
        rule: '#D5DAD6',
        ok: '#1B8A5A',
      },
      fontFamily: {
        sans: ['"Archivo Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        typed: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        sheet: '0 1px 0 rgba(18,22,29,.06), 0 12px 28px -12px rgba(18,22,29,.35), 0 2px 6px rgba(18,22,29,.08)',
        note: '0 10px 18px -10px rgba(18,22,29,.45)',
      },
    },
  },
  plugins: [],
};

export default config;
