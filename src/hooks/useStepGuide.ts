const storageKey = (stepId: number) => `stepGuideSeen_${stepId}`;

export function hasSeenStepGuide(stepId: number): boolean {
  return localStorage.getItem(storageKey(stepId)) === 'true';
}

export function markStepGuideSeen(stepId: number): void {
  localStorage.setItem(storageKey(stepId), 'true');
}
