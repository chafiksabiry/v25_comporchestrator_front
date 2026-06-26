import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Coins,
  DollarSign,
  Sparkles,
  X,
  Clock,
  Lock,
  Phone,
  CalendarDays,
  Maximize2,
  Minimize2,
  ChevronDown,
  Building2,
  LogOut,
  Settings,
  Menu,
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { HashRouter, useLocation, useNavigate } from 'react-router-dom';
import VisitorTracker from './lib/VisitorTracker';
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
import SessionPlanning from './components/onboarding/SessionPlanning';
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
import { connectEscrowSocket } from './lib/escrowSocket';
import {
  dispatchOpenCallDetails,
  handleCallAnalysisHelpMessage,
  NAVIGATE_OPEN_CALL_EVENT,
  type OpenCallDetailsDetail,
} from './lib/callAnalysisHelpNotification';
import { resolveSessionUserId } from './lib/sessionUserId';
import { useOrchestratorGuide } from './hooks/useOrchestratorGuide';
import { OnboardingNextStepButton } from './components/onboarding/OnboardingNextStepButton';
import { goToCompanyOnboardingTab } from './hooks/useOnboardingGlobalBack';
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

const TAB_ONBOARDING_STEPS: Record<string, { stepId: number; phaseId: number }> = {
  'script-generator': { stepId: 9, phaseId: 3 },
  'knowledge-base': { stepId: 7, phaseId: 3 },
  'approval-publishing': { stepId: 12, phaseId: 4 },
};

const ORCHESTRATOR_STEP_TABS = new Set([
  'knowledge-base',
  'script-generator',
  'approval-publishing',
  'training',
  'profile-creation',
  'gig-generation',
  'matching',
  'optimization',
]);

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Close the mobile sidebar drawer whenever the route changes (e.g. a nav
  // link is tapped) so it doesn't stay open over the content.
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);
  const [userFullName, setUserFullName] = useState(() => localStorage.getItem('userFullName') || '');
  const [companyName, setCompanyName] = useState<string | null>(() => localStorage.getItem('companyName'));
  const [currentStepGuide, setCurrentStepGuide] = useState<{ title: string; description: string; steps?: string[] } | null>(null);
  const [orchestratorStepStatuses, setOrchestratorStepStatuses] = useState<Record<number, string>>({});
  const [kbHasContent, setKbHasContent] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('knowledgeItems');
      if (saved) {
        const items = JSON.parse(saved);
        return Array.isArray(items) && items.length > 0;
      }
    } catch {}
    return false;
  });
  const [companyLogo, setCompanyLogo] = useState<string | null>(() => localStorage.getItem('companyLogo'));
  const [logoError, setLogoError] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showPlanningPanel, setShowPlanningPanel] = useState(false);
  const [maximizedPlanning, setMaximizedPlanning] = useState(false);
  useEffect(() => {
    if (location.pathname.includes('/orchestrator') || window.location.hash.includes('orchestrator')) {
      setShowPlanningPanel(false);
      setMaximizedPlanning(false);
    }
  }, [location.pathname]);
  const [tabStepGuide, setTabStepGuide] = useState<{
    stepId: number;
    phaseId: number;
    variant: StepGuideVariant;
  } | null>(null);
  const { shouldShowGuide, markGuideComplete } = useOrchestratorGuide();
  const [onboardingComplete, setOnboardingComplete] = useState(() =>
    isOnboardingFullyCompleted()
  );
  // `onboardingChecked` was used to gate the welcome modal until the API
  // onboarding sync had completed. The welcome modal no longer depends on
  // onboarding state (it is purely first-visit driven), so the flag was
  // dropped. Keep silent no-op setters here only if other code still calls them.
  const [completedStepIds, setCompletedStepIds] = useState<number[]>(() => getCompletedStepsFromStorage());
  const [balance, setBalance] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [escrow, setEscrow] = useState<number>(0);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isProfileDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileDropdownOpen]);
  const [showWalletTopUp, setShowWalletTopUp] = useState(false);

  const navigate = useNavigate();

  const fetchNavbarBalances = useCallback(async () => {
    const compId = Cookies.get('companyId');
    if (!compId) return;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';
    try {
      const [walletRes, minutesRes, phoneRes] = await Promise.all([
        fetch(`${apiBaseUrl}/wallet-company/${compId}`).catch(() => null),
        fetch(`${apiBaseUrl}/minutes-company/${compId}`).catch(() => null),
        fetch(`${apiBaseUrl}/phone-numbers`).catch(() => null),
      ]);

      if (walletRes?.ok) {
        const walletJson = await walletRes.json();
        if (walletJson.success && walletJson.data) {
          setBalance(Number(walletJson.data.balance) || 0);
        }
      }

      if (minutesRes?.ok) {
        const minutesJson = await minutesRes.json();
        // API returns { success, data: { minutes } } — same as MinutesCompanyPanel
        const mins = minutesJson?.data?.minutes ?? minutesJson?.minutes;
        if (typeof mins === 'number') {
          setMinutes(mins);
        }
      }

      if (phoneRes?.ok) {
        const phoneData = await phoneRes.json();
        if (Array.isArray(phoneData)) {
          setEscrow(phoneData.filter((n: any) => n.companyId === compId).length);
        }
      }
    } catch (err) {
      console.error('Failed to fetch navbar balances:', err);
    }
  }, []);

  useEffect(() => {
    // Delay so the page's own data fetches get priority on first render
    const initTimer = setTimeout(() => fetchNavbarBalances(), 1200);

    // Also fetch when the company-ready event fires (cookie just set by auth flow)
    const handleCompanyReady = () => setTimeout(() => fetchNavbarBalances(), 300);
    window.addEventListener('harx:company-ready', handleCompanyReady);

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

    // Live wallet updates: when a call/sale is validated server-side (after AI
    // analysis reconcile), the backend broadcasts over WebSocket so we refresh
    // the company balance without a manual reload.
    const disposeEscrowSocket = connectEscrowSocket(
      () => {
        void refreshAndBroadcastWalletBalance();
      },
      {
        onEvent: (data) => {
          handleCallAnalysisHelpMessage(data);
        },
      }
    );

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('harx:company-ready', handleCompanyReady);
      window.removeEventListener('balanceUpdated', handleBalanceUpdateEvent);
      window.removeEventListener('userProfileUpdated', handleUserProfileUpdated);
      disposeEscrowSocket();
    };
  }, [fetchNavbarBalances]);

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
      const stillLoggedIn = Boolean(resolveSessionUserId());
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

    // 3. Auth Check & Setup — cookie may be missing while token/localStorage still hold the session.
    const userId = resolveSessionUserId();
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
                // Signal that companyId is now available so navbar balances can load
                window.dispatchEvent(new CustomEvent('harx:company-ready'));
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
        }
      }
    };

    fetchData();
  }, [location.pathname, isZohoCallback, isZohoAuth]);

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
          description: event.detail.description,
          ...(event.detail.steps ? { steps: event.detail.steps } : {}),
        });
      } else {
        setCurrentStepGuide(null);
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
    window.addEventListener('openComporchestrator', openComporchestrator);
    window.addEventListener('openCompanyDashboard', openCompanyDashboard);

    return () => {
      window.removeEventListener('tabChange', handleTabChange as EventListener);
      window.removeEventListener('stepGuideUpdate', handleStepGuideUpdate as EventListener);
      window.removeEventListener('openComporchestrator', openComporchestrator);
      window.removeEventListener('openCompanyDashboard', openCompanyDashboard);
    };
  }, [location.pathname, isZohoCallback, isZohoAuth, navigate, markGuideComplete]);

  useEffect(() => {
    const onNavigateOpenCall = (event: Event) => {
      const detail = (event as CustomEvent<OpenCallDetailsDetail>).detail;
      if (!detail?.callId) return;

      const isOnCallsPage = location.pathname === '/dashboard/calls';

      if (isOnCallsPage) {
        dispatchOpenCallDetails(detail.callId, detail.tab || 'insights');
        return;
      }

      sessionStorage.setItem(
        'harx:pendingCallOpen',
        JSON.stringify({ callId: detail.callId, tab: detail.tab || 'insights' })
      );
      setActiveProject('dashboard');
      navigate('/dashboard/calls');
    };

    window.addEventListener(NAVIGATE_OPEN_CALL_EVENT, onNavigateOpenCall);
    return () => window.removeEventListener(NAVIGATE_OPEN_CALL_EVENT, onNavigateOpenCall);
  }, [navigate, location.pathname]);

  // Stable listeners — never torn down on navigation changes.
  useEffect(() => {
    const handleStepStatusesUpdate = (e: CustomEvent) => {
      if (e.detail && typeof e.detail === 'object') {
        setOrchestratorStepStatuses(e.detail);
      }
    };
    const handleKbContentStatus = (e: CustomEvent) => {
      setKbHasContent(!!e.detail?.hasContent);
    };
    // When CompanyOnboarding is not mounted (user is on a standalone tab like
    // script-generator), stepStatusesUpdate is never dispatched. Listen directly
    // to stepCompleted so we can update orchestratorStepStatuses immediately.
    const handleStepCompleted = (e: CustomEvent) => {
      const stepId = e.detail?.stepId;
      if (typeof stepId === 'number') {
        setOrchestratorStepStatuses((prev) => ({ ...prev, [stepId]: 'completed' }));
      }
    };
    window.addEventListener('stepStatusesUpdate', handleStepStatusesUpdate as EventListener);
    window.addEventListener('kbContentStatus', handleKbContentStatus as EventListener);
    window.addEventListener('stepCompleted', handleStepCompleted as EventListener);
    return () => {
      window.removeEventListener('stepStatusesUpdate', handleStepStatusesUpdate as EventListener);
      window.removeEventListener('kbContentStatus', handleKbContentStatus as EventListener);
      window.removeEventListener('stepCompleted', handleStepCompleted as EventListener);
    };
  }, []);

  // Seed orchestratorStepStatuses from the API on mount so that tabs like
  // approval-publishing show the "Next Step" button immediately after a refresh.
  useEffect(() => {
    const companyId = Cookies.get('companyId');
    if (!companyId) return;
    const apiUrl =
      (import.meta as any).env?.VITE_COMPANY_API_URL ||
      'https://v25searchcompanywizardbackend-production.up.railway.app/api';
    fetch(`${apiUrl}/onboarding/companies/${companyId}/onboarding`)
      .then((r) => r.json())
      .then((data) => {
        if (!data?.phases) return;
        const statuses: Record<number, string> = {};
        for (const phase of data.phases as Array<{ steps: Array<{ id: number; status: string }> }>) {
          for (const step of phase.steps) {
            statuses[step.id] = step.status;
          }
        }
        setOrchestratorStepStatuses(statuses);
      })
      .catch(() => {});
  }, []);

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
    // Welcome modal rule: shown ONCE on first orchestrator visit, never again.
    // Onboarding progress (started / in-progress / completed) has NO effect on
    // this decision — the only source of truth is `shouldShowGuide`, which is
    // driven by the localStorage "seen" flag in `useOrchestratorGuide`.
    if (activeProject !== 'comporchestrator') {
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
    setShowGuideModal(false);
  }, [activeProject, shouldShowGuide, isZohoCallback, isZohoAuth, showUpgradeModal]);

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

  // The user "enters" the Activation phase only once they have actually
  // completed at least one activation step (subscription, gig activation,
  // or REP matching). Reaching the Subscription Plan page alone is NOT
  // enough — the wallet & upgrade widgets must stay hidden while the user
  // is still choosing/comparing plans.
  const hasReachedActivationPhase = React.useMemo(
    () => ACTIVATION_PHASE_STEP_IDS.some((id) => completedStepIds.includes(id)),
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

    // Preserve "one-time UX" flags across logout so the orchestrator welcome
    // modal (and similar onboarding hints) never re-appear once the user has
    // dismissed them — even after sign-out / sign-in cycles on the same
    // browser. Wiping localStorage indiscriminately was the reason the modal
    // kept showing on every reconnect.
    const preservedKeys = [
      'orchestratorGuideCompleted',
      'orchestratorGuideSeen',
      'hasSeenImportChoiceModal',
    ];
    const preserved: Record<string, string> = {};
    preservedKeys.forEach((k) => {
      const v = localStorage.getItem(k);
      if (v !== null) preserved[k] = v;
    });

    localStorage.clear();
    sessionStorage.clear();

    Object.entries(preserved).forEach(([k, v]) => {
      try { localStorage.setItem(k, v); } catch { /* ignore quota */ }
    });

    window.location.replace('/auth/signin');
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
              companyStats={{ gigs: 8, calls: 142, gigsEnrolled: 12, activeLeads: 45, agentsEnrolled: 0, conversionRate: 0 }}
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
        {/* Mobile backdrop: closes the off-canvas sidebar when tapped. */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Unified Master Sidebar.
            On md+ it's part of the flex flow; below md it becomes an
            off-canvas drawer toggled by the navbar hamburger. */}
        <div
          className={`md:shrink-0 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[60] max-md:transition-transform max-md:duration-300 ${
            mobileSidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
          }`}
        >
          <MasterSidebar
            isCollapsed={isCollapsed}
            onToggle={() => setIsCollapsed(!isCollapsed)}
            activeProject={activeProject}
            setActiveProject={setActiveProject}
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              setMobileSidebarOpen(false);
            }}
            onLogout={handleLogout}
            currentStepGuide={currentStepGuide}
          />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden relative bg-black">
          {/* Top Navigation / Navbar */}
          <header className={`bg-black h-16 flex items-center shrink-0 px-5 relative z-20 ${activeProject === 'dashboard' ? 'shadow-sm' : ''}`}>
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Mobile-only hamburger to open the sidebar drawer. */}
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="md:hidden flex items-center justify-center h-10 w-10 rounded-xl text-white bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                  aria-label="Open menu"
                >
                  <Menu size={20} />
                </button>
                {/* The legacy "Back to onboarding" pill that used to live here
                    has been moved out of the navbar. We now show a floating
                    "Next step · Back to onboarding" button at the bottom-right
                    of every orchestrator step page — see the
                    <NextStepFloatingButton /> right above the closing tags of
                    this component. */}
              </div>

              {/* Credits, Balance, and Upgrade Widgets */}
              <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-1.5">
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

                {/* Minutes widget — hidden inside the orchestrator: minutes
                    only become relevant once gigs are activated, and the
                    onboarding flow already exposes the wallet for any
                    pre-flight top-up. */}
                {showActivationNavbarWidgets && activeProject !== 'comporchestrator' && (
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

                {/* Upgrade Button — only shown outside the orchestrator. The
                    Subscription Plan is itself one of the orchestrator steps,
                    so surfacing the Upgrade CTA while the user is still
                    inside that flow would be redundant. */}
                {showActivationNavbarWidgets && activeProject !== 'comporchestrator' && (
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
                <div className="relative" ref={profileDropdownRef}>
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
                        <span className="font-bold">{t('userMenu.profile')}</span>
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
                        <span className="font-bold">{t('userMenu.settings')}</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-3 w-full p-4 text-left text-sm text-rose-400 hover:bg-white/5 transition-colors"
                      >
                        <LogOut size={16} className="text-rose-400" />
                        <span className="font-bold">{t('userMenu.logout')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden relative w-full h-full bg-white shadow-2xl shadow-black/5">
            <ProjectViewSwitch
              activeView={activeProject}
              dashboard={<DashboardApp />}
              comporchestrator={
                <div className="relative h-full px-4 py-3 pb-32">
                  {renderContent()}
                  {activeTab !== 'company-onboarding' &&
                    ORCHESTRATOR_STEP_TABS.has(activeTab) &&
                    (orchestratorStepStatuses[TAB_ONBOARDING_STEPS[activeTab]?.stepId] === 'completed' ||
                      (activeTab === 'knowledge-base' && kbHasContent)) && (
                      <OnboardingNextStepButton onClick={goToCompanyOnboardingTab} />
                    )}
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

      {/* ── Planning edge tab + slide-over panel (portal, always on top) ── */}
      {!location.pathname.includes('/orchestrator') && !window.location.hash.includes('orchestrator') && createPortal(
        <>
          {/* Edge tab handle — hidden while panel is open */}
          <button
            type="button"
            onClick={() => setShowPlanningPanel(v => !v)}
            aria-label={t('navbar.planning')}
            style={{ top: '50%', transform: 'translateY(-50%)' }}
            className={`fixed right-0 z-[9990] group overflow-hidden rounded-l-2xl bg-gradient-to-b from-violet-600 to-indigo-700 text-white shadow-[0_4px_24px_rgba(139,92,246,0.5)] hover:shadow-[0_8px_40px_rgba(139,92,246,0.7)] transition-all duration-500 ease-in-out w-10 hover:w-32 h-32 ${showPlanningPanel ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            {/* Collapsed content: [icon + text] as one row rotated — fades out on hover */}
            <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 group-hover:opacity-0">
              <div
                className="flex flex-row items-center gap-1.5 whitespace-nowrap"
                style={{ transform: 'rotate(-90deg)' }}
              >
                <CalendarDays size={14} className="shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {t('navbar.planning')}
                </span>
              </div>
            </div>
            {/* Expanded square content: icon box + horizontal text — fades in on hover */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200 px-2">
              <div className="w-10 h-10 rounded-xl bg-white/25 flex items-center justify-center shadow-inner">
                <CalendarDays size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">
                {t('navbar.planning')}
              </span>
            </div>
          </button>

          {/* Backdrop — only when not maximized */}
          {showPlanningPanel && !maximizedPlanning && (
            <div
              className="fixed inset-0 z-[9991] bg-black/40 backdrop-blur-sm"
              onClick={() => setShowPlanningPanel(false)}
            />
          )}

          {/* Slide-over panel */}
          <div
            className={`fixed right-0 z-[9992] bg-white shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${
              showPlanningPanel ? 'translate-x-0' : 'translate-x-full'
            } ${
              maximizedPlanning
                ? `top-16 bottom-0 ${isCollapsed ? 'left-20' : 'left-64'} w-auto`
                : 'top-0 bottom-0 w-full max-w-4xl'
            }`}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-indigo-700 shrink-0">
              <div className="flex items-center gap-3 text-white">
                <CalendarDays size={20} />
                <span className="text-base font-black uppercase tracking-wide">{t('navbar.planning')}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Maximize / Minimize */}
                <button
                  type="button"
                  onClick={() => setMaximizedPlanning(v => !v)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title={maximizedPlanning ? 'Réduire' : 'Plein écran'}
                >
                  {maximizedPlanning ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPlanningPanel(false); setMaximizedPlanning(false); }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Panel body — scrollable */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {showPlanningPanel && <SessionPlanning hideHeader />}
            </div>
          </div>
        </>,
        document.body
      )}

    </StripeContainer>
  );
}

function App() {
  return (
    <AuthProvider>
      <Provider store={store}>
        <HashRouter>
          <VisitorTracker />
          <AppContent />
        </HashRouter>
      </Provider>
    </AuthProvider>
  );
}

export default App;
