import React, { useState, useEffect } from 'react';
import {
  LogOut,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Info,
  Building2
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
import PremiumDashboard from './components/training/components/Dashboard/PremiumDashboard';
import MasterSidebar from './components/layout/MasterSidebar';
import { ProjectViewSwitch, type ProjectView } from './components/ProjectViewSwitch';

function AppContent() {
  const location = useLocation();
  const [activeProject, setActiveProject] = useState<ProjectView>(() => {
    if (location.pathname.includes('/orchestrator')) {
      return 'comporchestrator';
    }
    if (location.pathname.includes('/dashboard') || location.pathname !== '/' && location.pathname !== '') {
      return 'dashboard';
    }
    return 'comporchestrator'; // default
  });
  const [activeTab, setActiveTab] = useState('company-onboarding');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userFullName, setUserFullName] = useState(() => localStorage.getItem('userFullName') || '');
  const [companyName, setCompanyName] = useState<string | null>(() => localStorage.getItem('companyName'));
  const [currentStepGuide, setCurrentStepGuide] = useState<{ title: string; description: string } | null>(null);
  const [globalBackConfig, setGlobalBackConfig] = useState<{ label: string; action: () => void } | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(() => localStorage.getItem('companyLogo'));
  const [logoError, setLogoError] = useState(false);

  const unwrapPayload = (body: any) => {
    if (!body) return null;
    if (body.data !== undefined && body.data !== null) return body.data;
    return body;
  };

  const normalizeCompany = (payload: any) => {
    if (!payload) return null;
    if (Array.isArray(payload)) return payload[0] || null;
    if (payload.company && typeof payload.company === 'object') return payload.company;
    return payload;
  };

  const getCompanyId = (company: any): string | null => {
    const id = company?._id || company?.id;
    if (typeof id === 'string') return id;
    if (id && typeof id === 'object' && typeof id.$oid === 'string') return id.$oid;
    return null;
  };

  const pickCompanyLogo = (company: any): string | null =>
    company?.logo ||
    company?.logoUrl ||
    company?.companyLogo ||
    company?.branding?.logo ||
    company?.contact?.logo ||
    null;

  const isZohoCallback = window.location.pathname === '/zoho-callback';
  const isZohoAuth = window.location.pathname === '/zoho-auth';

  useEffect(() => {
    // 1. Reset logo error on change
    setLogoError(false);

    // 2. Sync active project based on path
    if (location.pathname.includes('/orchestrator')) {
      setActiveProject('comporchestrator');
    } else if (location.pathname.includes('/dashboard')) {
      setActiveProject('dashboard');
    }

    // 3. Auth Check & Setup
    const userId = Cookies.get('userId');
    if (!userId && !isZohoCallback && !isZohoAuth) {
      window.location.href = '/auth';
      return;
    }

    const fetchData = async () => {
      if (userId) {
        try {
          // Fetch user details
          const registrationBackendUrl = import.meta.env.VITE_REGISTRATION_BACKEND_URL;
          const userResponse = await fetch(`${registrationBackendUrl}/api/users/${userId}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.data && userData.data.fullName) {
              setUserFullName(userData.data.fullName);
              localStorage.setItem('userFullName', userData.data.fullName);
            }
          }

          // Fetch company details for logo
          const companyApiUrl = import.meta.env.VITE_COMPANY_API_URL;
          if (companyApiUrl) {
            const companyId = Cookies.get('companyId');
            let companyResponse;

            if (companyId) {
              // Try fetching by companyId first
              companyResponse = await fetch(`${companyApiUrl}/companies/${companyId}/details`);
              if (!companyResponse.ok) {
                // Fallback to userId if companyId fetch fails
                companyResponse = await fetch(`${companyApiUrl}/companies/user/${userId}`);
              }
            } else {
              // Direct fetch by userId
              companyResponse = await fetch(`${companyApiUrl}/companies/user/${userId}`);
            }

            if (companyResponse && companyResponse.ok) {
              const companyData = await companyResponse.json();
              let company = normalizeCompany(unwrapPayload(companyData));

              // Some endpoints return partial company without logo; fetch full details when possible.
              let rawLogo = pickCompanyLogo(company);
              const resolvedCompanyId = getCompanyId(company) || companyId || null;
              if (!rawLogo && resolvedCompanyId) {
                try {
                  const detailsResponse = await fetch(`${companyApiUrl}/companies/${resolvedCompanyId}/details`);
                  if (detailsResponse.ok) {
                    const detailsData = await detailsResponse.json();
                    company = normalizeCompany(unwrapPayload(detailsData)) || company;
                    rawLogo = pickCompanyLogo(company);
                  }
                } catch {
                  // Keep silent and fallback to previously known logo.
                }
              }

              const name = company?.name;

              if (name) {
                setCompanyName(name);
                localStorage.setItem('companyName', name);
              }

              if (rawLogo) {
                setCompanyLogo(rawLogo);
                localStorage.setItem('companyLogo', rawLogo);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching details:', error);
        }
      }
    };

    fetchData();

    const initializeZoho = async () => {
      ZohoService.getInstance();
    };

    initializeZoho().catch(() => {

    });

    const handleTabChange = (event: CustomEvent) => {
      const tab = event.detail?.tab;
      if (!tab) return;
      if (tab === 'dashboard') {
        window.location.hash = '#/dashboard/overview';
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

    const openComporchestrator = () => {
      setActiveProject('comporchestrator');
      window.location.hash = '#/orchestrator';
    };

    window.addEventListener('tabChange', handleTabChange as EventListener);
    window.addEventListener('stepGuideUpdate', handleStepGuideUpdate as EventListener);
    window.addEventListener('setGlobalBack', handleGlobalBackUpdate as EventListener);
    window.addEventListener('openComporchestrator', openComporchestrator);

    // Initial Path correction
    if (location.pathname === '/' || location.pathname === '') {
      window.location.hash = '#/orchestrator';
    }

    return () => {
      window.removeEventListener('tabChange', handleTabChange as EventListener);
      window.removeEventListener('stepGuideUpdate', handleStepGuideUpdate as EventListener);
      window.removeEventListener('setGlobalBack', handleGlobalBackUpdate as EventListener);
      window.removeEventListener('openComporchestrator', openComporchestrator);
    };
  }, [location.pathname, companyLogo, isZohoCallback, isZohoAuth]);

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
      case 'dashboard':
        return (
          <div className="p-4">
            <PremiumDashboard 
              profile={{ personalInfo: { name: userFullName }, fullName: userFullName }} 
              companyName={companyName}
              trainingStats={{ completed: 12, inProgress: 5, pending: 3, totalModules: 20, overallProgress: 65 }} 
            />
          </div>
        );
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

        <div className="flex flex-1 flex-col overflow-hidden relative bg-black">
          {/* Top Navigation / Navbar */}
          <header className={`bg-black h-20 flex items-center shrink-0 px-8 relative z-20 ${activeProject === 'dashboard' ? 'shadow-sm' : ''}`}>
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
                <div className="flex items-center space-x-3 bg-white/5 p-1.5 pr-4 rounded-2xl border border-white/10 shadow-sm">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white font-black shadow-md overflow-hidden ${companyLogo && !logoError ? 'bg-white' : 'bg-gradient-harx'}`}>
                    {companyLogo && !logoError ? (
                      <img
                        src={companyLogo}
                        alt="Company Logo"
                        className="w-full h-full object-contain p-1"
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      userFullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white leading-tight">{companyName || userFullName}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Administrator</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto relative w-full h-full bg-white rounded-tl-[20px] shadow-2xl shadow-black/5">
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
