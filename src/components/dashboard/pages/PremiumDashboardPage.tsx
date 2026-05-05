import React, { useState, useEffect } from 'react';
import PremiumDashboard from '../../training/components/Dashboard/PremiumDashboard';
import { getActiveAgentsForCompany } from '../../../api/matching';
import { CompanyPerformanceDashboard } from './CompanyPerformanceDashboard';
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
    agentsEnrolled: 0,
    conversionRate: 0
  });

  const [callsData, setCallsData] = useState<any[]>([]);
  const [gigsList, setGigsList] = useState<any[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [customDates, setCustomDates] = useState<{ start: string; end: string }>({ start: '', end: '' });

  useEffect(() => {
    if (userType === 'company' && companyId) {
      const fetchRealStats = async () => {
        const stats = {
          gigs: 0,
          calls: 0,
          gigsEnrolled: 0,
          activeLeads: 0,
          agentsEnrolled: 0,
          conversionRate: 0
        };


        try {
          // 1. Fetch Gigs
          try {
            const gigsApiUrl = import.meta.env.VITE_GIGS_API || import.meta.env.VITE_API_URL_GIGS || 'https://v25gigsmanualcreationbackend-production.up.railway.app/api';
            const gigsResponse = await fetch(`${gigsApiUrl}/gigs/company/${companyId}?populate=companyId`);
            if (gigsResponse.ok) {
              const gigsData = await gigsResponse.json();
              const list = Array.isArray(gigsData.data) ? gigsData.data : [];
              setGigsList(list);
              stats.gigs = list.length;
            }
          } catch (e) { console.error('Error fetching gigs:', e); }

          // 2. Fetch Leads
          try {
            let leadsUrl = `${import.meta.env.VITE_DASHBOARD_API}/leads/company/${companyId}/has-leads`;
            if (selectedGigId !== 'all') {
              leadsUrl = `${leadsUrl}?gigId=${selectedGigId}`;
            }
            const leadsResponse = await fetch(leadsUrl);
            if (leadsResponse.ok) {
              const leadsData = await leadsResponse.json();
              stats.activeLeads = leadsData.count || 0;
            }
          } catch (e) { console.error('Error fetching leads:', e); }

          // 3. Fetch Calls (with Server-Side Filtering)
          try {
            const callsApiUrl = import.meta.env.VITE_API_URL_CALL || import.meta.env.VITE_DASHBOARD_API;
            const callsBase = callsApiUrl.endsWith('/api') ? callsApiUrl : `${callsApiUrl}/api`;
            
            // A. Fetch GLOBAL stats for the cards (Total company calls)
            const globalResponse = await fetch(`${callsBase}/calls?companyId=${companyId}`);
            if (globalResponse.ok) {
              const globalData = await globalResponse.json();
              stats.calls = globalData.count || 0;
            }

            // B. Fetch FILTERED calls for the histogram
            const filterParams = new URLSearchParams();
            filterParams.append('companyId', companyId);
            filterParams.append('populate', 'lead');
            
            if (selectedGigId !== 'all') {
              filterParams.append('gigId', selectedGigId);
            }

            if (dateRange !== 'all') {
              const now = new Date();
              let startDate = new Date();
              if (dateRange === 'today') startDate.setHours(0, 0, 0, 0);
              else if (dateRange === 'last_week') startDate.setDate(now.getDate() - 7);
              else if (dateRange === 'last_month') startDate.setMonth(now.getMonth() - 1);
              else if (dateRange === 'last_3_months') startDate.setMonth(now.getMonth() - 3);
              else if (dateRange === 'last_year') startDate.setFullYear(now.getFullYear() - 1);
              else if (dateRange === 'custom' && customDates?.start) {
                startDate = new Date(customDates.start);
                if (customDates.end) {
                  const endDate = new Date(customDates.end);
                  endDate.setHours(23, 59, 59, 999);
                  filterParams.append('endDate', endDate.toISOString());
                }
              }
              filterParams.append('startDate', startDate.toISOString());
            }

            const filteredUrl = `${callsBase}/calls?${filterParams.toString()}`;
            console.log('[Dashboard] Fetching filtered calls:', filteredUrl);

            const callsResponse = await fetch(filteredUrl);
            if (callsResponse.ok) {
              const callsDataRaw = await callsResponse.json();
              const filteredArray = Array.isArray(callsDataRaw.data) ? callsDataRaw.data : (Array.isArray(callsDataRaw) ? callsDataRaw : []);
              setCallsData(filteredArray);
            }
          } catch (e) { console.error('Error fetching calls:', e); }

          // 4. Fetch Active Agents
          try {
            const agentsData = await getActiveAgentsForCompany(companyId);
            stats.agentsEnrolled = Array.isArray(agentsData) ? agentsData.length : 0;
            stats.gigsEnrolled = stats.agentsEnrolled > 0 ? stats.gigs : 0;
          } catch (e) { console.error('Error fetching agents:', e); }

          // Calculate Conversion Rate (Active Leads / Calls)
          stats.conversionRate = stats.calls > 0 ? Math.round((stats.activeLeads / stats.calls) * 100) : 0;
          if (stats.conversionRate > 100) stats.conversionRate = 100; // Cap at 100% just in case of data anomalies

          setCompanyStats(stats);
        } catch (error) {
          console.error('Error in fetchRealStats:', error);
        }
      };

      fetchRealStats();
    }
  }, [userType, companyId, userId, selectedGigId, dateRange, customDates]);

  // Mock training stats for the dashboard overview (for reps)
  const trainingStats = {
    completed: 12,
    inProgress: 5,
    pending: 3,
    totalModules: 20,
    overallProgress: 65
  };

  if (userType === 'company') {
    return (
      <div className="p-8">
        <CompanyPerformanceDashboard />
      </div>
    );
  }

  return (
    <div className="p-8">
      <PremiumDashboard 
        profile={profileData} 
        companyName={companyName} 
        userType={userType}
        trainingStats={trainingStats} 
        companyStats={companyStats}
        callsData={callsData}
        gigs={gigsList}
        selectedGigId={selectedGigId}
        onGigSelect={setSelectedGigId}
        dateRange={dateRange}
        onDateRangeSelect={setDateRange}
        customDates={customDates}
        onCustomDatesChange={setCustomDates}
      />
    </div>
  );
}
