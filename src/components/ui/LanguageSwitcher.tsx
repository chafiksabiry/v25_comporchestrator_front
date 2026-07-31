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
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-10 bg-harx-chip hover:bg-[#222228] px-2.5 rounded-xl border border-harx-chip-border transition-colors duration-200 group"
        title={t('language.title')}
      >
        <span className="block w-6 h-4 rounded-sm overflow-hidden shrink-0 border border-white/10">
          <img src={currentLang.flagUrl} alt={t(`language.${currentLang.code}`)} className="w-full h-full object-cover" />
        </span>
        <span className="font-black text-xs text-white tracking-wide whitespace-nowrap">
          {t(`language.${currentLang.code}`)}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-white/45 transition-transform duration-300 group-hover:text-white ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-44 bg-[#0A0A0A] border border-white/10 rounded-xl p-1.5 z-50 flex flex-col gap-1 overflow-hidden animate-in fade-in slide-in-from-top-2 backdrop-blur-xl">
          {languages.map((lang) => {
            const isActive = i18n.language.startsWith(lang.code);
            const label = t(`language.${lang.code}`);
            return (
              <button
                type="button"
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-150 text-sm font-bold ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
                title={label}
              >
                <div className="flex items-center gap-2.5">
                  <span className="block w-6 h-4 rounded-sm overflow-hidden shrink-0 border border-white/10">
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
