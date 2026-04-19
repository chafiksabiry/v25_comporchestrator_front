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
        <Route index element={<OverviewDashboardPage />} />
        <Route path="company" element={<Navigate to="/company/profile" replace />} />
        <Route path="company/dashboard" element={<CompanyDashboardPage />} />
        <Route path="company/profile" element={<CompanyProfilePanel />} />
        <Route path="leads" element={<LeadManagementPanel />} />
        <Route path="rep-matching" element={<RepMatchingPanel />} />
        <Route path="scheduler" element={<SchedulerPanel />} />
        <Route path="calls" element={<CallsPanel />} />
        <Route path="telnyx-call-test" element={<TelnyxCallTest />} />
        <Route path="call-report" element={<CallReportCard />} />
        <Route path="emails" element={<EmailsPanel />} />
        <Route path="chat" element={<ChatPanel />} />
        <Route path="gigs" element={<GigsPanel />} />
        <Route path="gigs/:gigId" element={<GigDetailsPanel />} />
        <Route path="quality-assurance" element={<QualityAssurancePanel />} />
        <Route path="operations" element={<OperationsPanel />} />
        <Route path="analytics" element={<AnalyticsPanel />} />
        <Route path="integrations" element={<IntegrationsPanel />} />
        <Route path="settings" element={<SettingsPanel />} />
        <Route path="knowledge-base" element={<KnowledgeBase />} />
        <Route path="kb-insight" element={<KnowledgeInsights />} />
      </Route>
    </Routes>
  );
}

export default App;
