import React, { useState, useEffect } from 'react';
import PremiumDashboard from '../../training/components/Dashboard/PremiumDashboard';
import { getActiveAgentsForCompany } from '../../../api/matching';
import Cookies from 'js-cookie';

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
  const companyId = Cookies.get('companyId');
  const userId = Cookies.get('userId');

  const [companyStats, setCompanyStats] = useState({
    gigs: 0,
    calls: 0,
    gigsEnrolled: 0,
    activeLeads: 0,
    agentsEnrolled: 0
  });

  useEffect(() => {
    if (userType === 'company' && companyId) {
      const fetchRealStats = async () => {
        try {
          // 1. Fetch Gigs
          const gigsApiUrl = import.meta.env.VITE_GIGS_API || import.meta.env.VITE_API_URL_GIGS || 'https://v25gigsmanualcreationbackend-production.up.railway.app/api';
          const gigsResponse = await fetch(`${gigsApiUrl}/gigs/company/${companyId}?populate=companyId`);
          const gigsData = await gigsResponse.json();
          const gigsCount = Array.isArray(gigsData.data) ? gigsData.data.length : 0;

          // 2. Fetch Leads (Total Leads for the company)
          const leadsResponse = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/leads/company/${companyId}/has-leads`);
          const leadsData = await leadsResponse.json();
          const leadsCount = leadsData.count || 0;

          // 3. Fetch Calls
          const callsApiUrl = import.meta.env.VITE_API_URL_CALL || import.meta.env.VITE_DASHBOARD_API;
          const callsResponse = await fetch(`${callsApiUrl}/api/calls?userId=${userId}`);
          const callsData = await callsResponse.json();
          const callsCount = Array.isArray(callsData) ? callsData.length : (Array.isArray(callsData.data) ? callsData.data.length : 0);
          
          // 4. Fetch Active Agents Enrolled
          const agentsData = await getActiveAgentsForCompany(companyId);
          const agentsCount = Array.isArray(agentsData) ? agentsData.length : 0;

          setCompanyStats({
            gigs: gigsCount,
            calls: callsCount,
            gigsEnrolled: agentsCount > 0 ? 1 : 0, // A gig is "enrolled" if it has active agents
            activeLeads: leadsCount,
            agentsEnrolled: agentsCount
          });
        } catch (error) {
          console.error('Error fetching real stats:', error);
        }
      };

      fetchRealStats();
    }
  }, [userType, companyId, userId]);

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
