/** Sync REP onboarding UI (next-step visibility) between training builder and shell. */
export const REP_ONBOARDING_STATE_EVENT = 'repOnboardingState';

export type RepOnboardingStateDetail = {
  realTrainingsCount?: number;
  inBuilder?: boolean;
  planValidated?: boolean;
};

export function mergeRepOnboardingState(
  prev: Required<RepOnboardingStateDetail>,
  detail: RepOnboardingStateDetail
): Required<RepOnboardingStateDetail> {
  return {
    realTrainingsCount:
      detail.realTrainingsCount !== undefined
        ? Number(detail.realTrainingsCount) || 0
        : prev.realTrainingsCount,
    inBuilder:
      detail.inBuilder !== undefined ? Boolean(detail.inBuilder) : prev.inBuilder,
    planValidated:
      detail.planValidated !== undefined
        ? Boolean(detail.planValidated)
        : prev.planValidated,
  };
}
