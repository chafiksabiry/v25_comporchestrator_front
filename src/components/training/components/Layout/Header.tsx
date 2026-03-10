import React from 'react';
import { User, Bell, Search, Menu } from 'lucide-react';

interface HeaderProps {
  repName: string;
  onMenuToggle: () => void;
}

export default function Header({ repName, onMenuToggle }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm relative z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Onboarding Hub</h1>
            <p className="text-sm text-gray-600">Welcome back, {repName}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Search Bar */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search resources..."
              className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          
          {/* Notifications */}
          <button className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-xs rounded-full h-2 w-2"></span>
          </button>
          
          {/* User Profile */}
          <div className="flex items-center space-x-2 pl-3 border-l border-gray-200">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
              <User className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700 hidden lg:block">{repName}</span>
          </div>
        </div>
      </div>
    </header>
  );
}