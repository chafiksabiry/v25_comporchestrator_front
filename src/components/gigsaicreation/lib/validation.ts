import { GigData } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string[] };
  warnings: { [key: string]: string[] };
}

export function validateGigData(data: GigData): ValidationResult {
  const errors: { [key: string]: string[] } = {};
  const warnings: { [key: string]: string[] } = {};

  // Only title is required — everything else is optional / skippable.
  if (!data.title?.trim()) {
    errors.title = ['Title is required'];
  }

  if (data.title && data.title.trim().length > 0 && data.title.trim().length < 3) {
    warnings.basic = [...(warnings.basic || []), 'Consider a slightly longer title'];
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}
