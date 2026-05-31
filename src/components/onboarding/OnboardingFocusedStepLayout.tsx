import React from "react";
import { OnboardingNextStepButton } from "./OnboardingNextStepButton";

interface Props {
  children: React.ReactNode;
  /** When false, only children are rendered (e.g. onboarding phase overview). */
  showNextStep?: boolean;
  onNextStep?: () => void;
  nextStepDisabled?: boolean;
  nextStepDisabledHint?: string;
}

/**
 * Wraps a focused onboarding step with bottom padding and a sticky
 * "Next step" CTA that stays visible while scrolling.
 */
export function OnboardingFocusedStepLayout({
  children,
  showNextStep = true,
  onNextStep,
  nextStepDisabled = false,
  nextStepDisabledHint,
}: Props) {
  if (!showNextStep || !onNextStep) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-full pb-28">
      {children}
      <div
        className="pointer-events-none sticky bottom-6 z-50 mt-8 flex justify-end px-2 sm:px-4"
        aria-live="polite"
      >
        <div className="pointer-events-auto">
          <OnboardingNextStepButton
            onClick={onNextStep}
            disabled={nextStepDisabled}
            disabledHint={nextStepDisabledHint}
          />
        </div>
      </div>
    </div>
  );
}
