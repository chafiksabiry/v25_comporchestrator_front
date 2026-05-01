import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Phone,
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
  Info
} from 'lucide-react';
import { getHiddenSections } from '../dashboard/config/sections';
import Cookies from 'js-cookie';
import { useAuth } from '../dashboard/contexts/AuthContext';
import type { ProjectView } from '../../App';

interface MasterSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activeProject: ProjectView;
  setActiveProject: (v: ProjectView) => void;
  activeTab: string;
  setActiveTab: (t: string) => void;
  onLogout: () => void;
  currentStepGuide?: { title: string; description: string } | null;
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

  const hiddenSections = getHiddenSections();

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
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard/main', key: 'premium-dashboard', alwaysShow: true },
    { icon: <TrendingUp size={20} />, label: 'Overview', path: '/dashboard/overview', key: 'overview', alwaysShow: true },
    {
      icon: <Building2 size={20} />,
      label: 'Company',
      path: '/dashboard/profile',
      key: 'company',
      alwaysShow: true,
    },
    { icon: <Briefcase size={20} />, label: 'Gigs', path: '/dashboard/gigs', key: 'gigs', requiresGigs: true },
    { icon: <UserPlus size={20} />, label: 'Leads', path: '/dashboard/leads', key: 'leads', requiresLeads: true },
    { icon: <Users size={20} />, label: 'Rep Matching', path: '/dashboard/rep-matching', key: 'rep-matching', requiresRepMatching: true },
    { icon: <Calendar size={20} />, label: 'Scheduler', path: '/dashboard/scheduler', key: 'scheduler', requiresRepMatching: true },
    { icon: <Mail size={20} />, label: 'Emails', path: '/dashboard/emails', key: 'emails', requiresRepMatching: true },
    { icon: <MessageSquare size={20} />, label: 'Live Chat', path: '/dashboard/chat', key: 'live-chat', requiresRepMatching: true },
    { icon: <ClipboardCheck size={20} />, label: 'Quality Assurance', path: '/dashboard/quality-assurance', key: 'quality-assurance', requiresRepMatching: true },
    { icon: <ScrollText size={20} />, label: 'Operations', path: '/dashboard/operations', key: 'operations', requiresRepMatching: true },
    { icon: <TrendingUp size={20} />, label: 'Analytics', path: '/dashboard/analytics', key: 'analytics', requiresRepMatching: true },
    { icon: <Plug size={20} />, label: 'Integrations', path: '/dashboard/integrations', key: 'integrations', alwaysShow: true },
  ];

  const orchestratorItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', key: 'dashboard' },
    { icon: <Building2 size={20} />, label: 'Company Onboarding', key: 'company-onboarding' },
  ];

  const filteredDashboardItems = dashboardItems.filter(item => {
    if (hiddenSections.includes(item.key)) return false;
    if (item.alwaysShow) return true;
    if ((item as any).requiresGigs && !hasGigs) return false;
    if ((item as any).requiresLeads && !hasLeads) return false;
    if ((item as any).requiresRepMatching && !hasRepMatching) return false;
    if ((item as any).requiresCompany && !hasCompany) return false;
    return true;
  });

  const handleLinkClick = (key: string) => {
    setActiveTab(key);
  };

  const handleLogoutMaster = () => {
    logout();
    onLogout();
  };

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} shrink-0 bg-black h-screen relative text-white flex flex-col shadow-2xl z-50 overflow-x-hidden transition-all duration-300`}>
      {/* Sidebar Header */}
      <div className={`flex items-center relative group cursor-pointer transition-all duration-300 ${isCollapsed ? 'px-4 justify-center mt-8 mb-10' : activeProject === 'comporchestrator' ? 'px-0 mt-4 mb-6' : 'px-8 mt-8 mb-10 gap-3'}`}>
        {activeProject === 'comporchestrator' ? (
          <div className={`flex items-center justify-center w-full overflow-hidden`}>
            <img 
              src={`${import.meta.env.BASE_URL || '/'}logo-black.png`} 
              alt="HARX Orchestrator" 
              className={`object-contain transition-all duration-300 ${isCollapsed ? 'w-10' : 'w-full scale-110'}`}
            />
          </div>
        ) : (
          <>
            <div className="p-2.5 bg-gradient-to-br from-orange-400 to-rose-500 rounded-xl shadow-lg shadow-rose-500/20 group-hover:scale-110 transition-transform duration-300 shrink-0">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] font-black text-rose-500 tracking-[0.2em] uppercase italic leading-none mb-1">HARX</span>
                <span className="text-xl font-black tracking-tighter text-white leading-none whitespace-nowrap">Dashboard</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-1 transition-all duration-300 ${isCollapsed ? 'px-3' : 'px-4'}`}>
        <nav className="space-y-1.5">
          {activeProject === 'comporchestrator' ? (
            <>
              {orchestratorItems.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleLinkClick(item.key)}
                    className={`flex items-center gap-4 w-full p-3.5 rounded-2xl transition-all duration-300 relative group overflow-hidden ${isActive
                        ? "bg-gradient-to-r from-orange-400 to-rose-500 text-white shadow-lg shadow-rose-500/30 scale-[1.02] z-10"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                  >
                    <div className="shrink-0 group-hover:scale-110 transition-transform duration-300">
                      {item.icon}
                    </div>
                    {!isCollapsed && (
                      <span className="font-medium whitespace-nowrap overflow-hidden text-sm transition-all duration-300">{item.label}</span>
                    )}
                    {isCollapsed && (
                      <div className="absolute left-16 bg-slate-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}

            </>
          ) : (
            <>
              {filteredDashboardItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.path}
                  end={item.key === 'overview'}
                  className={({ isActive }) => {
                    // Manual override for specific prefix rules if they exist
                    const prefix = (item as { activePathPrefix?: string }).activePathPrefix;
                    const isReallyActive = isActive || (prefix && location.pathname.startsWith(prefix));

                    return `flex items-center gap-4 w-full p-3.5 rounded-2xl transition-all duration-300 relative group overflow-hidden ${isReallyActive
                      ? "bg-gradient-to-r from-orange-400 to-rose-500 text-white shadow-lg shadow-rose-500/30 scale-[1.02] z-10"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`;
                  }}
                >
                  <div className="shrink-0 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  {!isCollapsed && (
                    <span className="font-medium whitespace-nowrap overflow-hidden text-sm transition-all duration-300">{item.label}</span>
                  )}
                  {isCollapsed && (
                    <div className="absolute left-16 bg-slate-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                      {item.label}
                    </div>
                  )}
                </NavLink>
              ))}

              {hasKb && (
                <NavLink
                  to="/dashboard/knowledge-base"
                  className={({ isActive }) =>
                    `flex items-center gap-4 w-full p-3.5 rounded-2xl transition-all duration-300 relative group overflow-hidden ${isActive
                      ? "bg-gradient-to-r from-orange-400 to-rose-500 text-white shadow-lg shadow-rose-500/30 scale-[1.02] z-10"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  <div className="shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Book size={20} />
                  </div>
                  {!isCollapsed && <span className="font-medium text-sm transition-all duration-300">Knowledge Base</span>}
                  {isCollapsed && (
                    <div className="absolute left-16 bg-slate-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                      Knowledge Base
                    </div>
                  )}
                </NavLink>
              )}

              <div className="my-2 border-t border-white/10 pt-2" />
              <button
                onClick={() => setActiveProject('comporchestrator')}
                className={`flex items-center gap-4 w-full p-3.5 rounded-2xl transition-all duration-300 relative group overflow-hidden text-slate-400 hover:text-white hover:bg-white/5`}
              >
                <div className="shrink-0 group-hover:scale-110 transition-transform duration-300 bg-white/5 p-1 rounded-lg">
                  <Building2 size={16} />
                </div>
                {!isCollapsed && (
                  <span className="font-medium whitespace-nowrap overflow-hidden text-sm transition-all duration-300">Go to Orchestrator</span>
                )}
                {isCollapsed && (
                  <div className="absolute left-16 bg-slate-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                    Go to Orchestrator
                  </div>
                )}
              </button>
            </>
          )}

          {!isCollapsed && activeProject === 'comporchestrator' && (
            <div className="mt-8 flex flex-col items-center shrink-0">
              <div className="relative group">
                <div className="absolute -inset-4 bg-rose-500/20 rounded-full blur-2xl group-hover:bg-rose-500/30 transition-all duration-700" />
                <img
                  src={`${import.meta.env.BASE_URL || '/'}mascotte2.png`}
                  alt="HARX Mascotte"
                  className="w-40 h-40 object-contain drop-shadow-[0_0_20px_rgba(255,77,77,0.3)] relative z-10 transition-transform duration-500 group-hover:scale-105 animate-float"
                />
              </div>

              {currentStepGuide && (
                <div className="px-2 animate-fade-in-up shrink-0 mt-6 w-full">
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 shadow-inner">
                    <div className="flex items-center gap-2 mb-2 text-rose-400">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Active Guide</span>
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">{currentStepGuide.title}</h4>
                    <p className="text-[10px] text-gray-400 leading-relaxed italic line-clamp-3">
                      {currentStepGuide.description}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-[9px] text-rose-500/80 font-bold uppercase tracking-tighter">
                      <Info className="h-3 w-3" />
                      <span>Interactive Step</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className={`mt-auto pt-6 border-t border-white/5 transition-all duration-300 ${isCollapsed ? 'px-3' : 'px-4 pb-8'}`}>
        <button
          onClick={handleLogoutMaster}
          className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all duration-300 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 group relative ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className="p-2 bg-rose-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300 shrink-0">
            <LogOut size={18} />
          </div>
          {!isCollapsed && <span className="font-bold text-sm tracking-tight">Logout</span>}

          {isCollapsed && (
            <div className="absolute left-16 bg-rose-500 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
              Logout
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

export default MasterSidebar;
