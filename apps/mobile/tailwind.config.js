/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--pri, #3F6FA8)',
          primaryDark: 'var(--pri2, #345D8D)',
          navy: 'var(--navy, #0E2748)',
        },
        fieldra: {
          bg: 'var(--bg, #F6F7F9)',
          surface: 'var(--surf, rgba(255, 255, 255, 0.9))',
          border: 'var(--bd, rgba(14, 39, 72, 0.14))',
          tx: 'var(--tx, #0E2748)',
          tx2: 'var(--tx2, #42536E)',
          tx3: 'var(--tx3, #8593A8)',
          navbg: 'var(--navbg, rgba(255, 255, 255, 0.85))',
          track: 'var(--track, rgba(14, 39, 72, 0.09))',
        },
        status: {
          success: '#22C55E',
          successBg: 'rgba(34, 197, 94, 0.14)',
          warning: '#F59E0B',
          warningBg: 'rgba(245, 158, 11, 0.15)',
          danger: '#EF4444',
          dangerBg: 'rgba(239, 68, 68, 0.13)',
          info: '#3B82F6',
          infoBg: 'rgba(59, 130, 246, 0.13)',
        },
        taskType: {
          installation: '#3F6FA8',
          reinit: '#8B5CF6',
          rollout: '#0EA5E9',
          support: '#F59E0B',
          standby: '#64748B',
          pm: '#22C55E',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        'card': '16px',
        'badge': '9999px',
        'button': '14px',
        'input': '14px',
      },
      boxShadow: {
        'card': '0 4px 14px rgba(14, 39, 72, 0.05)',
        'btn': '0 10px 22px rgba(63, 111, 168, 0.35)',
        'float': '0 24px 80px rgba(14, 39, 72, 0.25)',
      },
    },
  },
  plugins: [],
};
