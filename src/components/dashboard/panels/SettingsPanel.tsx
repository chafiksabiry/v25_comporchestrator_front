import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Phone,
  MessageSquare,
  Users,
  Building2,
  Clock,
  FileText,
  CheckCircle2,
  ChevronDown,
  Rocket,
  BarChart2,
  BookOpen,
  Bell,
  CreditCard
} from 'lucide-react';
import Cookies from 'js-cookie';
import axios from 'axios';

const PHASES = [
  {
    id: 1,
    title: "Company Identity",
    subtitle: "Core Setup",
    icon: Building2,
    color: "#6366f1", // Indigo
    steps: [
      { id: 1, title: "Company Profile", description: "Legal and commercial details", path: "/company/profile" },
      { id: 2, title: "Verification", description: "Identity & Trust", disabled: true }
    ]
  },
  {
    id: 2,
    title: "Operations",
    subtitle: "Framework",
    icon: Settings,
    color: "#f59e0b", // Amber
    steps: [
      { id: 3, title: "Create Gigs", description: "Define requirements", path: "/gigs" },
      { id: 4, title: "Telephony", description: "Voice config", path: "/telnyx-call-test" },
      { id: 5, title: "Contacts", description: "Import leads", path: "/leads" },
      { id: 6, title: "Scripts", description: "Conversation flows" },
      { id: 7, title: "Analytics", description: "KPI preferences", disabled: true }
    ]
  },
  {
    id: 3,
    title: "Engagement",
    subtitle: "Talent",
    icon: Users,
    color: "#10b981", // Emerald
    steps: [
      { id: 8, title: "Knowledge Base", description: "Training & FAQs", path: "/knowledge-base" },
      { id: 9, title: "Onboarding", description: "REP validation" },
      { id: 10, title: "Scheduling", description: "Slot planning" }
    ]
  },
  {
    id: 4,
    title: "Activation",
    subtitle: "Launch",
    icon: Rocket,
    color: "#ef4444", // Red
    steps: [
      { id: 11, title: "Subscription", description: "Plan selection" },
      { id: 12, title: "Market Launch", description: "Gig activation" },
      { id: 13, title: "MATCH HARX REPS", description: "Connect with qualified REPS", path: "/rep-matching" }
    ]
  }
];

function SettingsPanel() {
  const [activeSection, setActiveSection] = useState('roadmap');
  const [onboardingProgress, setOnboardingProgress] = useState<any>(null);
  const [expandedPhases, setExpandedPhases] = useState<number[]>([1, 2]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      const companyId = Cookies.get('companyId');
      if (!companyId) {
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL_COMPANY}/onboarding/companies/${companyId}/onboarding`);
        if (response.data) {
          setOnboardingProgress(response.data.data || response.data);
        }
      } catch (err) {
        console.error("Failed to fetch onboarding progress:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  const menuItems = [
    { id: 'roadmap', label: 'Onboarding Roadmap', icon: Rocket },
    { id: 'profile', label: 'Company Profile', icon: Building2 },
    { id: 'security', label: 'Security & Access', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
  ];

  const togglePhase = (phaseId: number) => {
    setExpandedPhases(prev =>
      prev.includes(phaseId) ? prev.filter(id => id !== phaseId) : [...prev, phaseId]
    );
  };

  const getStepStatus = (stepId: number) => {
    if (!onboardingProgress) return 'pending';
    if (onboardingProgress.completedSteps?.includes(stepId)) return 'completed';
    const currentPhase = onboardingProgress.currentPhase || 1;
    const stepPhase = PHASES.find(p => p.steps.some(s => s.id === stepId))?.id || 1;
    if (stepPhase < currentPhase) return 'completed';
    if (stepPhase === currentPhase) return 'in_progress';
    return 'pending';
  };

  const getStepIcon = (stepId: number) => {
    switch (stepId) {
      case 1: return <Building2 className="w-3.5 h-3.5" />;
      case 2: return <Shield className="w-3.5 h-3.5" />;
      case 3: return <Building2 className="w-3.5 h-3.5" />;
      case 4: return <Phone className="w-3.5 h-3.5" />;
      case 5: return <FileText className="w-3.5 h-3.5" />;
      case 6: return <FileText className="w-3.5 h-3.5" />;
      case 7: return <BarChart2 className="w-3.5 h-3.5" />;
      case 8: return <BookOpen className="w-3.5 h-3.5" />;
      case 9: return <Users className="w-3.5 h-3.5" />;
      case 10: return <Clock className="w-3.5 h-3.5" />;
      case 11: return <FileText className="w-3.5 h-3.5" />;
      case 12: return <Rocket className="w-3.5 h-3.5" />;
      case 13: return <Users className="w-3.5 h-3.5" />;
      default: return <CheckCircle2 className="w-3.5 h-3.5" />;
    }
  };

  const renderRoadmap = () => (
    <div className="animate-in space-y-4">
      <div className="flex items-center justify-between mb-4 mt-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-none">Strategic Roadmap</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Track your organization's digital evolution</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-2 py-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Readiness</span>
          <div className="h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 transition-all duration-1000"
              style={{ width: `${(onboardingProgress?.completedSteps?.length || 0) / 13 * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 relative">
        {PHASES.map((phase) => {
          const PhaseIcon = phase.icon;
          const isExpanded = expandedPhases.includes(phase.id);
          const isCurrent = (onboardingProgress?.currentPhase || 1) === phase.id;

          return (
            <div key={phase.id} className="group border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-rose-200 transition-all shadow-sm">
              <button
                onClick={() => togglePhase(phase.id)}
                className="w-full flex items-center justify-between p-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isExpanded || isCurrent ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-slate-100 text-slate-400'}`}>
                    <PhaseIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-none">{phase.title}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{phase.subtitle}</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              <div className={`transition-all duration-300 ${isExpanded ? 'max-h-[500px] opacity-100 border-t border-slate-100 p-3' : 'max-h-0 opacity-0 invisible overflow-hidden'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {phase.steps.map((step) => {
                    const status = getStepStatus(step.id);
                    return (
                      <div
                        key={step.id}
                        className={`p-2.5 rounded-lg border flex items-center gap-3 group/step transition-all ${status === 'completed' ? 'bg-emerald-50/30 border-emerald-100' :
                          status === 'in_progress' ? 'bg-rose-50/30 border-rose-100 ring-1 ring-rose-400/10' :
                            'bg-slate-50 border-slate-100'
                          } ${step.disabled ? 'opacity-40' : 'hover:border-rose-300 cursor-default'}`}
                      >
                        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                          status === 'in_progress' ? 'bg-rose-500 text-white' :
                            'bg-slate-200 text-slate-400'
                          }`}>
                          {status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : getStepIcon(step.id)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[11px] font-bold text-slate-900 truncate tracking-tight">{step.title}</h4>
                          <p className="text-[9px] text-slate-400 font-medium truncate">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPlaceholder = (title: string) => (
    <div className="h-full flex flex-col items-center justify-center p-12 text-center animate-in">
      <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-4 text-slate-300">
        <Settings className="w-8 h-8" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-400 mt-1 max-w-xs">This section is currently under construction as we integrate advanced AI capabilities into your workspace.</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-[600px] flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/50">
      {/* Premium Adaptive Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-slate-100 bg-slate-50/50 p-3 flex flex-col">
        <div className="mb-6 p-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-rose-500 rounded-lg shadow-lg shadow-rose-200">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-slate-900 tracking-tighter text-sm uppercase">Nexus Settings</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-1">Hyper-automation Node</p>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all duration-200 ${activeSection === item.id
                ? 'bg-white text-rose-500 shadow-md border border-slate-100 translate-x-1'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 group'
                }`}
            >
              <item.icon className={`w-4 h-4 transition-colors ${activeSection === item.id ? 'text-rose-500' : 'text-slate-300 group-hover:text-slate-400'}`} />
              {item.label}
              {activeSection === item.id && <div className="ml-auto w-1 h-3 rounded-full bg-rose-500 animate-pulse" />}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-3 bg-rose-500/5 rounded-2xl border border-rose-100/50">
          <p className="text-[10px] font-black text-rose-500/40 uppercase mb-2">Strategy Tier</p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-500 flex items-center justify-center text-[10px] font-black text-white">E</div>
            <span className="text-[11px] font-black text-slate-900 tracking-tight">Enterprise Elite</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white overflow-y-auto custom-scrollbar p-6">
        {activeSection === 'roadmap' ? renderRoadmap() : renderPlaceholder(menuItems.find(m => m.id === activeSection)?.label || '')}
      </div>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
        .animate-in { animation: slideIn 0.4s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}

export default SettingsPanel;
