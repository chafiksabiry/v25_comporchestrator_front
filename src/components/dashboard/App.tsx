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
import AccountSettingsPanel from './panels/AccountSettingsPanel';
import TelnyxCallTest from './panels/TelnyxCallTest';
import KnowledgeBase from './panels/KnowledgeBase';
import KnowledgeInsights from './panels/KnowledgeInsights';
import OverviewDashboardPage from './pages/OverviewDashboardPage';
import CompanyDashboardPage from './pages/CompanyDashboardPage';
import PremiumDashboardPage from './pages/PremiumDashboardPage';
import CallsDashboardPage from './pages/CallsDashboardPage';
import { CompanyPerformanceDashboard } from './pages/CompanyPerformanceDashboard';
import { WalletCompanyPanel } from './panels/WalletCompanyPanel';
import { MinutesCompanyPanel } from './panels/MinutesCompanyPanel';
import { PhoneNumberPanel } from './panels/PhoneNumberPanel';
import { SubscriptionPanel } from './panels/SubscriptionPanel';
import ScriptGenerator from '../ScriptGenerator';
import RepOnboarding from '../onboarding/RepOnboarding';
import ApprovalPublishing from '../ApprovalPublishing';

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard/main" element={<PremiumDashboardPage />} />
        <Route path="/dashboard/overview" element={<OverviewDashboardPage />} />
        <Route path="/company" element={<Navigate to="/dashboard/profile" replace />} />
        <Route path="/dashboard" element={<CompanyDashboardPage />} />
        <Route path="/dashboard/wallet" element={<WalletCompanyPanel />} />
        <Route path="/dashboard/minutes" element={<MinutesCompanyPanel />} />
        <Route path="/dashboard/telephony" element={<PhoneNumberPanel />} />
        <Route path="/dashboard/subscription" element={<SubscriptionPanel />} />
        <Route path="/dashboard/upgrade" element={<SubscriptionPanel />} />
        <Route path="/dashboard/profile" element={<CompanyProfilePanel />} />
        <Route path="/dashboard/leads" element={<LeadManagementPanel />} />
        <Route path="/dashboard/rep-matching" element={<RepMatchingPanel />} />
        <Route path="/dashboard/scheduler" element={<SchedulerPanel />} />
        <Route path="/dashboard/calls" element={<CallsDashboardPage />} />
        <Route path="/dashboard/script-generator" element={<ScriptGenerator />} />
        <Route path="/dashboard/training" element={<RepOnboarding />} />
        <Route path="/dashboard/telnyx-call-test" element={<TelnyxCallTest />} />
        <Route path="/dashboard/call-report" element={<CallReportCard />} />
        <Route path="/dashboard/emails" element={<EmailsPanel />} />
        <Route path="/dashboard/chat" element={<ChatPanel />} />
        <Route path="/dashboard/gigs" element={<GigsPanel />} />
        <Route path="/dashboard/gigs/:gigId" element={<GigDetailsPanel />} />
        <Route path="/dashboard/quality-assurance" element={<QualityAssurancePanel />} />
        <Route path="/dashboard/operations" element={<OperationsPanel />} />
        <Route path="/dashboard/analytics" element={<CompanyPerformanceDashboard />} />
        <Route path="/dashboard/gig-activation" element={<ApprovalPublishing />} />
        <Route path="/dashboard/settings" element={<SettingsPanel />} />
        <Route path="/dashboard/account-settings" element={<AccountSettingsPanel />} />
        <Route path="/dashboard/knowledge-base" element={<KnowledgeBase />} />
        <Route path="/dashboard/kb-insight" element={<KnowledgeInsights />} />
        <Route path="*" element={<div className="p-8 text-red-500 font-bold">Le tableau de bord n'a pas trouvé cette route. URL: {window.location.hash}</div>} />
      </Route>
    </Routes>
  );
}

export default App;
