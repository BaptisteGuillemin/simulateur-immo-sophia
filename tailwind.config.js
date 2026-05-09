/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#f6f8fc',
          surface: '#ffffff',
          elevated: '#ffffff',
          subtle: '#eef1f7',
        },
        border: {
          DEFAULT: '#d8dde7',
          subtle: '#e6eaf2',
        },
        text: {
          DEFAULT: '#0f1623',
          muted: '#525a6b',
          subtle: '#8a92a3',
        },
        accent: {
          DEFAULT: '#3b6fe0',
          hover: '#5183ee',
          glow: '#2a5cc7',
        },
        success: '#10b981',
        warning: '#d97706',
        danger: '#e11d48',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
