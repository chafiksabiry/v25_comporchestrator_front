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

  // Vérifier si nous sommes sur une page spéciale
  const isZohoCallback = window.location.pathname === '/zoho-callback';
  const isZohoAuth = window.location.pathname === '/zoho-auth';

  useEffect(() => {
    // Initialize Zoho configuration
    const initializeZoho = async () => {
      const zohoService = ZohoService.getInstance();
      // L'initialisation est maintenant gérée dans le constructeur de ZohoService
    };

    initializeZoho().catch(error => {
      console.debug('App: Error initializing Zoho', error);
    });
  }, []);

  // Nouveau useEffect pour afficher les données utilisateur authentifié
  useEffect(() => {
    const displayUserData = async () => {
      console.log('🔍 === DONNÉES UTILISATEUR AUTHENTIFIÉ ===');
      
      // 1. Afficher tous les cookies disponibles
      const allCookies = Cookies.get();
      console.log('🍪 Cookies disponibles:', allCookies);
      
      // 2. Afficher les cookies spécifiques importants
      const userId = Cookies.get('userId');
      const gigId = Cookies.get('gigId');
      const companyId = Cookies.get('companyId');
      const companyOnboardingProgress = Cookies.get('companyOnboardingProgress');
      
      console.log('👤 User ID:', userId);
      console.log('🎯 Gig ID:', gigId);
      console.log('🏢 Company ID:', companyId);
      console.log('📊 Onboarding Progress:', companyOnboardingProgress ? JSON.parse(companyOnboardingProgress) : 'Non défini');
      
      // 3. Afficher les variables d'environnement (sans les valeurs sensibles)
      console.log('🌍 Variables d\'environnement disponibles:', {
        NODE_ENV: import.meta.env.VITE_NODE_ENV,
        DASHBOARD_API: import.meta.env.VITE_DASHBOARD_API ? 'Défini' : 'Non défini',
        COMPANY_API_URL: import.meta.env.VITE_COMPANY_API_URL ? 'Défini' : 'Non défini',
        GIGS_API: import.meta.env.VITE_GIGS_API ? 'Défini' : 'Non défini',
        PHONE_API: import.meta.env.VITE_PHONE_API ? 'Défini' : 'Non défini',
        OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY ? 'Défini' : 'Non défini',
        GOOGLE_API_KEY: import.meta.env.VITE_GOOGLE_API_KEY ? 'Défini' : 'Non défini'
      });
      
      // 4. Récupérer et afficher les informations de l'entreprise si companyId existe
      if (companyId) {
        try {
          const response = await fetch(`${import.meta.env.VITE_COMPANY_API_URL}/companies/${companyId}`, {
            headers: {
              'Authorization': `Bearer ${gigId}:${userId}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const companyData = await response.json();
            console.log('🏢 Données de l\'entreprise:', companyData);
          } else {
            console.log('❌ Erreur lors de la récupération des données de l\'entreprise:', response.status);
          }
        } catch (error) {
          console.log('❌ Erreur lors de la récupération des données de l\'entreprise:', error);
        }
      }
      
      // 5. Récupérer et afficher les gigs de l'entreprise
      if (companyId) {
        try {
          const response = await fetch(`${import.meta.env.VITE_GIGS_API}/gigs/company/${companyId}`, {
            headers: {
              'Authorization': `Bearer ${gigId}:${userId}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const gigsData = await response.json();
            console.log('🎯 Gigs de l\'entreprise:', gigsData);
          } else {
            console.log('❌ Erreur lors de la récupération des gigs:', response.status);
          }
        } catch (error) {
          console.log('❌ Erreur lors de la récupération des gigs:', error);
        }
      }
      
      // 6. Vérifier la configuration Zoho
      try {
        const zohoService = ZohoService.getInstance();
        const isConfigured = zohoService.isConfigured();
        console.log('🔗 Configuration Zoho:', isConfigured ? 'Configuré' : 'Non configuré');
        
        if (isConfigured) {
          const accessToken = await zohoService.getValidAccessToken();
          console.log('🔑 Token Zoho valide:', accessToken ? 'Oui' : 'Non');
        }
      } catch (error) {
        console.log('❌ Erreur lors de la vérification Zoho:', error);
      }
      
      // 7. Afficher les informations de session
      console.log('📱 Informations de session:', {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        url: window.location.href,
        referrer: document.referrer
      });
      
      console.log('🔍 === FIN DES DONNÉES UTILISATEUR ===');
    };

    // Ne pas afficher les données sur les pages spéciales
    if (!isZohoCallback && !isZohoAuth) {
      displayUserData();
    }
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
      console.log('Logout disabled in development mode');
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
            <button
              className={`flex w-full items-center space-x-2 rounded-lg py-2 px-3 ${
                activeTab === 'approval-publishing' ? 'bg-indigo-800' : 'hover:bg-indigo-800'
              }`}
              onClick={() => setActiveTab('approval-publishing')}
            >
              <CheckCircle className="h-5 w-5" />
              <span>Approval & Publishing</span>
            </button>
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