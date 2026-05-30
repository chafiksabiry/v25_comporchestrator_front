import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', flagUrl: 'https://flagcdn.com/w320/gb.png' },
    { code: 'fr', flagUrl: 'https://flagcdn.com/w320/fr.png' }
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
    console.log('[HARX i18n] user selected language:', code, '| previous:', i18n.language);
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-2 py-1.5 rounded-2xl border border-white/10 transition-colors duration-200 group"
        title={t('language.title')}
      >
        <span className="block w-7 h-5 rounded-sm overflow-hidden shrink-0 border border-white/10">
          <img src={currentLang.flagUrl} alt={t(`language.${currentLang.code}`)} className="w-full h-full object-cover" />
        </span>
        <span className="font-black text-sm text-white tracking-wide whitespace-nowrap">
          {t(`language.${currentLang.code}`)}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 group-hover:text-white ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-48 bg-[#0A0A0A] border border-white/10 rounded-2xl p-1.5 z-50 flex flex-col gap-1 overflow-hidden animate-in fade-in slide-in-from-top-2 backdrop-blur-xl">
          {languages.map((lang) => {
            const isActive = i18n.language.startsWith(lang.code);
            const label = t(`language.${lang.code}`);
            return (
              <button
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors duration-150 text-sm font-bold ${
                  isActive
                    ? 'bg-gradient-harx text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
                title={label}
              >
                <div className="flex items-center gap-3">
                  <span className="block w-8 h-6 rounded-sm overflow-hidden shrink-0 border border-white/10">
                    <img src={lang.flagUrl} alt={label} className="w-full h-full object-cover" />
                  </span>
                  <span className="tracking-wide">{label}</span>
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
