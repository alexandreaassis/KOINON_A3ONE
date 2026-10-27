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
        // Tokens oficiais da marca Koinon "Pedra e Azul"
        koinon: {
          navy: '#12314F',
          azure: '#1F6B94',
          verdigris: '#4E8B7E',
          marmore: '#F1F4F8',
          pedra: '#D5DCE5',
          grafite: '#5C6B7A',
          // Aliases para transição suave de código legado
          ink: '#12314F',
          aegean: '#1F6B94',
          salvia: '#4E8B7E',
          guia: '#D5DCE5',
        },
        primary: {
          DEFAULT: '#1F6B94', // Koinon Azure
          foreground: '#FFFFFF', // Branco em botões primários
        },
        secondary: {
          DEFAULT: 'transparent',
          foreground: '#12314F', // Koinon Navy
        },
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F1F4F8', // Mármore Azulado
          foreground: '#5C6B7A', // Grafite
        },
        accent: {
          DEFAULT: '#1F6B94', // Koinon Azure
          foreground: '#FFFFFF',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#12314F',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#12314F',
        },
        sidebar: {
          DEFAULT: '#12314F', // Koinon Navy
          foreground: '#D5DCE5', // Pedra
          primary: '#1F6B94', // Koinon Azure
          'primary-foreground': '#FFFFFF',
          accent: 'rgba(255, 255, 255, 0.12)',
          'accent-foreground': '#FFFFFF',
          border: 'rgba(213, 220, 229, 0.15)',
          ring: '#1F6B94',
        },
        chart: {
          1: '#1F6B94', // Koinon Azure
          2: '#4E8B7E', // Verdigris
          3: '#12314F', // Koinon Navy
          4: '#5C6B7A', // Grafite
          5: '#D5DCE5', // Pedra
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
        koinon: '0 4px 24px rgba(18, 49, 79, 0.08)',
        subtle: '0 4px 24px rgba(18, 49, 79, 0.08)',
        elevation: '0 4px 24px rgba(18, 49, 79, 0.08)',
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.42, 0, 0.58, 1)',
      },
    },
  },
  plugins: [animatePlugin, typographyPlugin, aspectRatioPlugin],
} satisfies Config
