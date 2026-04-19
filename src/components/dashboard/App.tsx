import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import CompanyProfilePanel from './panels/CompanyProfilePanel';
import LeadManagementPanel from './panels/LeadManagementPanel';
import RepMatchingPanel from './panels/RepMatchingPanel';
import SchedulerPanel from './panels/SchedulerPanel';
import CallsPanel from './panels/CallsPanel';
import EmailsPanel from './panels/EmailsPanel';
import ChatPanel from './panels/ChatPanel';
import CallReportCard from './components/CallReport';
import GigsPanel from './panels/GigsPanel';
import GigDetailsPanel from './panels/GigDetailsPanel';
import QualityAssurancePanel from './panels/QualityAssurancePanel';
import OperationsPanel from './panels/OperationsPanel';
import AnalyticsPanel from './panels/AnalyticsPanel';
import IntegrationsPanel from './panels/IntegrationsPanel';
import SettingsPanel from './panels/SettingsPanel';
import TelnyxCallTest from './panels/TelnyxCallTest';
import KnowledgeBase from './panels/KnowledgeBase';
import KnowledgeInsights from './panels/KnowledgeInsights';
import OverviewDashboardPage from './pages/OverviewDashboardPage';
import CompanyDashboardPage from './pages/CompanyDashboardPage';

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard/overview" element={<OverviewDashboardPage />} />
        <Route path="/company" element={<Navigate to="/dashboard/profile" replace />} />
        <Route path="/dashboard" element={<CompanyDashboardPage />} />
        <Route path="/dashboard/profile" element={<CompanyProfilePanel />} />
        <Route path="/dashboard/leads" element={<LeadManagementPanel />} />
        <Route path="/dashboard/rep-matching" element={<RepMatchingPanel />} />
        <Route path="/dashboard/scheduler" element={<SchedulerPanel />} />
        <Route path="/dashboard/calls" element={<CallsPanel />} />
        <Route path="/dashboard/telnyx-call-test" element={<TelnyxCallTest />} />
        <Route path="/dashboard/call-report" element={<CallReportCard />} />
        <Route path="/dashboard/emails" element={<EmailsPanel />} />
        <Route path="/dashboard/chat" element={<ChatPanel />} />
        <Route path="/dashboard/gigs" element={<GigsPanel />} />
        <Route path="/dashboard/gigs/:gigId" element={<GigDetailsPanel />} />
        <Route path="/dashboard/quality-assurance" element={<QualityAssurancePanel />} />
        <Route path="/dashboard/operations" element={<OperationsPanel />} />
        <Route path="/dashboard/analytics" element={<AnalyticsPanel />} />
        <Route path="*" element={<div className="p-8 text-red-500 font-bold">Le tableau de bord n'a pas trouvé cette route. URL: {window.location.hash}</div>} />
        <Route path="/dashboard/integrations" element={<IntegrationsPanel />} />
        <Route path="/dashboard/settings" element={<SettingsPanel />} />
        <Route path="/dashboard/knowledge-base" element={<KnowledgeBase />} />
        <Route path="/dashboard/kb-insight" element={<KnowledgeInsights />} />
      </Route>
    </Routes>
  );
}

export default App;
