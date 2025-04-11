import React, { useState } from 'react';
import { 
  UserCircle, 
  Briefcase, 
  ArrowRightLeft, 
  CheckCircle, 
  BarChart2, 
  Menu, 
  X,
  Home,
  Settings,
  HelpCircle,
  LogOut,
  Building2
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ProfileCreation from './components/ProfileCreation';
import GigGeneration from './components/GigGeneration';
import Matching from './components/Matching';
import ApprovalPublishing from './components/ApprovalPublishing';
import Optimization from './components/Optimization';
import CompanyOnboarding from './components/CompanyOnboarding';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
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
        return <CompanyOnboarding />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
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
          {/*   <button
              className={`flex w-full items-center space-x-2 rounded-lg py-2 px-3 ${
                activeTab === 'dashboard' ? 'bg-indigo-800' : 'hover:bg-indigo-800'
              }`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Home className="h-5 w-5" />
              <span>Dashboard</span>
            </button> */}
            <button
              className={`flex w-full items-center space-x-2 rounded-lg py-2 px-3 ${
                activeTab === 'company-onboarding' ? 'bg-indigo-800' : 'hover:bg-indigo-800'
              }`}
              onClick={() => setActiveTab('company-onboarding')}
            >
              <Building2 className="h-5 w-5" />
              <span>Company Onboarding</span>
            </button>
          {/*   <button
              className={`flex w-full items-center space-x-2 rounded-lg py-2 px-3 ${
                activeTab === 'profile-creation' ? 'bg-indigo-800' : 'hover:bg-indigo-800'
              }`}
              onClick={() => setActiveTab('profile-creation')}
            >
              <UserCircle className="h-5 w-5" />
              <span>Profile Creation</span>
            </button> */}
         {/*    <button
              className={`flex w-full items-center space-x-2 rounded-lg py-2 px-3 ${
                activeTab === 'gig-generation' ? 'bg-indigo-800' : 'hover:bg-indigo-800'
              }`}
              onClick={() => setActiveTab('gig-generation')}
            >
              <Briefcase className="h-5 w-5" />
              <span>Gig Generation</span>
            </button> */}
           {/*  <button
              className={`flex w-full items-center space-x-2 rounded-lg py-2 px-3 ${
                activeTab === 'matching' ? 'bg-indigo-800' : 'hover:bg-indigo-800'
              }`}
              onClick={() => setActiveTab('matching')}
            >
              <ArrowRightLeft className="h-5 w-5" />
              <span>Matching</span>
            </button> */}
            <button
              className={`flex w-full items-center space-x-2 rounded-lg py-2 px-3 ${
                activeTab === 'approval-publishing' ? 'bg-indigo-800' : 'hover:bg-indigo-800'
              }`}
              onClick={() => setActiveTab('approval-publishing')}
            >
              <CheckCircle className="h-5 w-5" />
              <span>Approval & Publishing</span>
            </button>
           {/*  <button
              className={`flex w-full items-center space-x-2 rounded-lg py-2 px-3 ${
                activeTab === 'optimization' ? 'bg-indigo-800' : 'hover:bg-indigo-800'
              }`}
              onClick={() => setActiveTab('optimization')}
            >
              <BarChart2 className="h-5 w-5" />
              <span>Optimization</span>
            </button> */}
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
              <button className="flex w-full items-center space-x-2 rounded-lg py-2 px-3 hover:bg-indigo-800">
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