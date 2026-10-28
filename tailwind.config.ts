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
        sans: ['Poppins', 'system-ui', '-apple-system', 'Segoe UI', 'Arial', 'sans-serif'],
        display: ['Poppins', 'system-ui', '-apple-system', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // Tokens oficiais da marca Koinon (Manual v1.0 herdado da A3ONE)
        koinon: {
          blue: '#0066FF', // Azul Koinon (botões primários, destaques, pontos)
          navy: '#002B5E', // Marinho Koinon (títulos, sidebar, ponto central)
          lightBlue: '#8EC0FF', // Azul claro (apoio sobre marinho)
          darkBluePoint: '#3D8BFF', // Azul para fundo escuro (pontos sobre marinho)
          gelo: '#F3F7FC', // Gelo (fundo geral de páginas, seções, cartões de apoio)
          cinzaTexto: '#5A6B82', // Cinza de texto (secundário, legendas, placeholders)
          // Aliases semânticos
          primary: '#0066FF',
          dark: '#002B5E',
          ice: '#F3F7FC',
          muted: '#5A6B82',
        },
        primary: {
          DEFAULT: '#0066FF', // Azul Koinon #0066FF
          foreground: '#FFFFFF', // Branco em botões primários
        },
        secondary: {
          DEFAULT: 'transparent',
          foreground: '#002B5E', // Marinho Koinon
        },
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F3F7FC', // Gelo
          foreground: '#5A6B82', // Cinza de texto
        },
        accent: {
          DEFAULT: '#0066FF', // Azul Koinon
          foreground: '#FFFFFF',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#002B5E',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#002B5E',
        },
        sidebar: {
          DEFAULT: '#002B5E', // Marinho Koinon
          foreground: '#8EC0FF', // Azul claro
          primary: '#0066FF', // Azul Koinon
          'primary-foreground': '#FFFFFF',
          accent: 'rgba(255, 255, 255, 0.12)',
          'accent-foreground': '#FFFFFF',
          border: 'rgba(255, 255, 255, 0.12)',
          ring: '#0066FF',
        },
        chart: {
          1: '#0066FF', // Azul Koinon
          2: '#3D8BFF', // Azul apoio
          3: '#002B5E', // Marinho Koinon
          4: '#5A6B82', // Cinza de texto
          5: '#8EC0FF', // Azul claro
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
        koinon: '0 4px 24px rgba(0, 43, 94, 0.08)',
        subtle: '0 4px 24px rgba(0, 43, 94, 0.08)',
        elevation: '0 4px 24px rgba(0, 43, 94, 0.08)',
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.42, 0, 0.58, 1)',
      },
    },
  },
  plugins: [animatePlugin, typographyPlugin, aspectRatioPlugin],
} satisfies Config
