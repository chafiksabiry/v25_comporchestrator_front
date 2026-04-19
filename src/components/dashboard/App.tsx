import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import { AuthProvider } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
//import DashboardPanel from './panels/DashboardPanel';
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
import DashboardPanel from './panels/DashboardPanel';
import TelnyxCallTest from './panels/TelnyxCallTest';
import KnowledgeBase from './panels/KnowledgeBase';
import KnowledgeInsights from './panels/KnowledgeInsights';
function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  return (
    <AuthProvider>
      <Provider store={store}>
        <Router>
          <div className="flex min-h-screen bg-[#F8FAFC]">
            <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
            <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'pl-20' : 'pl-64'}`}>
              <div className="p-8">
                <Routes>
                  <Route path="/" element={<DashboardPanel />} />
                  <Route path="/company" element={<CompanyProfilePanel />} />
                  <Route path="/leads" element={<LeadManagementPanel />} />
                  {/* <Route path="/deals" element={<DealManagementPanel />} /> */}
                  {/* <Route path="/contacts" element={<ContactManagementPanel />} /> */}
                  <Route path="/rep-matching" element={<RepMatchingPanel />} />
                  <Route path="/scheduler" element={<SchedulerPanel />} />
                  <Route path="/calls" element={<CallsPanel />} />
                  <Route path="/telnyx-call-test" element={<TelnyxCallTest />} />
                  <Route path="/call-report" element={<CallReportCard />} />
                  <Route path="/emails" element={<EmailsPanel />} />
                  <Route path="/chat" element={<ChatPanel />} />
                  <Route path="/gigs" element={<GigsPanel />} />
                  <Route path="/gigs/:gigId" element={<GigDetailsPanel />} />
                  <Route path="/quality-assurance" element={<QualityAssurancePanel />} />
                  <Route path="/operations" element={<OperationsPanel />} />
                  <Route path="/analytics" element={<AnalyticsPanel />} />
                  <Route path="/integrations" element={<IntegrationsPanel />} />
                  <Route path="/settings" element={<SettingsPanel />} />
                  <Route path="/knowledge-base" element={<KnowledgeBase />} />
                  <Route path="/kb-insight" element={<KnowledgeInsights />} />
                </Routes>
              </div>
            </div>
          </div>
          <Toaster position="top-right" />
        </Router>
      </Provider>
    </AuthProvider>
  );
}

export default App;
