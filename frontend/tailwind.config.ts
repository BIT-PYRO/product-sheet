import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      fontSize: {
        /* Enforce UI Guidelines minimum 14px */
        xs: ['0.875rem', { lineHeight: '1.5' }],   /* 14px — upgraded from 12px */
        sm: ['0.875rem', { lineHeight: '1.5' }],   /* 14px helper text */
        base: ['1rem', { lineHeight: '1.5' }],     /* 16px body / labels */
        lg: ['1.125rem', { lineHeight: '1.4' }],   /* 18px card titles */
        xl: ['1.25rem', { lineHeight: '1.4' }],    /* 20px */
        '2xl': ['1.5rem', { lineHeight: '1.35' }], /* 24px section headings */
        '3xl': ['1.875rem', { lineHeight: '1.3' }],/* 30px page titles */
        '4xl': ['2rem', { lineHeight: '1.3' }],    /* 32px large titles */
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        /* ── UI Guidelines semantic tokens ── */
        'midnight-ink': 'hsl(var(--color-midnight-ink))',
        'slate-text': 'hsl(var(--color-slate-text))',
        'cool-gray': 'hsl(var(--color-cool-gray))',
        'cloud-gray': 'hsl(var(--color-cloud-gray))',
        'soft-border': 'hsl(var(--color-soft-border))',
        'trust-blue': '#2563EB',
        'deep-blue': '#1D4ED8',
        'sky-info': '#0EA5E9',
        'success': '#16A34A',
        'success-dark': '#166534',
        'warning': '#D97706',
        'warning-soft': '#FEF3C7',
        'danger': '#DC2626',
        'danger-dark': '#B91C1C',
        'danger-soft': '#FEE2E2',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      minHeight: {
        'touch': '44px', /* UI Guidelines min interactive height */
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
