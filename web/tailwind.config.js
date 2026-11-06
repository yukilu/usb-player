/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 浅色主题：ink 为纸白/浅灰表面，mist 为深灰文字（与深色版数值相反，组件类名无需改动）
        ink: {
          950: '#f6f7f9',
          900: '#ffffff',
          850: '#ffffff',
          800: '#f2f4f8',
          700: '#e6eaf1',
          600: '#d8dee8',
        },
        brand: {
          300: '#ffd3a3',
          400: '#ffb267',
          500: '#ff8a45',
          600: '#ef6a2b',
          700: '#b9531a',
        },
        mist: {
          100: '#1b2432',
          200: '#3a4555',
          300: '#586477',
          400: '#748196',
          500: '#8793a6',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'PingFang SC', 'Microsoft YaHei', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: '0 10px 30px -12px rgba(244, 128, 47, 0.35)',
        card: '0 8px 24px -12px rgba(24, 36, 56, 0.18)',
        panel: '0 24px 60px -24px rgba(24, 36, 56, 0.22)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s cubic-bezier(.2,.8,.2,1) both',
        'fade-in': 'fade-in .25s ease-out both',
        shimmer: 'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
};
