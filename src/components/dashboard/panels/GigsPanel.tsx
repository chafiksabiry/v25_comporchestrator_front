import React, { useState } from "react";
import PrompAI from "../../gigsaicreation/components/PrompAI";
import GigDetails from "../../onboarding/GigDetails";

export default function GigsPanel() {
  const [showGigCreation, setShowGigCreation] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const handleBackFromCreation = () => {
    setShowGigCreation(false);
    setListRefreshKey((k) => k + 1);
  };

  if (showGigCreation) {
    return (
      <div className="w-full">
        <PrompAI
          onBackToGigs={handleBackFromCreation}
          onBack={handleBackFromCreation}
          onBackToOnboarding={handleBackFromCreation}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <GigDetails
        onAddNew={() => setShowGigCreation(true)}
        refreshKey={listRefreshKey}
      />
    </div>
  );
}
