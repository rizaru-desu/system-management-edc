import '@/global.css';

export const Colors = {
  light: {
    bg: '#F6F7F9',
    surf: 'rgba(255, 255, 255, 0.9)',
    bd: 'rgba(14, 39, 72, 0.14)',
    tx: '#0E2748',
    tx2: '#42536E',
    tx3: '#8593A8',
    pri: '#3F6FA8',
    pri2: '#345D8D',
    navy: '#0E2748',
    navbg: 'rgba(255, 255, 255, 0.85)',
    track: 'rgba(14, 39, 72, 0.09)',
    // Backwards compatibility keys
    text: '#0E2748',
    background: '#F6F7F9',
    backgroundElement: 'rgba(255, 255, 255, 0.9)',
    backgroundSelected: 'rgba(63, 111, 168, 0.15)',
    textSecondary: '#42536E',
  },
  dark: {
    bg: '#081226',
    surf: 'rgba(14, 29, 56, 0.92)',
    bd: 'rgba(148, 178, 220, 0.14)',
    tx: '#E8EEF7',
    tx2: '#A9BAD3',
    tx3: '#6E82A3',
    pri: '#6E9BD4',
    pri2: '#5C8CC4',
    navy: '#1B3A63',
    navbg: 'rgba(8, 18, 38, 0.9)',
    track: 'rgba(148, 178, 220, 0.15)',
    // Backwards compatibility keys
    text: '#E8EEF7',
    background: '#081226',
    backgroundElement: 'rgba(14, 29, 56, 0.92)',
    backgroundSelected: 'rgba(110, 155, 212, 0.15)',
    textSecondary: '#A9BAD3',
  },
} as const;

export const StatusColors = {
  Pending: { c: '#3B82F6', bg: 'rgba(59, 130, 246, 0.13)' },
  'On Progress': { c: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  In_Progress: { c: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  Completed: { c: '#22C55E', bg: 'rgba(34, 197, 94, 0.14)' },
  Rejected: { c: '#EF4444', bg: 'rgba(239, 68, 68, 0.13)' },
  Cancelled: { c: '#64748B', bg: 'rgba(100, 116, 139, 0.15)' },
  Waiting: { c: '#3B82F6', bg: 'rgba(59, 130, 246, 0.13)' },
} as const;

export const PriorityColors = {
  High: { c: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  Medium: { c: '#F59E0B', bg: 'rgba(245, 158, 11, 0.14)' },
  Low: { c: '#64748B', bg: 'rgba(100, 116, 139, 0.14)' },
} as const;

export const TaskTypeMap: Record<string, { g: string; c: string; bg: string }> = {
  Installation: { g: 'IN', c: '#3F6FA8', bg: 'rgba(63, 111, 168, 0.12)' },
  Reinit: { g: 'RE', c: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  Rollout: { g: 'RO', c: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.12)' },
  'Technical Support': { g: 'TS', c: '#F59E0B', bg: 'rgba(245, 158, 11, 0.14)' },
  Standby: { g: 'SB', c: '#64748B', bg: 'rgba(100, 116, 139, 0.14)' },
  'Preventive Maintenance': { g: 'PM', c: '#22C55E', bg: 'rgba(34, 197, 94, 0.14)' },
};

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  sans: 'Manrope',
  serif: 'serif',
  rounded: 'normal',
  mono: 'monospace',
};

export const Spacing = {
  half: 2,
  one: 4,
  six: 6,
  two: 8,
  ten: 10,
  twelve: 12,
  fourteen: 14,
  three: 16,
  eighteen: 18,
  twenty: 20,
  four: 24,
  twentyEight: 28,
  five: 32,
  fortyFour: 44,
  fortyEight: 48,
  sixtyFour: 64,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 14,
  card: 16,
  pill: 9999,
} as const;

export const BottomTabInset = 80;
export const MaxContentWidth = 800;
