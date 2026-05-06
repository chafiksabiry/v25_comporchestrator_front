import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronUp, Check } from 'lucide-react';

interface LanguageSwitcherProps {
  isCollapsed?: boolean;
}

export function LanguageSwitcher({ isCollapsed = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'fr', label: 'Français', short: 'FR' }
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
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-4 w-full p-3.5 rounded-2xl transition-all duration-300 relative group overflow-hidden ${isOpen ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'} ${isCollapsed ? 'justify-center' : 'justify-between'}`}
        title="Change Language"
      >
        <div className="flex items-center gap-4">
          <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded bg-white/10 text-[10px] font-bold uppercase tracking-widest group-hover:bg-white/20 transition-colors duration-300">
            {currentLang.short}
          </div>
          {!isCollapsed && (
            <span className="font-medium whitespace-nowrap overflow-hidden text-sm transition-all duration-300">
              {currentLang.label}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <ChevronUp className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-full bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          {languages.map((lang) => {
            const isActive = i18n.language.startsWith(lang.code);
            return (
              <button
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                  isActive 
                    ? 'bg-gradient-to-r from-orange-400 to-rose-500 text-white shadow-md' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
                title={lang.label}
              >
                {isCollapsed ? (
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold uppercase ${
                    isActive ? 'bg-white/20' : 'bg-white/5'
                  }`}>
                    {lang.short}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold uppercase ${
                        isActive ? 'bg-white/20' : 'bg-white/5'
                      }`}>
                        {lang.short}
                      </div>
                      {lang.label}
                    </div>
                    {isActive && <Check className="w-4 h-4" />}
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
