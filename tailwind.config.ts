/* Tailwind config for the frontend react app. This is where the app theme should be defined: https://v2.tailwindcss.com/docs/configuration. */
import type { Config } from 'tailwindcss'
import animatePlugin from 'tailwindcss-animate'
import typographyPlugin from '@tailwindcss/typography'
import aspectRatioPlugin from '@tailwindcss/aspect-ratio'

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Sora', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Sora', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // Tokens oficiais da marca Koinon "Pedra e Tinta"
        koinon: {
          ink: '#1C2331',
          aegean: '#216E75',
          salvia: '#7D8F72',
          marmore: '#F2F1ED',
          pedra: '#D9D4C8',
          grafite: '#626A76',
          guia: '#D1CFCD',
        },
        primary: {
          DEFAULT: '#216E75', // Aegean
          foreground: '#FFFFFF', // Branco em botões primários
        },
        secondary: {
          DEFAULT: 'transparent',
          foreground: '#1C2331',
        },
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F2F1ED', // Mármore
          foreground: '#626A76', // Grafite
        },
        accent: {
          DEFAULT: '#216E75',
          foreground: '#FFFFFF',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#1C2331',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1C2331',
        },
        sidebar: {
          DEFAULT: '#1C2331', // Koinon Ink
          foreground: '#F2F1ED',
          primary: '#216E75',
          'primary-foreground': '#FFFFFF',
          accent: '#263042',
          'accent-foreground': '#FFFFFF',
          border: '#2C364A',
          ring: '#216E75',
        },
        chart: {
          1: '#216E75', // Aegean
          2: '#7D8F72', // Sálvia
          3: '#1C2331', // Ink
          4: '#626A76', // Grafite
          5: '#D9D4C8', // Pedra
        },
      },
      borderRadius: {
        card: '14px',
        modal: '14px',
        btn: '10px',
        field: '10px',
        badge: '8px',
        lg: '14px',
        md: '10px',
        sm: '8px',
      },
      transitionProperty: {
        width: 'width',
        height: 'height',
      },
      boxShadow: {
        koinon: '0 4px 24px rgba(28, 35, 49, 0.08)',
        subtle: '0 4px 24px rgba(28, 35, 49, 0.08)',
        elevation: '0 4px 24px rgba(28, 35, 49, 0.08)',
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.42, 0, 0.58, 1)',
      },
    },
  },
  plugins: [animatePlugin, typographyPlugin, aspectRatioPlugin],
} satisfies Config
