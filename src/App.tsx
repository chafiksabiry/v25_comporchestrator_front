import React, { useState, useEffect } from 'react';
import {
  LogOut,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Info
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { HashRouter, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './components/dashboard/store';
import { AuthProvider } from './components/dashboard/contexts/AuthContext';
import Cookies from 'js-cookie';
import ProfileCreation from './components/ProfileCreation';
import GigGeneration from './components/GigGeneration';
import Matching from './components/Matching';
import ApprovalPublishing from './components/ApprovalPublishing';
import Optimization from './components/Optimization';
import CompanyOnboarding from './components/CompanyOnboarding';
import ZohoCallback from './components/onboarding/ZohoCallback';
import ZohoAuth from './components/onboarding/ZohoAuth';
import KnowledgeBase from './components/KnowledgeBase';
import ScriptGenerator from './components/ScriptGenerator';
import ZohoService from './services/zohoService';
import StripeContainer from './components/stripe/StripeContainer';
import DashboardApp from './components/dashboard/App';
import MasterSidebar from './components/layout/MasterSidebar';
import { ProjectViewSwitch, type ProjectView } from './components/ProjectViewSwitch';

function AppContent() {
  const location = useLocation();
  const [activeProject, setActiveProject] = useState<ProjectView>(() => {
    if (location.pathname !== '/' && location.pathname !== '') {
      return 'dashboard';
    }
    return 'comporchestrator';
  });
  const [activeTab, setActiveTab] = useState('company-onboarding');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userFullName, setUserFullName] = useState('Admin User');
  const [currentStepGuide, setCurrentStepGuide] = useState<{ title: string; description: string } | null>(null);
  const [globalBackConfig, setGlobalBackConfig] = useState<{ label: string; action: () => void } | null>(null);

  const isZohoCallback = window.location.pathname === '/zoho-callback';
  const isZohoAuth = window.location.pathname === '/zoho-auth';

  useEffect(() => {
    const userId = Cookies.get('userId');
    if (!userId && !isZohoCallback && !isZohoAuth) {
      window.location.href = '/auth';
      return;
    }

    const fetchUserDetails = async () => {
      if (userId) {
        try {
          const registrationBackendUrl = import.meta.env.VITE_REGISTRATION_BACKEND_URL;
          const response = await fetch(`${registrationBackendUrl}/api/users/${userId}`);
          if (response.ok) {
            const userData = await response.json();
            if (userData.data && userData.data.fullName) {
              setUserFullName(userData.data.fullName);
            }
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
        }
      }
    };

    fetchUserDetails();

    const initializeZoho = async () => {
      ZohoService.getInstance();
    };

    initializeZoho().catch(error => {
      console.debug('App: Error initializing Zoho', error);
    });

    const handleTabChange = (event: CustomEvent) => {
      const tab = event.detail?.tab;
      if (!tab) return;
      if (tab === 'dashboard') {
        setActiveProject('dashboard');
        return;
      }
      setActiveProject('comporchestrator');
      setActiveTab(tab);
    };

    localStorage.removeItem('activeTab');

    const handleStepGuideUpdate = (event: CustomEvent) => {
      if (event.detail) {
        setCurrentStepGuide({
          title: event.detail.title,
          description: event.detail.description
        });
      }
    };

    const handleGlobalBackUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.action) {
        setGlobalBackConfig({
          label: event.detail.label || 'Back',
          action: event.detail.action
        });
      } else {
        setGlobalBackConfig(null);
      }
    };

    const openComporchestrator = () => setActiveProject('comporchestrator');

    window.addEventListener('tabChange', handleTabChange as EventListener);
    window.addEventListener('stepGuideUpdate', handleStepGuideUpdate as EventListener);
    window.addEventListener('setGlobalBack', handleGlobalBackUpdate as EventListener);
    window.addEventListener('openComporchestrator', openComporchestrator);

    return () => {
      window.removeEventListener('tabChange', handleTabChange as EventListener);
      window.removeEventListener('stepGuideUpdate', handleStepGuideUpdate as EventListener);
      window.removeEventListener('setGlobalBack', handleGlobalBackUpdate as EventListener);
      window.removeEventListener('openComporchestrator', openComporchestrator);
    };
  }, []);

  const handleLogout = () => {
    const cookies = Cookies.get();
    Object.keys(cookies).forEach(cookieName => {
      Cookies.remove(cookieName, { path: '/' });
      Cookies.remove(cookieName);
    });

    localStorage.clear();
    window.location.href = '/app1';
  };

  const renderContent = () => {
    if (isZohoCallback) return <ZohoCallback />;
    if (isZohoAuth) return <ZohoAuth />;

    switch (activeTab) {
      case 'profile-creation': return <ProfileCreation />;
      case 'gig-generation': return <GigGeneration />;
      case 'matching': return <Matching />;
      case 'approval-publishing': return <ApprovalPublishing />;
      case 'optimization': return <Optimization />;
      case 'knowledge-base': return <KnowledgeBase />;
      case 'script-generator': return <ScriptGenerator />;
      case 'company-onboarding':
      default:
        return <CompanyOnboarding />;
    }
  };

  if (isZohoCallback || isZohoAuth) {
    return (
      <StripeContainer>
        <div className="flex h-screen bg-gray-50">
          <Toaster position="top-right" />
          <main className="flex-1 overflow-y-auto">
            {renderContent()}
          </main>
        </div>
      </StripeContainer>
    );
  }

  return (
    <StripeContainer>
      <Toaster position="top-right" />
      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
        {/* Unified Master Sidebar */}
        <MasterSidebar
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          activeProject={activeProject}
          setActiveProject={setActiveProject}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          currentStepGuide={currentStepGuide}
        />

        <div className="flex flex-1 flex-col overflow-hidden relative">
          {/* Top Navigation / Navbar */}
          <header className={`bg-white/80 backdrop-blur-md border-b border-gray-100 h-20 flex items-center shrink-0 px-8 relative z-20 ${activeProject === 'dashboard' ? 'shadow-sm' : ''}`}>
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-6">
                {globalBackConfig && (
                  <button
                    onClick={globalBackConfig.action}
                    className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-gradient-harx/10 border border-harx-500/20 text-harx-600 hover:bg-gradient-harx/20 transition-all duration-300 group shadow-sm shadow-harx-500/5 animate-in slide-in-from-left-4 fade-in"
                  >
                    <div className="p-1.5 rounded-lg bg-white shadow-sm transition-transform duration-300 group-hover:-translate-x-1">
                      <ChevronRight className="h-4 w-4 rotate-180" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest">{globalBackConfig.label}</span>
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-4 ml-auto">
                <div className="flex items-center space-x-3 bg-gray-50 p-1.5 pr-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="h-10 w-10 rounded-xl bg-gradient-harx flex items-center justify-center text-white font-black shadow-md">
                    {userFullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-gray-900 leading-tight">{userFullName}</span>
                    <span className="text-[10px] text-harx-500 font-bold uppercase tracking-wider">Administrator</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto relative w-full h-full">
            <ProjectViewSwitch
              activeView={activeProject}
              dashboard={<DashboardApp />}
              comporchestrator={
                <div className="px-4 py-3 h-full pb-32">
                  {renderContent()}
                </div>
              }
            />
          </main>
        </div>
      </div>
    </StripeContainer>
  );
}

function App() {
  return (
    <AuthProvider>
      <Provider store={store}>
        <HashRouter>
           <AppContent />
        </HashRouter>
      </Provider>
    </AuthProvider>
  );
}

export default App;