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
          bg: '#080a08',
          card: '#0f120f',
          hover: '#151a15',
          elevated: '#1a1f1a',
          surface: '#222722',
          border: '#1e241e',
          'border-light': '#2a302a',
          'border-green': '#2d4a35',
          text: '#e8e8e2',
          'text-muted': '#6b7265',
          'text-dim': '#3d4439',
          green: {
            DEFAULT: '#adf0c7',
            bright: '#d1f09f',
            dark: '#2d6a3f',
            glow: 'rgba(173, 240, 199, 0.08)',
          },
          gold: {
            DEFAULT: '#ffdc4a',
            dim: '#b39700',
            glow: 'rgba(255, 220, 74, 0.08)',
          },
          red: {
            DEFAULT: '#ff4d4d',
            dim: '#cc3333',
            glow: 'rgba(255, 77, 77, 0.08)',
          },
        },
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'Fira Code', 'Courier New', 'monospace'],
        display: ['Caveat', 'Georgia', 'cursive'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],  // 10px
        '3xs': ['0.5rem', { lineHeight: '0.75rem' }],     // 8px
      },
      letterSpacing: {
        'widest-2': '0.2em',
        'widest-3': '0.3em',
      },
      boxShadow: {
        'green-glow': '0 0 20px rgba(173, 240, 199, 0.08)',
        'green-glow-lg': '0 0 40px rgba(173, 240, 199, 0.12)',
        'gold-glow': '0 0 20px rgba(255, 220, 74, 0.08)',
        'red-glow': '0 0 20px rgba(255, 77, 77, 0.08)',
      },
      animation: {
        'pulse-green': 'pulse-green 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'count-down': 'count-down 1s ease-out',
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(173, 240, 199, 0.1)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(173, 240, 199, 0.15)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'count-down': {
          '0%': { transform: 'scale(1.3)', opacity: '0.5' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
