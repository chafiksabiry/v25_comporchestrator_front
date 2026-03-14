import { useState, useEffect } from 'react';
import React from 'react';
import {
  Menu,
  LogOut,
  Building2,
  ChevronRight,
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

    window.addEventListener('tabChange', handleTabChange as EventListener);

    return () => {
      window.removeEventListener('tabChange', handleTabChange as EventListener);
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
    <div className="flex h-screen bg-premium-gradient overflow-hidden">

      <Toaster position="top-right" />
      {/* Sidebar */}
      <div
        className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed inset-y-0 left-0 z-30 w-72 bg-gradient-to-b from-gray-900 via-harx-900 to-gray-900 text-white transition-all duration-300 ease-in-out md:relative md:translate-x-0 shadow-2xl border-r border-harx-500/20`}
      >
        <div className="px-6 py-6 border-b border-white/10">
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-harx/20 rounded-full blur-2xl group-hover:bg-harx-500/30 transition-all duration-700" />
            <img
              src={`${import.meta.env.BASE_URL || '/'}mascotte.webp`}
              alt="HARX Mascotte"
              className="w-24 h-24 mx-auto object-contain animate-bounce-slow relative z-10"
            />
          </div>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          <div className="space-y-1">
            <button
              className={`flex w-full items-center space-x-3 rounded-2xl py-3 px-4 transition-all duration-300 group ${activeTab === 'company-onboarding'
                ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/40'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              onClick={() => setActiveTab('company-onboarding')}
            >
              <div className={`p-2 rounded-xl transition-all ${activeTab === 'company-onboarding' ? 'bg-white/20' : 'bg-gray-800 group-hover:bg-gray-700'}`}>
                <Building2 className="h-5 w-5" />
              </div>
              <span className="font-bold">Company Onboarding</span>
            </button>


            {/* 
            <button
              className={`flex w-full items-center space-x-2 rounded-lg py-2 px-3 ${
                activeTab === 'approval-publishing' ? 'bg-indigo-800' : 'hover:bg-indigo-800'
              }`}
              onClick={() => setActiveTab('approval-publishing')}
            >
              <CheckCircle className="h-5 w-5" />
              <span>Approval & Publishing</span>
            </button>
            */}
          </div>
          <div className="absolute bottom-6 left-4 right-4">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <button
                onClick={handleLogout}
                className="flex w-full items-center space-x-3 rounded-xl py-3 px-4 text-harx-300 hover:bg-harx-500 hover:text-white transition-all duration-300 group font-bold"
              >
                <div className="p-2 rounded-lg bg-harx-500/10 group-hover:bg-white/20">
                  <LogOut className="h-5 w-5" />
                </div>
                <span>Logout</span>
              </button>
            </div>
          </div>

        </nav>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-20 flex items-center shrink-0 px-8 relative z-20">
          <div className="flex w-full items-center justify-between">
            <button
              className="md:hidden p-2 rounded-xl bg-gray-100"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-6 w-6 text-gray-600" />
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