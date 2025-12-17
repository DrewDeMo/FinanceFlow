import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-subtle': 'linear-gradient(to bottom right, var(--tw-gradient-stops))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
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
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
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
      },
      keyframes: {
        // Existing animations
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
        // New modern animations for micro-interactions
        'fade-in': {
          from: {
            opacity: '0',
          },
          to: {
            opacity: '1',
          },
        },
        'fade-out': {
          from: {
            opacity: '1',
          },
          to: {
            opacity: '0',
          },
        },
        'slide-up': {
          from: {
            transform: 'translateY(10px)',
            opacity: '0',
          },
          to: {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        'slide-down': {
          from: {
            transform: 'translateY(-10px)',
            opacity: '0',
          },
          to: {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        'slide-left': {
          from: {
            transform: 'translateX(10px)',
            opacity: '0',
          },
          to: {
            transform: 'translateX(0)',
            opacity: '1',
          },
        },
        'slide-right': {
          from: {
            transform: 'translateX(-10px)',
            opacity: '0',
          },
          to: {
            transform: 'translateX(0)',
            opacity: '1',
          },
        },
        'scale-in': {
          from: {
            transform: 'scale(0.95)',
            opacity: '0',
          },
          to: {
            transform: 'scale(1)',
            opacity: '1',
          },
        },
        'scale-out': {
          from: {
            transform: 'scale(1)',
            opacity: '1',
          },
          to: {
            transform: 'scale(0.95)',
            opacity: '0',
          },
        },
        glow: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(124, 58, 237, 0.5)',
          },
        },
        'glow-blue': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(37, 99, 235, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(37, 99, 235, 0.5)',
          },
        },
        shimmer: {
          '0%': {
            backgroundPosition: '-1000px 0',
          },
          '100%': {
            backgroundPosition: '1000px 0',
          },
        },
        pulse: {
          '0%, 100%': {
            opacity: '1',
          },
          '50%': {
            opacity: '0.8',
          },
        },
        bounce: {
          '0%, 100%': {
            transform: 'translateY(0)',
          },
          '50%': {
            transform: 'translateY(-5px)',
          },
        },
      },
      animation: {
        // Existing animations
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        // New modern animations
        'fade-in': 'fade-in 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-out': 'fade-out 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down': 'slide-down 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-left': 'slide-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-right': 'slide-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-out': 'scale-out 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'glow': 'glow 2s ease-in-out infinite',
        'glow-blue': 'glow-blue 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce': 'bounce 1s ease-in-out infinite',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '250': '250ms',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
