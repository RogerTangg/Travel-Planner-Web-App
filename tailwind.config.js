/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./stores/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx,css}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sakura: {
          50: '#FFF5F7',
          100: '#FFF0F5',
          200: '#FFE0EB',
          300: '#FFB7C5',
          400: '#FF9FB4',
          500: '#FF8FAB',
          600: '#E67A96',
          700: '#CC6681',
          // 深色模式對應
          dark: {
            100: '#3D2A35',
            300: '#5C3D4F',
            500: '#8C4D6E'
          }
        },
        warm: {
          50: '#FAFAFA',
          100: '#F5F5F0',
          200: '#EBEBEB',
          700: '#555555',
          800: '#333333',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans TC', 'sans-serif'],
      },
      // 響應式斷點 (Responsive Breakpoints)
      screens: {
        'xs': '375px',     // 小型手機
        'sm': '640px',     // 大型手機
        'md': '768px',     // 平板直向
        'lg': '1024px',    // 平板橫向 / 小筆電
        'xl': '1280px',    // 桌面
        '2xl': '1536px',   // 大螢幕
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'bounce-in': 'bounce-in 0.4s ease-out',
      },
      keyframes: {
        'slide-in': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      // 安全區域支援
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0)',
        'safe-top': 'env(safe-area-inset-top, 0)',
      }
    }
  },
  plugins: [],
}
