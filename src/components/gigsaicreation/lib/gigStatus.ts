// Gig status constants
export const GIG_STATUS = {
  TO_ACTIVATE: 'to_activate',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived'
} as const;

export type GigStatus = typeof GIG_STATUS[keyof typeof GIG_STATUS];

// Status display labels in English
export const GIG_STATUS_LABELS: Record<GigStatus, string> = {
  [GIG_STATUS.TO_ACTIVATE]: 'To Activate',
  [GIG_STATUS.ACTIVE]: 'Active',
  [GIG_STATUS.INACTIVE]: 'Inactive',
  [GIG_STATUS.ARCHIVED]: 'Archived'
};

// Status display labels in French
export const GIG_STATUS_LABELS_FR: Record<GigStatus, string> = {
  [GIG_STATUS.TO_ACTIVATE]: 'À activer',
  [GIG_STATUS.ACTIVE]: 'Actif',
  [GIG_STATUS.INACTIVE]: 'Inactif',
  [GIG_STATUS.ARCHIVED]: 'Archivé'
};

// Status colors for UI
export const GIG_STATUS_COLORS: Record<GigStatus, string> = {
  [GIG_STATUS.TO_ACTIVATE]: 'bg-yellow-100 text-yellow-800',
  [GIG_STATUS.ACTIVE]: 'bg-harx-100 text-harx-800',
  [GIG_STATUS.INACTIVE]: 'bg-gray-100 text-gray-800',
  [GIG_STATUS.ARCHIVED]: 'bg-red-100 text-red-800'
};

// Helper function to get status label
export const getStatusLabel = (status: GigStatus, language: 'en' | 'fr' = 'en'): string => {
  return language === 'fr' ? GIG_STATUS_LABELS_FR[status] : GIG_STATUS_LABELS[status];
};

// Helper function to get status color classes
export const getStatusColor = (status: GigStatus): string => {
  return GIG_STATUS_COLORS[status];
};

// Helper function to check if status is active
export const isActiveStatus = (status: GigStatus): boolean => {
  return status === GIG_STATUS.ACTIVE;
};

// Helper function to check if status allows editing
export const canEditStatus = (status: GigStatus): boolean => {
  return status !== GIG_STATUS.ARCHIVED;
}; 