import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Phone,
  PhoneCall,
  Bot,
  Mail,
  MessageSquare,
  TrendingUp,
  Plug,
  Briefcase,
  ClipboardCheck,
  ScrollText,
  UserPlus,
  Building2,
  Calendar,
  Book,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  LogOut,
  BarChart2,
  Sparkles,
  Info,
  Wallet,
  BookOpen,
  Clock
} from 'lucide-react';
import { getHiddenSections } from '../dashboard/config/sections';
import Cookies from 'js-cookie';
import { useAuth } from '../dashboard/contexts/AuthContext';
import type { ProjectView } from '../ProjectViewSwitch';
import { useTranslation } from 'react-i18next';
import { goToCompanyOnboardingTab } from '../../hooks/useOnboardingGlobalBack';
import { isCallCenterWorkspace } from '../../utils/callCenterWorkspace';

interface MasterSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activeProject: ProjectView;
  setActiveProject: (v: ProjectView) => void;
  activeTab: string;
  setActiveTab: (t: string) => void;
  onLogout: () => void;
  currentStepGuide?: { title: string; description: string; steps?: string[] } | null;
}

export function MasterSidebar({
  isCollapsed,
  onToggle,
  activeProject,
  setActiveProject,
  activeTab,
  setActiveTab,
  onLogout,
  currentStepGuide
}: MasterSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);
  const [hasGigs, setHasGigs] = useState(false);
  const [hasLeads, setHasLeads] = useState(false);
  const [hasKb, setHasKb] = useState(false);
  const [hasRepMatching, setHasRepMatching] = useState(false);
  const [openGroups, setOpenGroups] = useState<number[]>([1, 2, 3]); // All open by default
  const { t } = useTranslation();
  const isCallCenter = isCallCenterWorkspace();

  const hiddenSections = getHiddenSections();

  const toggleGroup = (groupId: number) => {
    setOpenGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const userId = Cookies.get('userId');
      if (!userId) return;

      try {
        const companyRes = await fetch(`${import.meta.env.VITE_COMPANY_API_URL}/companies/user/${userId}`);
        if (companyRes.ok) {
          const companyData = await companyRes.json();
          const companyExists = companyData.success && companyData.data;
          setHasCompany(companyExists);

          if (companyExists && companyData.data._id) {
            try {
              const progressRes = await fetch(`${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyData.data._id}/onboarding`);

              let stepGigs = false;
              let stepLeads = false;
              let stepKb = false;
              let stepRepMatching = false;
              let payload: any = null;

              if (progressRes.ok) {
                const progressData = await progressRes.json();
                payload = progressData.data ? progressData.data : progressData;

                if (payload && Array.isArray(payload.completedSteps)) {
                  if (payload.completedSteps.includes(3)) stepGigs = true;
                  if (payload.completedSteps.includes(5)) stepLeads = true;
                  if (payload.completedSteps.includes(8) || payload.completedSteps.includes(9)) stepKb = true;
                  if (payload.completedSteps.includes(13)) stepRepMatching = true;
                }
              }

              setHasGigs(stepGigs || Cookies.get('createGigStepCompleted') === 'true');
              setHasLeads(stepLeads);
              setHasKb(stepKb);
              setHasRepMatching(stepRepMatching);

            } catch (err) {
              setHasGigs(false);
              setHasLeads(false);
              setHasKb(false);
              setHasRepMatching(false);
            }
          }
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      }
    };

    checkOnboardingStatus();
  }, [location.pathname, activeProject]);

  const dashboardItems = [
    // Group 1
    { icon: <LayoutDashboard size={20} />, label: t('sidebar.dashboard'), path: '/dashboard/main', key: 'premium-dashboard', alwaysShow: true, groupId: 1 },

    // Group 2
    { icon: <Phone size={20} />, label: t('sidebar.calls'), path: '/dashboard/calls', key: 'calls', alwaysShow: true, groupId: 2 },
    { icon: <Bot size={20} />, label: t('sidebar.voiceAssistant', 'Assistant vocal'), path: '/dashboard/voice-assistant', key: 'voice-assistant', alwaysShow: true, groupId: 2 },
    { icon: <UserPlus size={20} />, label: t('sidebar.leads'), path: '/dashboard/leads', key: 'leads', requiresLeads: true, groupId: 2 },
    { icon: <Users size={20} />, label: t('sidebar.repMatching'), path: '/dashboard/rep-matching', key: 'rep-matching', requiresRepMatching: true, groupId: 2 },
    { icon: <BookOpen size={20} />, label: t('sidebar.training'), path: '/dashboard/training', key: 'training', alwaysShow: true, groupId: 2 },
    { icon: <Calendar size={20} />, label: t('sidebar.scheduler'), path: '/dashboard/scheduler', key: 'scheduler', requiresRepMatching: true, groupId: 2 },
    { icon: <Mail size={20} />, label: t('sidebar.emails'), path: '/dashboard/emails', key: 'emails', requiresRepMatching: true, groupId: 2 },
    { icon: <MessageSquare size={20} />, label: t('sidebar.liveChat'), path: '/dashboard/chat', key: 'live-chat', requiresRepMatching: true, groupId: 2 },

    // Group 3
    { icon: <Briefcase size={20} />, label: 'Gigs', path: '/dashboard/gigs', key: 'gigs', requiresGigs: true, groupId: 3 },
    { icon: <ScrollText size={20} />, label: t('sidebar.scriptGenerator'), path: '/dashboard/script-generator', key: 'script-generator', alwaysShow: true, groupId: 3 },
    { icon: <Book size={20} />, label: t('sidebar.knowledgeBase'), path: '/dashboard/knowledge-base', key: 'knowledge-base', alwaysShow: true, groupId: 3 },
    { icon: <PhoneCall size={20} />, label: t('sidebar.telephony', 'Telephony'), path: '/dashboard/telephony', key: 'telephony', alwaysShow: true, groupId: 3 },
    { icon: <Plug size={20} />, label: 'Gig Activation', path: '/dashboard/gig-activation', key: 'integrations', alwaysShow: true, groupId: 3 },
    { icon: <ClipboardCheck size={20} />, label: t('sidebar.qualityAssurance'), path: '/dashboard/quality-assurance', key: 'quality-assurance', requiresRepMatching: true, groupId: 3 },
    { icon: <ScrollText size={20} />, label: t('sidebar.operations'), path: '/dashboard/operations', key: 'operations', requiresRepMatching: true, groupId: 3 },
    { icon: <TrendingUp size={20} />, label: t('sidebar.analytics'), path: '/dashboard/analytics', key: 'analytics', requiresRepMatching: true, groupId: 3 },
  ];

  const orchestratorItems = [
    { icon: <Building2 size={20} />, label: t('sidebar.companyOnboarding'), key: 'company-onboarding' },
  ];

  const filteredDashboardItems = dashboardItems.filter(item => {
    if (hiddenSections.includes(item.key)) return false;
    // Call-center: same dashboard, but nav is not gated by mandatory onboarding steps.
    if (isCallCenter) return true;
    if (item.alwaysShow) return true;
    if ((item as any).requiresGigs && !hasGigs) return false;
    if ((item as any).requiresLeads && !hasLeads) return false;
    if ((item as any).requiresRepMatching && !hasRepMatching) return false;
    if ((item as any).requiresCompany && !hasCompany) return false;
    return true;
  });

  const groups = [
    { id: 1, label: 'Dashboard' },
    { id: 2, label: 'Opérations' },
    { id: 3, label: 'Orchestrator' }
  ];

  const groupedItems = groups.map(group => ({
    ...group,
    items: filteredDashboardItems.filter(item => item.groupId === group.id)
  })).filter(g => g.items.length > 0);

  const handleLinkClick = (key: string) => {
    setActiveTab(key);
  };

  const handleLogoutMaster = () => {
    logout();
    onLogout();
  };

  const navActive = (active: boolean) =>
    isCallCenter
      ? active
        ? 'bg-emerald-50 text-emerald-800 border-l-[3px] border-emerald-500 rounded-r-lg rounded-l-none'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg'
      : active
        ? 'bg-gradient-harx text-white z-10 rounded-xl'
        : 'text-slate-400 hover:text-white hover:bg-white/5 rounded-xl';

  return (
    <div
      className={`${isCollapsed ? 'w-20' : 'w-60'} shrink-0 h-screen relative flex flex-col z-50 overflow-x-hidden transition-all duration-300 ${
        isCallCenter
          ? 'ops-console-sidebar bg-slate-50 border-r border-slate-200 text-slate-800'
          : 'bg-harx-sidebar text-white'
      }`}
    >
      {/* Sidebar Header */}
      <div className={`flex items-center relative group cursor-pointer transition-all duration-300 ${isCollapsed ? 'px-4 justify-center mt-8 mb-10' : 'px-0 mt-4 mb-6'}`}>
        {activeProject === 'comporchestrator' ? (
          <div className={`flex items-center justify-center w-full overflow-hidden`}>
            <img
              src={`${import.meta.env.BASE_URL || '/'}logo-black.png`}
              alt="HARX Orchestrator"
              className={`object-contain transition-all duration-300 ${isCollapsed ? 'w-10' : 'w-full scale-110'}`}
            />
          </div>
        ) : (
          <div className={`flex items-center justify-center w-full overflow-hidden`}>
            <img
              src={`${import.meta.env.BASE_URL || '/'}logo-black.png`}
              alt="HARX Dashboard"
              className={`object-contain transition-all duration-300 ${isCollapsed ? 'w-10' : 'w-full scale-110'}`}
            />
          </div>
        )}
      </div>

      {isCallCenter && !isCollapsed ? (
        <div className="px-4 -mt-2 mb-4">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-white">
            <PhoneCall className="w-3.5 h-3.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/90">
                {t('sidebar.callCenterBadge', 'Call Center')}
              </p>
              <p className="text-[10px] font-semibold text-white/90 truncate">
                {t('sidebar.callCenterOps', 'Operations console')}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Navigation */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden pr-1 transition-all duration-300 ${
          isCollapsed ? 'px-3' : 'px-3'
        } ${
          isCallCenter
            ? 'scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent'
            : 'scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent'
        }`}
      >
        <nav className="space-y-1">
          {activeProject === 'comporchestrator' ? (
            <>
              {orchestratorItems.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActiveTab(item.key);
                      goToCompanyOnboardingTab();
                    }}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 transition-all duration-200 relative group overflow-hidden ${navActive(isActive)}`}
                  >
                    <div className="shrink-0">{item.icon}</div>
                    {!isCollapsed && (
                      <span className="font-semibold whitespace-nowrap overflow-hidden text-[13px]">{item.label}</span>
                    )}
                    {isCollapsed && (
                      <div className={`absolute left-16 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border ${
                        isCallCenter
                          ? 'bg-white text-slate-800 border-slate-200 shadow-sm'
                          : 'bg-slate-900 text-white border-white/10 shadow-xl'
                      }`}>
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}

            </>
          ) : (
            <>
              {groupedItems.map((group, index) => {
                const isOpen = openGroups.includes(group.id);
                return (
                  <div
                    key={group.id}
                    className={`${index > 0 ? `mt-5 pt-3 border-t ${isCallCenter ? 'border-slate-200' : 'border-white/5'}` : ''} mb-3`}
                  >
                    {!isCollapsed && (
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className={`flex items-center justify-between w-full text-[10px] font-semibold uppercase tracking-[0.18em] mb-2 px-3 transition-colors group ${
                          isCallCenter
                            ? 'text-slate-400 hover:text-slate-700'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span>{group.label}</span>
                        {(group.id === 2 || group.id === 3) && (
                          <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                            <ChevronDown
                              size={14}
                              className={isCallCenter ? 'text-slate-400' : 'text-slate-400 group-hover:text-white'}
                            />
                          </div>
                        )}
                      </button>
                    )}
                    <div className={`grid transition-all duration-300 ${(isOpen || isCollapsed || group.id === 1) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden space-y-0.5">
                        {group.items.map((item) => (
                          <NavLink
                            key={item.label}
                            to={item.path}
                            end={item.key === 'overview'}
                            className={({ isActive }) => {
                              const prefix = (item as { activePathPrefix?: string }).activePathPrefix;
                              const isReallyActive = isActive || (prefix && location.pathname.startsWith(prefix));
                              return `flex items-center gap-3 w-full px-3 py-2.5 transition-all duration-200 relative group overflow-hidden ${navActive(!!isReallyActive)}`;
                            }}
                          >
                            <div className="shrink-0">{item.icon}</div>
                            {!isCollapsed && (
                              <span className="font-semibold whitespace-nowrap overflow-hidden text-[13px]">{item.label}</span>
                            )}
                            {isCollapsed && (
                              <div className={`absolute left-16 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border ${
                                isCallCenter
                                  ? 'bg-white text-slate-800 border-slate-200 shadow-sm'
                                  : 'bg-slate-900 text-white border-white/10 shadow-xl'
                              }`}>
                                {item.label}
                              </div>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {!isCollapsed && activeProject === 'comporchestrator' && (
            <div className="mt-8 flex flex-col items-center shrink-0">
              <div className="relative group">
                {!isCallCenter && (
                  <div className="absolute -inset-4 bg-rose-500/20 rounded-full blur-2xl group-hover:bg-rose-500/30 transition-all duration-700" />
                )}
                <img
                  src={`${import.meta.env.BASE_URL || '/'}mascotte2.png`}
                  alt="HARX Mascotte"
                  className={`w-36 h-36 object-contain relative z-10 transition-transform duration-500 group-hover:scale-105 ${
                    isCallCenter ? 'opacity-90' : 'drop-shadow-[0_0_20px_rgba(255,77,77,0.3)] animate-float'
                  }`}
                />
              </div>

              {currentStepGuide && (
                <div className="px-2 animate-fade-in-up shrink-0 mt-6 w-full">
                  <div className={`rounded-2xl p-4 shadow-inner ${
                    isCallCenter
                      ? 'bg-white border border-slate-200'
                      : 'bg-white/5 backdrop-blur-sm border border-white/10'
                  }`}>
                    <div className={`flex items-center gap-2 mb-2 ${isCallCenter ? 'text-emerald-600' : 'text-rose-400'}`}>
                      <Sparkles className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t('sidebar.activeGuide')}</span>
                    </div>
                    <h4 className={`text-xs font-bold mb-1 ${isCallCenter ? 'text-slate-900' : 'text-white'}`}>{currentStepGuide.title}</h4>
                    {currentStepGuide.steps && currentStepGuide.steps.length > 0 ? (
                      <ol className="mt-2 space-y-1.5">
                        {currentStepGuide.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className={`shrink-0 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center mt-px ${
                              isCallCenter ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-500/30 text-rose-300'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className={`text-[10px] leading-relaxed ${isCallCenter ? 'text-slate-600' : 'text-gray-300'}`}>{step}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className={`text-[10px] leading-relaxed italic line-clamp-3 ${isCallCenter ? 'text-slate-500' : 'text-gray-400'}`}>
                        {currentStepGuide.description}
                      </p>
                    )}
                    <div className={`mt-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tighter ${
                      isCallCenter ? 'text-emerald-600/80' : 'text-rose-500/80'
                    }`}>
                      <Info className="h-3 w-3" />
                      <span>{t('sidebar.interactiveStep')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>


    </div>
  );
}

export default MasterSidebar;
