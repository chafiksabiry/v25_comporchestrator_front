import React from 'react';
import App from '../App';

/**
 * Rep Dashboard Page
 * This component wraps the main App component and ensures it renders in rep/trainee mode
 * The App component now handles routing internally and reads journey ID from URL via useParams
 */
export default function RepDashboard() {
  // App component handles routing internally and reads journey ID from URL directly
  return <App />;
}

