import React, { useState } from 'react';
import { TrainingWelcome } from './TrainingWelcome';
import { TrainingCreationSelector } from './TrainingCreationSelector';
import { ManualTrainingBuilder } from '../ManualTraining';
import JourneyBuilder from '../JourneyBuilder/JourneyBuilder'; // Import par défaut

type ViewMode = 'welcome' | 'selector' | 'ai' | 'manual';

interface TrainingHubProps {
  companyId: string;
  onBack?: () => void;
  showWelcome?: boolean; // Option pour afficher ou non la page d'accueil
}

export const TrainingHub: React.FC<TrainingHubProps> = ({
  companyId,
  onBack,
  showWelcome = false, // Par défaut, on affiche le sélecteur directement
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(showWelcome ? 'welcome' : 'selector');

  const handleStartJourney = () => {
    setViewMode('selector');
  };

  const handleSelectMode = (mode: 'ai' | 'manual') => {
    setViewMode(mode);
  };

  const handleBackToSelector = () => {
    setViewMode('selector');
  };

  const handleBackToWelcome = () => {
    setViewMode('welcome');
  };

  // Page d'accueil
  if (viewMode === 'welcome') {
    return (
      <TrainingWelcome
        onStartJourney={handleStartJourney}
        onExplore={onBack}
      />
    );
  }

  // Sélecteur de mode
  if (viewMode === 'selector') {
    return (
      <TrainingCreationSelector
        companyId={companyId}
        onSelectMode={handleSelectMode}
      />
    );
  }

  // Mode IA
  if (viewMode === 'ai') {
    return (
      <JourneyBuilder
        onComplete={(journey, modules, enrolledReps) => {
          // Retour au sélecteur après création
          if (onBack) {
            onBack();
          } else {
            handleBackToSelector();
          }
        }}
      />
    );
  }

  // Mode Manuel
  if (viewMode === 'manual') {
    return (
      <ManualTrainingBuilder
        companyId={companyId}
        onBack={onBack || handleBackToSelector}
      />
    );
  }

  return null;
};

