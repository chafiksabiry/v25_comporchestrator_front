export const TIME_RANGES = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year'
} as const;

export const STATUS_TYPES = {
  ACTIVE: 'active',
  PENDING: 'pending',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
} as const;

export const PRIORITY_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const;

export const API_ENDPOINTS = {
  DASHBOARD: '/dashboard',
  GIGS: '/gigs',
  AGENTS: '/agents',
  CALLS: '/calls',
  ANALYTICS: '/analytics'
} as const;
