// Task Status Constants
export const TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

// Task Priority Constants
export const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
} as const;

export type TaskPriority = typeof TASK_PRIORITY[keyof typeof TASK_PRIORITY];

// User Role Constants
export const USER_ROLE = {
  USER: 'USER',
  ADMIN: 'ADMIN'
} as const;

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

// Filter Options
export const FILTER_OPTIONS = {
  STATUS: {
    ALL: 'ALL',
    ...TASK_STATUS
  },
  PRIORITY: {
    ALL: 'ALL',
    ...TASK_PRIORITY
  }
} as const;

// Status Display Names
export const STATUS_DISPLAY_NAMES = {
  [TASK_STATUS.PENDING]: 'Pending',
  [TASK_STATUS.IN_PROGRESS]: 'In Progress',
  [TASK_STATUS.COMPLETED]: 'Completed'
} as const;

// Priority Display Names
export const PRIORITY_DISPLAY_NAMES = {
  [TASK_PRIORITY.LOW]: 'Low',
  [TASK_PRIORITY.MEDIUM]: 'Medium',
  [TASK_PRIORITY.HIGH]: 'High'
} as const;

// Validation Messages
export const VALIDATION_MESSAGES = {
  TASK_STATUS: `Status must be ${Object.values(TASK_STATUS).join(', ')}`,
  TASK_PRIORITY: `Priority must be ${Object.values(TASK_PRIORITY).join(', ')}`,
  USER_ROLE: `Role must be ${Object.values(USER_ROLE).join(', ')}`
} as const;
