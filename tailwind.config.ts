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
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // Tokens oficiais da marca Indaba
        indaba: {
          deep: '#1E1B18',
          ocre: '#E39A2B',
          terracota: '#C75B39',
          areia: '#F4EFE7',
          papel: '#FFFDFA',
          grafite: '#6B6259',
          borda: '#E8E1D6',
        },
        primary: {
          DEFAULT: '#E39A2B', // Ocre
          foreground: '#1E1B18', // Indaba Deep (contraste obrigatório)
        },
        secondary: {
          DEFAULT: 'transparent',
          foreground: '#1E1B18',
        },
        destructive: {
          DEFAULT: '#C75B39', // Terracota
          foreground: '#FFFDFA',
        },
        muted: {
          DEFAULT: '#F4EFE7',
          foreground: '#6B6259',
        },
        accent: {
          DEFAULT: '#E39A2B',
          foreground: '#1E1B18',
        },
        popover: {
          DEFAULT: '#FFFDFA',
          foreground: '#1E1B18',
        },
        card: {
          DEFAULT: '#FFFDFA',
          foreground: '#1E1B18',
        },
        sidebar: {
          DEFAULT: '#1E1B18',
          foreground: '#E8E1D6',
          primary: '#E39A2B',
          'primary-foreground': '#1E1B18',
          accent: '#2A2622',
          'accent-foreground': '#FFFDFA',
          border: '#2E2A26',
          ring: '#E39A2B',
        },
        chart: {
          1: '#E39A2B',
          2: '#1E1B18',
          3: '#C75B39',
          4: '#6B6259',
          5: '#E8E1D6',
        },
      },
      borderRadius: {
        card: '12px',
        modal: '12px',
        btn: '10px',
        field: '10px',
        badge: '8px',
        lg: '12px',
        md: '10px',
        sm: '8px',
      },
      transitionProperty: {
        width: 'width',
        height: 'height',
      },
      boxShadow: {
        indaba: '0 4px 24px rgba(30, 27, 24, 0.06)',
        subtle: '0 4px 24px rgba(30, 27, 24, 0.06)',
        elevation: '0 4px 24px rgba(30, 27, 24, 0.06)',
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.42, 0, 0.58, 1)',
      },
    },
  },
  plugins: [animatePlugin, typographyPlugin, aspectRatioPlugin],
} satisfies Config
