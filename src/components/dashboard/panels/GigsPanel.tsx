import React, { useState } from "react";
import PrompAI from "../../gigsaicreation/components/PrompAI";
import GigDetails from "../../onboarding/GigDetails";

export default function GigsPanel() {
  const [showGigCreation, setShowGigCreation] = useState(false);

  if (showGigCreation) {
    return (
      <div className="w-full h-full pb-10">
        <PrompAI
          onBackToGigs={() => setShowGigCreation(false)}
          onBack={() => setShowGigCreation(false)}
          onBackToOnboarding={() => setShowGigCreation(false)}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full pb-10">
      <GigDetails
        onAddNew={() => setShowGigCreation(true)}
      />
    </div>
  );
}
