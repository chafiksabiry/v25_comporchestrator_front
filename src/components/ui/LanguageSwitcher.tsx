import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', label: 'English', flagUrl: 'https://flagcdn.com/w320/gb.png' },
    { code: 'fr', label: 'Français', flagUrl: 'https://flagcdn.com/w320/fr.png' }
  ];

  const currentLang = languages.find(l => i18n.language.startsWith(l.code)) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 group ${isOpen ? 'bg-white/10' : 'hover:bg-white/5'}`}
        title="Change Language"
      >
        <div className="w-6 h-4 rounded-sm overflow-hidden shadow-sm">
          <img src={currentLang.flagUrl} alt={currentLang.label} className="w-full h-full object-cover" />
        </div>
        <span className="font-medium text-sm text-white transition-colors duration-300">
          {currentLang.label}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-40 bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {languages.map((lang) => {
            const isActive = i18n.language.startsWith(lang.code);
            return (
              <button
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                  isActive 
                    ? 'bg-gradient-to-r from-orange-400 to-rose-500 text-white shadow-md' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
                title={lang.label}
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-3.5 rounded-sm overflow-hidden shadow-sm shrink-0">
                    <img src={lang.flagUrl} alt={lang.label} className="w-full h-full object-cover" />
                  </div>
                  {lang.label}
                </div>
                {isActive && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
