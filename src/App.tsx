import React, { useState, useEffect } from 'react';
import {
  Menu,
  LogOut,
  Building2,
  ChevronRight,
  Sparkles,
  Info,
  X,
  Cpu
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
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

function App() {


  const [activeTab, setActiveTab] = useState('company-onboarding');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userFullName, setUserFullName] = useState('Admin User');
  const [currentStepGuide, setCurrentStepGuide] = useState<{ title: string; description: string } | null>(null);

  // Vérifier si nous sommes sur une page spéciale
  const isZohoCallback = window.location.pathname === '/zoho-callback';
  const isZohoAuth = window.location.pathname === '/zoho-auth';

  useEffect(() => {
    // Vérifier si l'utilisateur est authentifié
    const userId = Cookies.get('userId');
    if (!userId && !isZohoCallback && !isZohoAuth) {
      console.log('User ID not found, redirecting to /auth');
      window.location.href = '/auth';
      return;
    }

    // Fetch user details to get full name
    const fetchUserDetails = async () => {
      if (userId) {
        try {
          const registrationBackendUrl = import.meta.env.VITE_REGISTRATION_BACKEND_URL;
          console.log('Fetching user details for userId:', userId);
          console.log('Registration backend URL:', registrationBackendUrl);
          const response = await fetch(`${registrationBackendUrl}/api/users/${userId}`);
          console.log('Response status:', response.status);
          if (response.ok) {
            const userData = await response.json();
            console.log('User data received:', userData);
            // The API returns data in userData.data.fullName format
            if (userData.data && userData.data.fullName) {
              console.log('Setting user full name to:', userData.data.fullName);
              setUserFullName(userData.data.fullName);
            } else {
              console.log('No fullName in user data');
            }
          } else {
            console.error('Response not OK:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
        }
      } else {
        console.log('No userId found in cookies');
      }
    };

    fetchUserDetails();

    // Initialize Zoho configuration
    const initializeZoho = async () => {
      ZohoService.getInstance();
      // L'initialisation est maintenant gérée dans le constructeur de ZohoService
    };

    initializeZoho().catch(error => {
      console.debug('App: Error initializing Zoho', error);
    });

    // Listen for tab change events from CompanyOnboarding
    const handleTabChange = (event: CustomEvent) => {
      if (event.detail && event.detail.tab) {
        setActiveTab(event.detail.tab);
      }
    };

    // Removed postMessage handling - using localStorage and CustomEvent instead

    // Check localStorage for activeTab on mount
    const storedActiveTab = localStorage.getItem('activeTab');
    if (storedActiveTab) {
      setActiveTab(storedActiveTab);
      localStorage.removeItem('activeTab'); // Clear after reading
    }

    const handleStepGuideUpdate = (event: CustomEvent) => {
      if (event.detail) {
        setCurrentStepGuide({
          title: event.detail.title,
          description: event.detail.description
        });
      }
    };

    window.addEventListener('tabChange', handleTabChange as EventListener);
    window.addEventListener('stepGuideUpdate', handleStepGuideUpdate as EventListener);

    return () => {
      window.removeEventListener('tabChange', handleTabChange as EventListener);
      window.removeEventListener('stepGuideUpdate', handleStepGuideUpdate as EventListener);
    };
  }, []);



  const handleLogout = () => {
    // Supprimer tous les cookies
    const cookies = Cookies.get();
    Object.keys(cookies).forEach(cookieName => {
      Cookies.remove(cookieName, { path: '/' });
      Cookies.remove(cookieName); // Fallback for cookies set without specific path
    });

    // Clear localStorage
    localStorage.clear();

    // Rediriger vers /app1
    window.location.href = '/app1';
  };

  const renderContent = () => {
    // Si nous sommes sur une page spéciale, afficher le composant correspondant
    if (isZohoCallback) {
      return <ZohoCallback />;
    }
    if (isZohoAuth) {
      return <ZohoAuth />;
    }

    switch (activeTab) {
      case 'profile-creation':
        return <ProfileCreation />;
      case 'gig-generation':
        return <GigGeneration />;
      case 'matching':
        return <Matching />;
      case 'approval-publishing':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveTab('company-onboarding')}
                className="flex items-center transition-colors text-gray-600 hover:text-gray-900"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
                <span>Back to Onboarding</span>
              </button>
            </div>
            <ApprovalPublishing />
          </div>
        );
      case 'optimization':
        return <Optimization />;
      case 'knowledge-base':
        return <KnowledgeBase />;
      case 'script-generator':
        return <ScriptGenerator />;
      case 'company-onboarding':
      default:
        return <CompanyOnboarding />;
    }
  };

  // Si nous sommes sur une page spéciale, ne pas afficher la sidebar
  if (isZohoCallback || isZohoAuth) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Toaster position="top-right" />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      <Toaster position="top-right" />
      {/* Sidebar */}
      <div
        className={`${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0'} fixed inset-y-0 left-0 z-30 bg-[#0a0b14] text-white transition-all duration-300 ease-in-out md:relative shadow-2xl border-r border-white/5 flex flex-col overflow-hidden`}
      >
        <div className="px-6 py-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 flex items-center justify-center shadow-lg shadow-harx-500/10 shrink-0">
              <img 
                src={`${import.meta.env.BASE_URL || '/'}mascotte2.png`} 
                alt="HARX" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-harx-500 tracking-[0.2em] uppercase italic leading-none mb-1">Smart</span>
              <span className="text-xl font-black tracking-tighter text-white leading-none">Orchestrator</span>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>



        <nav className="flex-1 px-4 flex flex-col overflow-y-auto min-h-0">
          <div className="shrink-0 pt-2 pb-4">
            <button
              className={`flex w-full items-center space-x-3 rounded-2xl py-3 px-5 transition-all duration-300 group ${activeTab === 'company-onboarding'
                ? 'bg-gradient-harx text-white shadow-xl shadow-harx-500/25 ring-1 ring-white/10'
                : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                }`}
              onClick={() => setActiveTab('company-onboarding')}
            >
              <div className={`p-2 rounded-xl transition-all ${activeTab === 'company-onboarding' ? 'bg-white/20' : 'bg-gray-800/40 group-hover:bg-gray-800'}`}>
                <Building2 className="h-5 w-5" />
              </div>
              <span className="font-black text-sm tracking-tight">Company Onboarding</span>
            </button>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-8 pb-8">
            <div className="flex flex-col items-center shrink-0">
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-harx/20 rounded-full blur-2xl group-hover:bg-harx-500/30 transition-all duration-700" />
                <img
                  src={`${import.meta.env.BASE_URL || '/'}mascotte2.png`}
                  alt="HARX Mascotte"
                  className="w-40 h-40 object-contain drop-shadow-[0_0_20px_rgba(255,77,77,0.3)] relative z-10 transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>

            {currentStepGuide && (
              <div className="px-2 animate-fade-in-up shrink-0">
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 shadow-inner">
                  <div className="flex items-center gap-2 mb-2 text-harx-400">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Active Guide</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">{currentStepGuide.title}</h4>
                  <p className="text-[10px] text-gray-400 leading-relaxed italic line-clamp-3">
                    {currentStepGuide.description}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[9px] text-harx-500/80 font-bold uppercase tracking-tighter">
                    <Info className="h-3 w-3" />
                    <span>Interactive Step</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 bg-black/40 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 rounded-xl py-2 px-4 text-gray-400 hover:bg-harx-600/20 hover:text-harx-400 transition-all duration-300 group font-bold text-sm"
          >
            <div className="p-2 rounded-lg bg-gray-800/50 group-hover:bg-harx-500/20 transition-colors">
              <LogOut className="h-4 w-4" />
            </div>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-20 flex items-center shrink-0 px-8 relative z-20">
          <div className="flex w-full items-center justify-between">
            <button
              className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-500 hover:bg-gray-100 hover:text-harx-500 transition-all duration-300 shadow-sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </button>
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


        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-4 py-3">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;