/**
 * Landing page dark-theme color tokens.
 * Marketing-specific colors not covered by antd's light theme.
 * Use theme.useToken() for spacing/sizing — only use these for colors.
 */
export const LANDING_TOKENS = {
  bg: {
    dark: '#050f0d',
    darkAlt: '#0a1f1a',
    darkMid: '#0f2d26',
    darkDeep: '#082b26',
    darkEnd: '#04110e',
    code: '#0d1117',
    codeAlt: '#161b22',
    card: '#1e1b4b',
    cardAlt: '#312e81',
    white: '#ffffff',
  },
  text: {
    primary: '#e6edf3',
    secondary: 'rgba(255,255,255,0.75)',
    muted: 'rgba(255,255,255,0.45)',
    faint: 'rgba(255,255,255,0.35)',
    dim: 'rgba(255,255,255,0.3)',
  },
  accent: {
    teal: '#5eead4',
    tealDark: '#14b8a6',
    green: '#3fb950',
    red: '#f85149',
    yellow: '#f59e0b',
    gold: '#facc15',
    purple: '#a78bfa',
    purpleDark: '#7c3aed',
  },
  severity: {
    critical: '#f85149',
    criticalBg: 'rgba(248,81,73,0.12)',
    high: '#e3b341',
    highBg: 'rgba(227,179,65,0.12)',
    medium: '#58a6ff',
    mediumBg: 'rgba(88,166,255,0.12)',
    low: '#3fb950',
    lowBg: 'rgba(63,185,80,0.12)',
  },
  trafficLight: {
    red: '#ff5f57',
    yellow: '#febc2e',
    green: '#28c840',
  },
} as const;
