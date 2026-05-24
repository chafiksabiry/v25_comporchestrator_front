import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface GuideModalLayoutProps {
  isOpen: boolean;
  onBackdropClick: () => void;
  onClose?: () => void;
  closeLabel?: string;
  maxWidth?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const maxWidthClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function GuideModalLayout({
  isOpen,
  onBackdropClick,
  onClose,
  closeLabel = 'Close',
  maxWidth = 'md',
  children,
  footer,
}: GuideModalLayoutProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 md:p-8"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        className="absolute inset-0 bg-black/70"
        onClick={onBackdropClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={`relative w-full ${maxWidthClass[maxWidth]} max-h-[min(90vh,720px)] flex flex-col rounded-[2rem] border border-white/10 bg-[#0c0c0c] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.85)] ring-1 ring-white/5 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#ff4d4d]/25 via-[#ec4899]/20 to-transparent blur-3xl" />

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
            aria-label={closeLabel}
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <motion.div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </motion.div>

        {footer && (
          <motion.div className="relative z-10 shrink-0 border-t border-white/5 bg-black/40 px-6 py-5">
            {footer}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function GuideBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-harx-500/25 bg-gradient-to-r from-[#ff4d4d]/10 to-[#ec4899]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#ff6b8a]">
      {children}
    </span>
  );
}

export function GuidePrimaryButton({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-harx px-6 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-harx-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-harx-500/35 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
}

export function GuideSecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-2 text-center text-sm font-medium text-gray-500 transition-colors hover:text-gray-300"
    >
      {children}
    </button>
  );
}

export function GuideHero({
  gradientClass,
  children,
}: {
  gradientClass: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={`relative flex h-36 shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br sm:h-40 ${gradientClass}`}
    >
      <motion.div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_50%)]" />
      <motion.div className="absolute inset-0 bg-black/20" />
      <motion.div className="relative z-10">{children}</motion.div>
    </motion.div>
  );
}

export function GuideIconOrb({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg shadow-black/20 ring-2 ring-white/10"
    >
      {children}
    </motion.div>
  );
}
