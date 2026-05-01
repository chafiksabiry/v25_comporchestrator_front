import React, { useState, useEffect } from 'react';
import PremiumDashboard from '../../training/components/Dashboard/PremiumDashboard';

export default function PremiumDashboardPage() {
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('profileData');
      if (stored) {
        setProfileData(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load profile data', e);
    }
  }, []);

  // Mock training stats for the dashboard overview
  const trainingStats = {
    completed: 12,
    inProgress: 5,
    pending: 3,
    totalModules: 20,
    overallProgress: 65
  };

  return (
    <div className="p-8">
      <PremiumDashboard profile={profileData} trainingStats={trainingStats} />
    </div>
  );
}
