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

  const companyName = localStorage.getItem('companyName');
  const userType = localStorage.getItem('userType') === 'company' || localStorage.getItem('role') === 'company' ? 'company' : 'rep';
  const companyId = localStorage.getItem('companyId');

  const [companyStats, setCompanyStats] = useState({
    gigs: 0,
    calls: 0,
    gigsEnrolled: 0,
    activeLeads: 0
  });

  useEffect(() => {
    if (userType === 'company' && companyId) {
      const fetchRealStats = async () => {
        try {
          // 1. Fetch Gigs
          const gigsResponse = await fetch(`${import.meta.env.VITE_API_URL_GIGS || 'http://localhost:5012/api'}/gigs/company/${companyId}`);
          const gigsData = await gigsResponse.json();
          const gigsCount = Array.isArray(gigsData.data) ? gigsData.data.length : 0;

          // 2. Fetch Leads (Total Leads for the company)
          const leadsResponse = await fetch(`${import.meta.env.VITE_COMPANY_API_URL}/leads`);
          const leadsData = await leadsResponse.json();
          const leadsCount = Array.isArray(leadsData.data) ? leadsData.data.length : 0;

          // 3. Fetch Calls
          const callsResponse = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/api/calls`);
          const callsData = await callsResponse.json();
          const callsCount = Array.isArray(callsData) ? callsData.length : 0;

          // 4. Fetch Enrolled Gigs (Mock for now or use a matching service endpoint if available)
          // For now we'll use a placeholder or derived value
          
          setCompanyStats({
            gigs: gigsCount,
            calls: callsCount,
            gigsEnrolled: Math.min(gigsCount, 12), // Fallback logic or real enrollment check
            activeLeads: leadsCount
          });
        } catch (error) {
          console.error('Error fetching real stats:', error);
        }
      };

      fetchRealStats();
    }
  }, [userType, companyId]);

  // Mock training stats for the dashboard overview (for reps)
  const trainingStats = {
    completed: 12,
    inProgress: 5,
    pending: 3,
    totalModules: 20,
    overallProgress: 65
  };

  return (
    <div className="p-8">
      <PremiumDashboard 
        profile={profileData} 
        companyName={companyName} 
        userType={userType}
        trainingStats={trainingStats} 
        companyStats={companyStats}
      />
    </div>
  );
}
