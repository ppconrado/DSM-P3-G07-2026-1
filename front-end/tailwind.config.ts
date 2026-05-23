import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        academy: {
          primary: 'hsl(var(--academy-primary))',
          secondary: 'hsl(var(--academy-secondary))',
          accent: 'hsl(var(--academy-accent))',
          surface: 'hsl(var(--academy-surface))',
          text: 'hsl(var(--academy-text))',
          muted: 'hsl(var(--academy-muted))',
        },
      },
      boxShadow: {
        soft: '0 18px 50px rgba(15, 23, 42, 0.08)',
      },
      fontFamily: {
        sans: ['var(--font-open-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
        body: ['var(--font-lato)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-roboto-mono)', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'academy-hero':
          'radial-gradient(circle at top left, rgba(0, 178, 148, 0.18), transparent 30%), radial-gradient(circle at top right, rgba(255, 140, 0, 0.14), transparent 28%), linear-gradient(180deg, rgba(245, 247, 250, 0.98), rgba(245, 247, 250, 0.92))',
      },
    },
  },
  plugins: [],
};

export default config;
