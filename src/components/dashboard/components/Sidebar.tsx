import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  BookOpen
} from 'lucide-react';
import { getHiddenSections } from '../config/sections';
import Cookies from 'js-cookie';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { logout } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);
  const [hasGigs, setHasGigs] = useState(false);
  const [hasLeads, setHasLeads] = useState(false);
  const [hasKb, setHasKb] = useState(false);
  const [hasRepMatching, setHasRepMatching] = useState(false);

  // Get hidden sections from configuration
  const hiddenSections = getHiddenSections();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const userId = Cookies.get('userId');
      if (!userId) return;

      try {
        // 1. Check if user has a company
        const companyRes = await fetch(`${import.meta.env.VITE_COMPANY_API_URL}/companies/user/${userId}`);
        if (companyRes.ok) {
          const companyData = await companyRes.json();
          const companyExists = companyData.success && companyData.data;
          setHasCompany(companyExists);

          // 2. If they have a company, check the full onboarding progress
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


                // Handle both direct object form and wrapped { data: { ... } } form
                payload = progressData.data ? progressData.data : progressData;

                if (payload && Array.isArray(payload.completedSteps)) {
                  // Step 3 = Gigs
                  if (payload.completedSteps.includes(3)) stepGigs = true;
                  // Step 5 = Upload Contacts (Leads)
                  if (payload.completedSteps.includes(5)) stepLeads = true;
                  // Step 8, 9, 10 = Knowledge Base phase roughly, step 9 is specifically KB
                  if (payload.completedSteps.includes(8) || payload.completedSteps.includes(9)) stepKb = true;
                  // Step 13 = Match HARX REPS
                  if (payload.completedSteps.includes(13)) stepRepMatching = true;
                }
              }

              // Fallbacks or final setters
              setHasGigs(stepGigs || Cookies.get('createGigStepCompleted') === 'true');
              setHasLeads(stepLeads);
              setHasKb(stepKb);
              setHasRepMatching(stepRepMatching);

            } catch (err) {
              console.error("Error checking onboarding progress", err);
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
  }, [location.pathname]); // Re-check when route changes, as they might have just created one

  const allMenuItems = [
    { icon: <Building2 size={20} />, label: 'Dashboard', path: '/company/dashboard', key: 'company', alwaysShow: true, groupId: 1, activePathPrefix: '/company' },
    { icon: <LayoutDashboard size={20} />, label: 'Overview', path: '/', key: 'overview', alwaysShow: true, groupId: 1 },

    // Group 2
    { icon: <Phone size={20} />, label: 'Calls', path: '/dashboard/calls', key: 'calls', requiresRepMatching: true, groupId: 2 },
    { icon: <UserPlus size={20} />, label: 'Prospects', path: '/dashboard/leads', key: 'leads', requiresLeads: true, groupId: 2 },
    { icon: <Users size={20} />, label: 'Rep Matching', path: '/dashboard/rep-matching', key: 'rep-matching', requiresRepMatching: true, groupId: 2 },
    { icon: <BookOpen size={20} />, label: 'E-learning', path: '/dashboard/training', key: 'training', alwaysShow: true, groupId: 2 },

    // Group 3
    { icon: <Briefcase size={20} />, label: 'Gigs', path: '/dashboard/gigs', key: 'gigs', requiresGigs: true, groupId: 3 },
    { icon: <ScrollText size={20} />, label: 'Calls Script', path: '/dashboard/script-generator', key: 'script-generator', requiresRepMatching: true, groupId: 3 },
    { icon: <Book size={20} />, label: 'KB', path: '/dashboard/knowledge-base', key: 'knowledge-base', requiresRepMatching: true, groupId: 3 },
    { icon: <Plug size={20} />, label: 'Gig Activation', path: '/dashboard/integrations', key: 'integrations', alwaysShow: true, groupId: 3 },
  ];

  // Filter out hidden sections and apply onboarding logic
  const menuItems = allMenuItems.filter(item => {
    if (hiddenSections.includes(item.key)) return false;
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
    items: menuItems.filter(item => item.groupId === group.id)
  })).filter(g => g.items.length > 0);

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#020617] h-screen fixed left-0 top-0 text-white flex flex-col border-r border-white/5 backdrop-blur-2xl shadow-2xl z-50 overflow-x-hidden transition-all duration-300`}>
      {/* Background Decorative Gradient */}
      <div className={`absolute top-0 left-0 w-full h-48 bg-gradient-to-br from-rose-500/10 via-transparent to-transparent pointer-events-none transition-opacity duration-300 ${isCollapsed ? 'opacity-50' : 'opacity-100'}`} />

      {/* Toggle Button - Modern Floating Style */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-12 bg-rose-500 text-white rounded-full p-1.5 shadow-lg shadow-rose-500/30 hover:scale-110 active:scale-95 transition-all z-[60]"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Sidebar Header */}
      <div className={`flex items-center gap-3 mt-8 mb-10 relative group cursor-pointer transition-all duration-300 ${isCollapsed ? 'px-6' : 'px-8'}`}>
        <div className="p-2.5 bg-gradient-to-br from-orange-400 to-rose-500 rounded-xl shadow-lg shadow-rose-500/20 group-hover:scale-110 transition-transform duration-300 shrink-0">
          <LayoutDashboard className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent italic whitespace-nowrap overflow-hidden">HARX</span>
        )}
      </div>

      {/* Scrollable Menu with Custom Scrollbar */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-1 transition-all duration-300 ${isCollapsed ? 'px-3' : 'px-4'}`}>
        <nav className="space-y-4">
          {groupedItems.map((group) => (
            <div key={group.id} className="mb-4">
              {!isCollapsed && (
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">
                  {group.label}
                </div>
              )}
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    end={item.key === 'overview'}
                    className={() => {
                      const prefix = (item as { activePathPrefix?: string }).activePathPrefix;
                      const isActive = prefix
                        ? location.pathname === prefix || location.pathname.startsWith(`${prefix}/`)
                        : location.pathname === item.path;
                      return `flex items-center gap-4 w-full p-3.5 rounded-2xl transition-all duration-300 relative group overflow-hidden ${isActive
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
              </div>
            </div>
          ))}
        </nav>
      </div>


    </div>
  );
}

export default Sidebar;
