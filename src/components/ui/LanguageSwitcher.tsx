import React from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageSwitcherProps {
  isCollapsed?: boolean;
}

export function LanguageSwitcher({ isCollapsed = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('fr') ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center gap-4 w-full p-3.5 rounded-2xl transition-all duration-300 relative group overflow-hidden text-slate-400 hover:text-white hover:bg-white/5 ${isCollapsed ? 'justify-center' : ''}`}
      title="Toggle Language"
    >
      <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded bg-white/10 text-[10px] font-bold uppercase tracking-widest group-hover:bg-white/20 transition-colors duration-300">
        {i18n.language.substring(0, 2)}
      </div>
      {!isCollapsed && (
        <span className="font-medium whitespace-nowrap overflow-hidden text-sm transition-all duration-300">
          {i18n.language.startsWith('fr') ? 'Français' : 'English'}
        </span>
      )}
      {isCollapsed && (
        <div className="absolute left-16 bg-slate-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
          {i18n.language.startsWith('fr') ? 'Français' : 'English'}
        </div>
      )}
    </button>
  );
}
