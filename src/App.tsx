import React, { useState, useEffect } from 'react';
import { 
  UserCircle, 
  Briefcase, 
  ArrowRightLeft, 
  CheckCircle, 
  BarChart2, 
  Menu, 
  X,
  Settings,
  HelpCircle,
  LogOut,
  Building2
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
import ZohoService from './services/zohoService';
import UploadContacts from './components/onboarding/UploadContacts';

function App() {


  const [activeTab, setActiveTab] = useState('company-onboarding');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

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

    // Initialize Zoho configuration
    const initializeZoho = async () => {
      const zohoService = ZohoService.getInstance();
      // L'initialisation est maintenant gérée dans le constructeur de ZohoService
    };

    initializeZoho().catch(error => {
      console.debug('App: Error initializing Zoho', error);
    });

    // Récupérer le lastGig depuis le localStorage du host
    const lastGigStr = localStorage.getItem("lastGig");
    if (lastGigStr) {
      const lastGig = JSON.parse(lastGigStr);
      console.log("Récupéré depuis host localStorage :", lastGig);
    }

    // Récupérer et stocker le dernier gig dans les cookies
    const fetchAndStoreLastGig = async (currentCompanyId: string) => {
      try {
        if (!currentCompanyId) {
          console.log('CompanyId not found, skipping last gig fetch');
          return;
        }

        // Toujours récupérer le dernier gig pour s'assurer qu'il est à jour
        console.log('Fetching latest gig for company:', currentCompanyId);

        const response = await fetch(`${import.meta.env.VITE_GIGS_API}/gigs/company/${currentCompanyId}/last`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.data && result.data._id) {
          // Stocker le gig ID dans les cookies avec une expiration de 30 jours
          Cookies.set('lastGigId', result.data._id, { expires: 30 });
          console.log('Last gig ID stored in cookies:', result.data._id);
        }
      } catch (error) {
        console.error('Error fetching last gig:', error);
      }
    };

    // Récupérer le companyId initial
    const initialCompanyId = Cookies.get('companyId') || localStorage.getItem('companyId');
    setCompanyId(initialCompanyId);
    
    if (initialCompanyId) {
      fetchAndStoreLastGig(initialCompanyId);
    }

    // Listen for tab change events from CompanyOnboarding
    const handleTabChange = (event: CustomEvent) => {
      if (event.detail && event.detail.tab) {
        setActiveTab(event.detail.tab);
      }
    };

    // Listen for postMessage events from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SET_ACTIVE_TAB') {
        setActiveTab(event.data.tab);
      }
    };

    // Check localStorage for activeTab on mount
    const storedActiveTab = localStorage.getItem('activeTab');
    if (storedActiveTab) {
      setActiveTab(storedActiveTab);
      localStorage.removeItem('activeTab'); // Clear after reading
    }

    window.addEventListener('tabChange', handleTabChange as EventListener);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('tabChange', handleTabChange as EventListener);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Fonction utilitaire pour mettre à jour le lastGigId
  const updateLastGigId = async () => {
    const currentCompanyId = Cookies.get('companyId') || localStorage.getItem('companyId');
    if (!currentCompanyId) {
      console.log('CompanyId not found, cannot update last gig ID');
      return;
    }

    try {
      console.log('Updating last gig ID for company:', currentCompanyId);
      const response = await fetch(`${import.meta.env.VITE_GIGS_API}/gigs/company/${currentCompanyId}/last`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.data && result.data._id) {
        Cookies.set('lastGigId', result.data._id, { expires: 30 });
        console.log('Last gig ID updated in cookies:', result.data._id);
      }
    } catch (error) {
      console.error('Error updating last gig ID:', error);
    }
  };

  // Exposer la fonction globalement pour qu'elle puisse être appelée depuis d'autres composants
  useEffect(() => {
    (window as any).updateLastGigId = updateLastGigId;
    return () => {
      delete (window as any).updateLastGigId;
    };
  }, []);

  // Surveiller les changements du companyId pour récupérer le lastGigId
  useEffect(() => {
    const checkCompanyIdAndFetchLastGig = () => {
      const currentCompanyId = Cookies.get('companyId') || localStorage.getItem('companyId');
      
      // Si le companyId a changé ou si on n'a pas de lastGigId
      if (currentCompanyId && currentCompanyId !== companyId) {
        console.log('CompanyId changed, fetching last gig for:', currentCompanyId);
        setCompanyId(currentCompanyId);
        
        // Supprimer l'ancien lastGigId s'il existe
        Cookies.remove('lastGigId');
        
        // Récupérer le nouveau lastGigId
        const fetchAndStoreLastGig = async () => {
          try {
            const response = await fetch(`${import.meta.env.VITE_GIGS_API}/gigs/company/${currentCompanyId}/last`);
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.data && result.data._id) {
              Cookies.set('lastGigId', result.data._id, { expires: 30 });
              console.log('New last gig ID stored in cookies:', result.data._id);
            }
          } catch (error) {
            console.error('Error fetching last gig:', error);
          }
        };
        
        fetchAndStoreLastGig();
      }
    };

    // Vérifier toutes les 2 secondes si le companyId a changé
    const interval = setInterval(checkCompanyIdAndFetchLastGig, 2000);

    return () => clearInterval(interval);
  }, [companyId]);

  // Vérifier périodiquement si le lastGigId est à jour (toutes les 30 secondes)
  useEffect(() => {
    const checkLastGigIdIsUpToDate = async () => {
      const currentCompanyId = Cookies.get('companyId') || localStorage.getItem('companyId');
      if (!currentCompanyId) return;

      try {
        const response = await fetch(`${import.meta.env.VITE_GIGS_API}/gigs/company/${currentCompanyId}/last`);
        
        if (!response.ok) return;
        
        const result = await response.json();
        
        if (result.data && result.data._id) {
          const currentLastGigId = Cookies.get('lastGigId');
          if (currentLastGigId !== result.data._id) {
            console.log('Last gig ID outdated, updating...');
            Cookies.set('lastGigId', result.data._id, { expires: 30 });
            console.log('Last gig ID updated to:', result.data._id);
          }
        }
      } catch (error) {
        console.error('Error checking last gig ID:', error);
      }
    };

    const interval = setInterval(checkLastGigIdIsUpToDate, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, []);


  const handleLogout = () => {
    if (import.meta.env.VITE_NODE_ENV !== 'development') {
      // Supprimer tous les cookies
      const cookies = Cookies.get();
      Object.keys(cookies).forEach(cookieName => {
        Cookies.remove(cookieName);
      });

      // Rediriger vers /app2
      window.location.href = '/app1';
    } else {
      // En mode développement, supprimer seulement les cookies d'authentification
      // mais garder le lastGigId pour les tests
      const authCookies = ['companyId', 'userId', 'sessionToken']; // Ajoutez ici les cookies d'auth
      authCookies.forEach(cookieName => {
        Cookies.remove(cookieName);
      });
      console.log('Logout disabled in development mode - only auth cookies removed');
    }
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
        return <ApprovalPublishing />;
      case 'optimization':
        return <Optimization />;
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
    <div className="flex h-screen bg-gray-50">
      <Toaster position="top-right" />
      {/* Sidebar */}
      <div 
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-30 w-64 bg-indigo-900 text-white transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-indigo-800">
          <div className="flex items-center space-x-2">
            <ArrowRightLeft className="h-6 w-6" />
            <span className="text-xl font-bold">Smart Orchestrator</span>
          </div>
          <button 
            className="md:hidden" 
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-6 px-4">
          <div className="space-y-4">
            <button
              className={`flex w-full items-center space-x-2 rounded-lg py-2 px-3 ${
                activeTab === 'company-onboarding' ? 'bg-indigo-800' : 'hover:bg-indigo-800'
              }`}
              onClick={() => setActiveTab('company-onboarding')}
            >
              <Building2 className="h-5 w-5" />
              <span>Company Onboarding</span>
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
          <div className="absolute bottom-0 left-0 right-0 border-t border-indigo-800 p-4">
            <div className="space-y-4">
              <button className="flex w-full items-center space-x-2 rounded-lg py-2 px-3 hover:bg-indigo-800">
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </button>
              <button className="flex w-full items-center space-x-2 rounded-lg py-2 px-3 hover:bg-indigo-800">
                <HelpCircle className="h-5 w-5" />
                <span>Help</span>
              </button>
              <button 
                onClick={handleLogout}
                className="flex w-full items-center space-x-2 rounded-lg py-2 px-3 hover:bg-indigo-800"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white shadow-sm">
          <div className="flex h-16 items-center justify-between px-4">
            <button 
              className="md:hidden" 
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                    A
                  </div>
                  <span className="font-medium">Admin User</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;