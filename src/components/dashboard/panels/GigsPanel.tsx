import React, { useState } from "react";
import PrompAI from "../../gigsaicreation/components/PrompAI";
import GigDetails from "../../onboarding/GigDetails";
import {
  getPostCreateGigRoute,
  rememberCreatedGigId,
} from "../../../services/gigSetupSync";

export default function GigsPanel() {
  const [showGigCreation, setShowGigCreation] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const handleBackFromCreation = () => {
    setShowGigCreation(false);
    setListRefreshKey((k) => k + 1);
  };

  const handlePublishSuccess = (gigId?: string) => {
    const id =
      gigId ||
      (typeof localStorage !== 'undefined'
        ? localStorage.getItem('selectedGigId') || localStorage.getItem('gigId')
        : null) ||
      '';
    if (id) rememberCreatedGigId(id);
    // Always continue funnel (telephony) — never dump back on the gigs list.
    window.location.hash = id
      ? `#${getPostCreateGigRoute(id)}`
      : '#/dashboard/telephony?action=buy';
  };

  if (showGigCreation) {
    return (
      <div className="w-full">
        <PrompAI
          onBackToGigs={handleBackFromCreation}
          onBack={handleBackFromCreation}
          onBackToOnboarding={handleBackFromCreation}
          onPublishSuccess={handlePublishSuccess}
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
