import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fc: {
          bg: '#060807',
          card: '#0d100d',
          hover: '#141814',
          elevated: '#1a1f1a',
          surface: '#222722',
          border: '#1a201a',
          'border-light': '#2a322a',
          'border-green': '#1f3d28',
          text: '#eaeee8',
          'text-muted': '#7a8574',
          'text-dim': '#3d4a39',
          green: {
            DEFAULT: '#4ade80',
            bright: '#86efac',
            pale: '#bbf7d0',
            dark: '#166534',
            glow: 'rgba(74, 222, 128, 0.06)',
          },
          gold: {
            DEFAULT: '#fbbf24',
            dim: '#b39700',
            glow: 'rgba(251, 191, 36, 0.06)',
          },
          red: {
            DEFAULT: '#f87171',
            dim: '#cc3333',
            glow: 'rgba(248, 113, 113, 0.06)',
          },
        },
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['IBM Plex Mono', 'system-ui', 'sans-serif'],
        display: ['IBM Plex Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],    // 11px
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }],  // 10px
      },
      letterSpacing: {
        'widest-2': '0.2em',
        'widest-3': '0.3em',
      },
      boxShadow: {
        'green-glow': '0 0 30px rgba(74, 222, 128, 0.08)',
        'green-glow-lg': '0 0 60px rgba(74, 222, 128, 0.15)',
        'green-glow-xl': '0 0 100px rgba(74, 222, 128, 0.1)',
        'gold-glow': '0 0 30px rgba(251, 191, 36, 0.08)',
        'red-glow': '0 0 30px rgba(248, 113, 113, 0.08)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
        'card-lg': '0 4px 20px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-green': 'pulse-green 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'count-down': 'count-down 1s ease-out',
        'gradient': 'gradient 6s ease infinite',
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(74, 222, 128, 0.1)' },
          '50%': { boxShadow: '0 0 24px 4px rgba(74, 222, 128, 0.15)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'count-down': {
          '0%': { transform: 'scale(1.3)', opacity: '0.5' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'gradient': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
