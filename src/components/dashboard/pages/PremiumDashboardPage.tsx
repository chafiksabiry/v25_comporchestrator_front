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

  const [callsData, setCallsData] = useState<any[]>([]);

  useEffect(() => {
    if (userType === 'company' && companyId) {
      const fetchRealStats = async () => {
        const stats = {
          gigs: 0,
          calls: 0,
          gigsEnrolled: 0,
          activeLeads: 0,
          agentsEnrolled: 0
        };

        try {
          // 1. Fetch Gigs
          try {
            const gigsApiUrl = import.meta.env.VITE_GIGS_API || import.meta.env.VITE_API_URL_GIGS || 'https://v25gigsmanualcreationbackend-production.up.railway.app/api';
            const gigsResponse = await fetch(`${gigsApiUrl}/gigs/company/${companyId}?populate=companyId`);
            if (gigsResponse.ok) {
              const gigsData = await gigsResponse.json();
              stats.gigs = Array.isArray(gigsData.data) ? gigsData.data.length : 0;
            }
          } catch (e) { console.error('Error fetching gigs:', e); }

          // 2. Fetch Leads
          try {
            const leadsResponse = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/leads/company/${companyId}/has-leads`);
            if (leadsResponse.ok) {
              const leadsData = await leadsResponse.json();
              stats.activeLeads = leadsData.count || 0;
            }
          } catch (e) { console.error('Error fetching leads:', e); }

          // 3. Fetch Calls
          try {
            const callsApiUrl = import.meta.env.VITE_API_URL_CALL || import.meta.env.VITE_DASHBOARD_API;
            // Fix double /api if present
            const callsBase = callsApiUrl.endsWith('/api') ? callsApiUrl : `${callsApiUrl}/api`;
            const callsResponse = await fetch(`${callsBase}/calls?userId=${userId}`);
            if (callsResponse.ok) {
              const callsData = await callsResponse.json();
              const callsArray = Array.isArray(callsData) ? callsData : (Array.isArray(callsData.data) ? callsData.data : []);
              stats.calls = callsArray.length;
              setCallsData(callsArray);
            }
          } catch (e) { console.error('Error fetching calls:', e); }
          
          // 4. Fetch Active Agents
          try {
            const agentsData = await getActiveAgentsForCompany(companyId);
            stats.agentsEnrolled = Array.isArray(agentsData) ? agentsData.length : 0;
            stats.gigsEnrolled = stats.agentsEnrolled > 0 ? 1 : 0;
          } catch (e) { console.error('Error fetching agents:', e); }

          setCompanyStats(stats);
        } catch (error) {
          console.error('Error in fetchRealStats:', error);
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
        callsData={callsData}
      />
    </div>
  );
}
