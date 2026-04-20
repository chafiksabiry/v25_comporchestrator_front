import React from 'react';
import { TrainingHub } from './components/Training';

/**
 * Composant de test pour le sélecteur de création de formation
 * 
 * Utilisation :
 * 1. Importez ce composant dans App.tsx
 * 2. Le sélecteur s'affichera automatiquement
 * 3. Choisissez entre IA ou Manuel
 * 4. La vue correspondante s'affiche
 */
export const TestTrainingSelector: React.FC = () => {
  return (
    <TrainingHub 
      companyId="test-company-123"
      onBack={() => {
        
        // Vous pouvez rediriger vers une autre page ici
        // window.location.href = '/';
      }}
    />
  );
};

