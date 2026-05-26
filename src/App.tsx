import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Coins,
  DollarSign,
  Sparkles,
  X,
  Clock,
  Lock,
  Phone,
  ChevronDown,
  Building2,
  LogOut,
  Settings,
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { HashRouter, useLocation, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './components/dashboard/store';
import { AuthProvider } from './components/dashboard/contexts/AuthContext';
import Cookies from 'js-cookie';
import { formatWalletMinutesBalance } from './utils/billingMinutes';
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
import RepOnboarding from './components/onboarding/RepOnboarding';
import ZohoService from './services/zohoService';
import StripeContainer from './components/stripe/StripeContainer';
import DashboardApp from './components/dashboard/App';
import PremiumDashboard from './components/training/components/Dashboard/PremiumDashboard';
import MasterSidebar from './components/layout/MasterSidebar';
import { ProjectViewSwitch, type ProjectView } from './components/ProjectViewSwitch';
import { LanguageSwitcher } from './components/ui/LanguageSwitcher';
import Subscription from './components/Subscription';
import OrchestratorGuideModal from './components/onboarding/OrchestratorGuideModal';
import WalletTopUpModal from './components/wallet/WalletTopUpModal';
import { refreshAndBroadcastWalletBalance } from './lib/walletBalanceSync';
import { useOrchestratorGuide } from './hooks/useOrchestratorGuide';
import StepGuideModal, { type StepGuideVariant } from './components/onboarding/StepGuideModal';
import {
  markStepGuideSeen,
  shouldShowStepGuide,
  isOnboardingFullyCompleted,
  syncOnboardingProgressFromApi,
  getCompletedStepsFromStorage,
} from './hooks/useStepGuide';

// First step of the Activation phase (Phase 4). When this is reached (step 10 of
// Phase 3 done OR any Phase 4 step touched), wallet & upgrade widgets become
// relevant inside the orchestrator view.
const ACTIVATION_PHASE_STEP_IDS = [11, 12, 13] as const;
const LAST_PRE_ACTIVATION_STEP_ID = 10;

const TAB_ONBOARDING_STEPS: Record<string, { stepId: number; phaseId: number }> = {
  'script-generator': { stepId: 6, phaseId: 2 },
  'knowledge-base': { stepId: 8, phaseId: 3 },
  'approval-publishing': { stepId: 12, phaseId: 4 },
};

function AppContent() {
  const { t } = useTranslation();
  const location = useLocation();
  const [activeProject, setActiveProject] = useState<ProjectView>(() => {
    if (location.pathname.includes('/orchestrator')) {
      return 'comporchestrator';
    }
    if (location.pathname.includes('/dashboard') || location.pathname !== '/' && location.pathname !== '') {
      return 'dashboard';
    }
    // No path yet: returning users who finished every onboarding phase land on
    // the dashboard; first-time users still see the orchestrator setup flow.
    return isOnboardingFullyCompleted() ? 'dashboard' : 'comporchestrator';
  });
  const [activeTab, setActiveTab] = useState('company-onboarding');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userFullName, setUserFullName] = useState(() => localStorage.getItem('userFullName') || '');
  const [companyName, setCompanyName] = useState<string | null>(() => localStorage.getItem('companyName'));
  const [currentStepGuide, setCurrentStepGuide] = useState<{ title: string; description: string } | null>(null);
  const [globalBackConfig, setGlobalBackConfig] = useState<{ label: string; action: () => void } | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(() => localStorage.getItem('companyLogo'));
  const [logoError, setLogoError] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [tabStepGuide, setTabStepGuide] = useState<{
    stepId: number;
    phaseId: number;
    variant: StepGuideVariant;
  } | null>(null);
  const { shouldShowGuide, markGuideComplete } = useOrchestratorGuide();
  const [onboardingComplete, setOnboardingComplete] = useState(() =>
    isOnboardingFullyCompleted()
  );
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [completedStepIds, setCompletedStepIds] = useState<number[]>(() => getCompletedStepsFromStorage());
  const [balance, setBalance] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [escrow, setEscrow] = useState<number>(0);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showWalletTopUp, setShowWalletTopUp] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchBalance = async () => {
      const compId = Cookies.get('companyId');
      if (!compId) return;
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';
      try {
        // Company € balance: same source as OperationsDashboard + WalletCompanyPanel
        const [walletRes, escrowRes] = await Promise.all([
          fetch(`${apiBaseUrl}/wallet-company/${compId}`),
          fetch(`${apiBaseUrl}/escrow/wallet/${compId}`).catch(() => null),
        ]);

        if (walletRes.ok) {
          const walletJson = await walletRes.json();
          if (walletJson.success && walletJson.data) {
            setBalance(Number(walletJson.data.balance) || 0);
          }
        }

        // Minutes + telephony lines still live on the escrow wallet record
        if (escrowRes?.ok) {
          const result = await escrowRes.json();
          if (result.success && result.data) {
            setMinutes(result.data.minutes || 0);
            setEscrow(result.data.escrow || 0);
          }
        }
      } catch (err) {
        console.error('Failed to fetch balance in header:', err);
      }
    };

    fetchBalance();

    const handleBalanceUpdateEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (typeof customEvent.detail.balance === 'number') {
          setBalance(customEvent.detail.balance);
        }
        if (typeof customEvent.detail.minutes === 'number') {
          setMinutes(customEvent.detail.minutes);
        }
        if (typeof customEvent.detail.escrow === 'number') {
          setEscrow(customEvent.detail.escrow);
        }
      }
    };

    window.addEventListener('balanceUpdated', handleBalanceUpdateEvent);

    const handleUserProfileUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      const nextName = customEvent.detail?.fullName;
      if (typeof nextName === 'string' && nextName.length > 0) {
        setUserFullName(nextName);
      }
    };
    window.addEventListener('userProfileUpdated', handleUserProfileUpdated);

    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdateEvent);
      window.removeEventListener('userProfileUpdated', handleUserProfileUpdated);
    };
  }, []);

  const handleBalanceClick = () => {
    // From the orchestrator, opening the wallet should top-up directly
    // (same modal as the dashboard Wallet panel). From anywhere else we
    // navigate to the full dashboard panel as before.
    if (activeProject === 'comporchestrator') {
      setShowWalletTopUp(true);
      return;
    }
    setActiveProject('dashboard');
    navigate('/dashboard/wallet');
  };

  const refreshWalletBalance = async () => {
    try {
      const snapshot = await refreshAndBroadcastWalletBalance();
      if (snapshot) {
        setBalance(snapshot.balance);
        if (snapshot.minutes !== undefined) setMinutes(snapshot.minutes);
        if (snapshot.escrow !== undefined) setEscrow(snapshot.escrow);
      }
    } catch (err) {
      console.error('Failed to refresh wallet balance after top-up:', err);
    }
  };

  const handleMinutesClick = () => {
    setActiveProject('dashboard');
    navigate('/dashboard/minutes');
  };

  const handleTelephonyClick = () => {
    setActiveProject('dashboard');
    navigate('/dashboard/telephony');
  };

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

  // Re-check auth when the page is restored from the bfcache (browser back/forward).
  // Without this, React components are not re-mounted so the auth useEffect never runs again,
  // and a logged-out user can see protected screens by pressing the browser Back button.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const stillLoggedIn = Boolean(Cookies.get('userId'));
      const onPublicRoute = isZohoCallback || isZohoAuth;
      if (!stillLoggedIn && !onPublicRoute) {
        window.location.replace('/auth');
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [isZohoCallback, isZohoAuth]);

  useEffect(() => {
    // 1. Reset logo error on change
    setLogoError(false);

    // 2. Sync active project based on path (finished onboarding never stays on orchestrator)
    if (location.pathname.includes('/dashboard')) {
      setActiveProject('dashboard');
    } else if (location.pathname.includes('/orchestrator') && !onboardingComplete) {
      setActiveProject('comporchestrator');
    }

    // 3. Auth Check & Setup
    const userId = Cookies.get('userId');
    if (!userId && !isZohoCallback && !isZohoAuth) {
      window.location.replace('/auth');
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

              const finalCompanyId =
                getCompanyId(company) || resolvedCompanyId || Cookies.get('companyId');
              if (finalCompanyId) {
                Cookies.set('companyId', finalCompanyId, { path: '/' });
                const steps = await syncOnboardingProgressFromApi(finalCompanyId);
                const complete = isOnboardingFullyCompleted(steps);
                setOnboardingComplete(complete);
                if (complete) markGuideComplete();
              }
            }
          }

          const cookieCompanyId = Cookies.get('companyId');
          if (cookieCompanyId) {
            const steps = await syncOnboardingProgressFromApi(cookieCompanyId);
            const complete = isOnboardingFullyCompleted(steps);
            setOnboardingComplete(complete);
            if (complete) markGuideComplete();
          }
        } catch (error) {
          console.error('Error fetching details:', error);
        } finally {
          setOnboardingChecked(true);
        }
      } else {
        setOnboardingChecked(true);
      }
    };

    fetchData();
  }, [location.pathname, isZohoCallback, isZohoAuth, onboardingComplete]);

  useEffect(() => {
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

    const openCompanyDashboard = () => {
      setActiveProject('dashboard');
      navigate('/dashboard/main');
    };

    window.addEventListener('tabChange', handleTabChange as EventListener);
    window.addEventListener('stepGuideUpdate', handleStepGuideUpdate as EventListener);
    window.addEventListener('setGlobalBack', handleGlobalBackUpdate as EventListener);
    window.addEventListener('openComporchestrator', openComporchestrator);
    window.addEventListener('openCompanyDashboard', openCompanyDashboard);

    return () => {
      window.removeEventListener('tabChange', handleTabChange as EventListener);
      window.removeEventListener('stepGuideUpdate', handleStepGuideUpdate as EventListener);
      window.removeEventListener('setGlobalBack', handleGlobalBackUpdate as EventListener);
      window.removeEventListener('openComporchestrator', openComporchestrator);
      window.removeEventListener('openCompanyDashboard', openCompanyDashboard);
    };
  }, [location.pathname, isZohoCallback, isZohoAuth, navigate, markGuideComplete]);

  // Returning users with all phases done: never stay on #/orchestrator — go to dashboard.
  useEffect(() => {
    if (!onboardingComplete || isZohoCallback || isZohoAuth) return;

    const isOrchestratorRoute =
      location.pathname === '/' ||
      location.pathname === '' ||
      location.pathname.includes('/orchestrator');

    if (!isOrchestratorRoute) return;

    setShowGuideModal(false);
    setActiveProject('dashboard');
    navigate('/dashboard/main', { replace: true });
  }, [onboardingComplete, location.pathname, navigate, isZohoCallback, isZohoAuth]);

  // Initial route: first visit → orchestrator; finished onboarding → dashboard.
  useEffect(() => {
    if (isZohoCallback || isZohoAuth) return;
    if (location.pathname !== '/' && location.pathname !== '') return;

    if (onboardingComplete) {
      setActiveProject('dashboard');
      navigate('/dashboard/main', { replace: true });
    } else {
      window.location.hash = '#/orchestrator';
    }
  }, [onboardingComplete, location.pathname, navigate, isZohoCallback, isZohoAuth]);

  useEffect(() => {
    if (activeProject !== 'comporchestrator' || onboardingComplete) {
      setShowGuideModal(false);
      return;
    }
    // Wait for the API onboarding check to settle before showing the welcome modal.
    // This prevents a brief flash for returning users with all phases completed.
    if (!onboardingChecked) {
      setShowGuideModal(false);
      return;
    }
    if (
      shouldShowGuide &&
      !isZohoCallback &&
      !isZohoAuth &&
      !showUpgradeModal
    ) {
      const timer = setTimeout(() => setShowGuideModal(true), 600);
      return () => clearTimeout(timer);
    }
  }, [activeProject, shouldShowGuide, onboardingComplete, onboardingChecked, isZohoCallback, isZohoAuth, showUpgradeModal]);

  // Keep `completedStepIds` in sync with localStorage so navbar widgets (wallet
  // & upgrade) appear/disappear as the user progresses through onboarding.
  useEffect(() => {
    const refresh = () => setCompletedStepIds(getCompletedStepsFromStorage());
    refresh();
    window.addEventListener('stepCompleted', refresh as EventListener);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('stepCompleted', refresh as EventListener);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const hasReachedActivationPhase = React.useMemo(
    () =>
      completedStepIds.includes(LAST_PRE_ACTIVATION_STEP_ID) ||
      ACTIVATION_PHASE_STEP_IDS.some((id) => completedStepIds.includes(id)),
    [completedStepIds]
  );

  // Inside the orchestrator view, the wallet & upgrade buttons only make sense
  // once the user reaches the Activation phase. Outside the orchestrator they
  // remain visible at all times.
  const showActivationNavbarWidgets =
    activeProject !== 'comporchestrator' || hasReachedActivationPhase;

  const handleGuideComplete = () => {
    markGuideComplete();
    setShowGuideModal(false);
  };

  const handleGuideSkip = () => {
    markGuideComplete();
    setShowGuideModal(false);
  };

  useEffect(() => {
    const handleInsideGuide = (event: Event) => {
      const detail = (event as CustomEvent<{ stepId: number; phaseId: number }>).detail;
      if (!detail?.stepId) return;
      if (!shouldShowStepGuide(detail.stepId, 'inside')) return;
      setTabStepGuide({ ...detail, variant: 'inside' });
    };
    window.addEventListener('stepGuideInside', handleInsideGuide as EventListener);
    return () => {
      window.removeEventListener('stepGuideInside', handleInsideGuide as EventListener);
    };
  }, []);

  const handleCloseTabStepGuide = () => {
    if (tabStepGuide) {
      markStepGuideSeen(tabStepGuide.stepId, 'inside');
    }
    setTabStepGuide(null);
  };

  const handleLogout = () => {
    const cookies = Cookies.get();
    Object.keys(cookies).forEach(cookieName => {
      Cookies.remove(cookieName, { path: '/' });
      Cookies.remove(cookieName);
    });

    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('/app1');
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
              userType={localStorage.getItem('role') === 'company' ? 'company' : 'rep'}
              trainingStats={{ completed: 12, inProgress: 5, pending: 3, totalModules: 20, overallProgress: 65 }}
              companyStats={{ gigs: 8, calls: 142, gigsEnrolled: 12, activeLeads: 45 }}
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
      case 'training': return <RepOnboarding />;
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
          <header className={`bg-black h-16 flex items-center shrink-0 px-5 relative z-20 ${activeProject === 'dashboard' ? 'shadow-sm' : ''}`}>
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-6">
                {/* "Back to onboarding" shortcut.
                    Hidden while the user is inside the dashboard shell —
                    they already have the full sidebar to navigate between
                    Script Generator, Knowledge Base, etc. The button only
                    makes sense from the orchestrator's standalone step
                    pages where the rep is otherwise stranded with no
                    return path. */}
                {globalBackConfig && activeProject !== 'dashboard' && (
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

              {/* Credits, Balance, and Upgrade Widgets */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {/* Balance Widget (My Wallet) — hidden in orchestrator until Activation phase */}
                {showActivationNavbarWidgets && (
                  <div
                    onClick={handleBalanceClick}
                    className="relative flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-gradient-to-br from-emerald-500/20 via-slate-950/90 to-[#064e3b]/30 border border-emerald-500/40 text-xs font-bold text-emerald-50/90 shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] hover:border-emerald-300/80 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_0_28px_-2px_rgba(16,185,129,0.7)] transition-all duration-300 cursor-pointer group backdrop-blur-md overflow-hidden shrink-0"
                  >
                    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                      <span className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-escrow-shine" />
                    </span>

                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-all duration-300 shrink-0">
                      <Coins size={14} className="text-white drop-shadow-md animate-pulse-subtle" />
                    </div>
                    <div className="flex flex-col leading-tight relative z-10">
                      <span className="text-[8px] font-black uppercase tracking-[0.15em] text-emerald-400 group-hover:text-emerald-300 transition-colors">{t('navbar.myWallet')}</span>
                      <span className="text-sm font-black text-white tabular-nums tracking-tight">{balance.toLocaleString('en-US')} €</span>
                    </div>
                  </div>
                )}

                {showActivationNavbarWidgets && (
                  <div
                    onClick={handleMinutesClick}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent border border-blue-500/25 text-xs font-bold text-blue-100/80 shadow-[0_0_18px_-6px_rgba(59,130,246,0.4)] hover:border-blue-400/50 hover:from-blue-500/25 hover:text-white hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group backdrop-blur-sm shrink-0"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-400/30 shadow-inner group-hover:scale-105 transition-transform duration-300 shrink-0">
                      <Clock size={13} className="text-blue-400 group-hover:text-blue-300" />
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[8px] font-black uppercase tracking-[0.15em] text-blue-400/70">{t('navbar.minutes')}</span>
                      <span className="text-sm font-black text-white tabular-nums">{formatWalletMinutesBalance(minutes)}</span>
                    </div>
                  </div>
                )}

                {activeProject !== 'comporchestrator' && (
                  <>
                    {/* Escrow/Séquestre Widget (Telephony Lines) */}
                    <div
                      onClick={handleTelephonyClick}
                      className="relative flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-gradient-escrow border border-amber-400/40 text-xs font-bold text-amber-100/90 animate-escrow-glow hover:border-amber-300/60 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group overflow-hidden backdrop-blur-md shrink-0"
                    >
                      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                        <span className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-escrow-shine" />
                      </span>
                      <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-escrow-icon text-white shadow-md shadow-amber-500/30 ring-1 ring-amber-400/20 group-hover:scale-110 transition-all duration-300 shrink-0">
                        <Phone size={13} className="drop-shadow-sm" strokeWidth={2.5} />
                      </div>
                      <div className="relative flex flex-col leading-tight">
                        <span className="text-[8px] font-black uppercase tracking-[0.15em] text-amber-300/90">{t('navbar.phoneLines')}</span>
                        <span className="text-sm font-black text-white tabular-nums tracking-tight">{escrow} {escrow !== 1 ? t('navbar.linePlural') : t('navbar.lineSingular')}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Upgrade Button — hidden in orchestrator before the Subscription Plan step */}
                {showActivationNavbarWidgets && (
                  <button
                    onClick={() => {
                      setActiveProject('dashboard');
                      navigate('/dashboard/subscription');
                    }}
                    className="relative flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#EC4899] via-[#F43F5E] to-[#8B5CF6] text-white font-black text-[11px] uppercase tracking-[0.12em] shadow-[0_0_25px_rgba(236,72,153,0.55)] hover:shadow-[0_0_40px_rgba(236,72,153,0.8)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300 overflow-hidden group/upgrade shrink-0"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#F43F5E] opacity-0 group-hover/upgrade:opacity-100 transition-opacity duration-500" />
                    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                      <span className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/upgrade:animate-escrow-shine" />
                    </span>
                    <Sparkles size={13} className="animate-pulse text-white shrink-0 relative z-10" />
                    <span className="whitespace-nowrap relative z-10">{t('navbar.upgrade')}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <LanguageSwitcher />
                <div className="relative">
                  <div
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-2 bg-white/5 p-1 pr-3 rounded-xl border border-white/10 shadow-sm cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-black shadow-md overflow-hidden ${companyLogo && !logoError ? 'bg-white' : 'bg-gradient-harx'}`}>
                      {companyLogo && !logoError ? (
                        <img
                          src={companyLogo}
                          alt="Company Logo"
                          className="w-full h-full object-contain p-0.5"
                          onError={() => setLogoError(true)}
                        />
                      ) : (
                        userFullName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white leading-tight truncate max-w-[120px]">{companyName || userFullName}</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{t('navbar.company')}</span>
                    </div>
                    <ChevronDown size={12} className={`text-gray-400 transition-transform duration-300 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-[#0B0F19] border border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in">
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          setActiveProject('dashboard');
                          navigate('/dashboard/profile');
                        }}
                        className="flex items-center gap-3 w-full p-4 text-left text-sm text-white hover:bg-white/5 transition-colors border-b border-white/5"
                      >
                        <Building2 size={16} className="text-gray-400" />
                        <span className="font-bold">Profil</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          setActiveProject('dashboard');
                          navigate('/dashboard/account-settings');
                        }}
                        className="flex items-center gap-3 w-full p-4 text-left text-sm text-white hover:bg-white/5 transition-colors border-b border-white/5"
                      >
                        <Settings size={16} className="text-gray-400" />
                        <span className="font-bold">Paramètres</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-3 w-full p-4 text-left text-sm text-rose-400 hover:bg-white/5 transition-colors"
                      >
                        <LogOut size={16} className="text-rose-400" />
                        <span className="font-bold">Déconnexion</span>
                      </button>
                    </div>
                  )}
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

      <OrchestratorGuideModal
        isOpen={showGuideModal}
        onComplete={handleGuideComplete}
        onSkip={handleGuideSkip}
        userName={userFullName?.split(' ')[0]}
      />

      {tabStepGuide && (
        <StepGuideModal
          isOpen
          stepId={tabStepGuide.stepId}
          phaseId={tabStepGuide.phaseId}
          variant={tabStepGuide.variant}
          onClose={handleCloseTabStepGuide}
        />
      )}

      <WalletTopUpModal
        open={showWalletTopUp}
        onClose={() => setShowWalletTopUp(false)}
        companyId={Cookies.get('companyId')}
        onSuccess={refreshWalletBalance}
      />

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
