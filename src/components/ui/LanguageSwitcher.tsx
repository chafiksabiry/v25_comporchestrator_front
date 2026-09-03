import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const languages = [
    { code: 'en', flagUrl: 'https://flagcdn.com/w320/gb.png' },
    { code: 'fr', flagUrl: 'https://flagcdn.com/w320/fr.png' }
  ];

  const currentLang = languages.find(l => i18n.language.startsWith(l.code)) || languages[0];

  const updateMenuPos = () => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPos();
    const onScrollOrResize = () => updateMenuPos();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current?.contains(target)) return;
      if ((event.target as HTMLElement)?.closest?.('[data-harx-lang-menu]')) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  const menu =
    isOpen && menuPos
      ? createPortal(
          <div
            data-harx-lang-menu
            style={{ top: menuPos.top, right: menuPos.right }}
            className="fixed w-44 bg-[#0A0A0A] border border-white/10 rounded-xl p-1.5 z-[9999] flex flex-col gap-1 overflow-hidden animate-in fade-in slide-in-from-top-2 backdrop-blur-xl shadow-2xl"
          >
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
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative shrink-0 overflow-visible" ref={dropdownRef}>
      <button
        ref={buttonRef}
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
      {menu}
    </div>
  );
}
