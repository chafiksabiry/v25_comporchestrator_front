import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowUpRight, RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type ActiveGigLimitItem = {
  _id: string;
  title: string;
};

export type ActiveGigLimitMode = 'activate' | 'reconcile';

export type ActiveGigLimitModalProps = {
  open: boolean;
  onClose: () => void;
  mode?: ActiveGigLimitMode;
  /** Gig the user wants to activate (activate mode) */
  targetGigTitle: string;
  maxGigs: number;
  planName: string | null;
  nextPlanHint: string | null;
  activeGigs: ActiveGigLimitItem[];
  /** How many currently-active gigs must be turned off */
  slotsNeeded: number;
  switching?: boolean;
  /** activate: deactivate selected then activate target; reconcile: deactivate selected only */
  onSwitch: (deactivateGigIds: string[]) => void;
  onUpgrade: () => void;
  /** When true, Escape / backdrop cannot dismiss (over-quota reconcile) */
  blocking?: boolean;
};

/**
 * Plan active-gig limit: BASCULER (deactivate) or upgrade — same idea as SessionPlanning switch.
 */
const ActiveGigLimitModal: React.FC<ActiveGigLimitModalProps> = ({
  open,
  onClose,
  mode = 'activate',
  targetGigTitle,
  maxGigs,
  planName,
  nextPlanHint,
  activeGigs,
  slotsNeeded,
  switching = false,
  onSwitch,
  onUpgrade,
  blocking = false,
}) => {
  const { t } = useTranslation();
  const needed = Math.max(1, slotsNeeded);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    // Pre-select gigs to deactivate (oldest first) so STARTER can one-click Basculer.
    setSelected(activeGigs.slice(0, needed).map((g) => g._id));
  }, [open, activeGigs, needed]);

  useEffect(() => {
    if (typeof document === 'undefined' || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !switching && !blocking) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, switching, onClose, blocking]);

  const canSwitch = selected.length >= needed && !switching;

  const activeLabels = useMemo(
    () =>
      activeGigs
        .filter((g) => selected.includes(g._id))
        .map((g) => g.title)
        .join(', '),
    [activeGigs, selected]
  );

  if (!open || typeof document === 'undefined') return null;

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const subtitleKey =
    mode === 'reconcile'
      ? 'approvalPublishing.activeLimit.reconcileSubtitle'
      : 'approvalPublishing.activeLimit.subtitle';

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-gig-limit-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label={t('approvalPublishing.activeLimit.close')}
        disabled={switching || blocking}
        onClick={() => !switching && !blocking && onClose()}
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="active-gig-limit-title"
                className="text-lg font-semibold text-slate-900"
              >
                {t('approvalPublishing.activeLimit.title')}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {t(subtitleKey, {
                  plan: planName || t('approvalPublishing.activeLimit.yourPlan'),
                  max: maxGigs,
                  target: targetGigTitle,
                  count: activeGigs.length,
                })}
              </p>
            </div>
          </div>
          {!blocking && (
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              disabled={switching}
              onClick={onClose}
              aria-label={t('approvalPublishing.activeLimit.close')}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-slate-700">
            {t(
              mode === 'reconcile'
                ? 'approvalPublishing.activeLimit.reconcileChoose'
                : 'approvalPublishing.activeLimit.choose'
            )}
          </p>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('approvalPublishing.activeLimit.activeList', {
                count: activeGigs.length,
              })}
            </p>
            {activeGigs.length === 0 ? (
              <p className="text-sm text-slate-500">
                {t('approvalPublishing.activeLimit.noneListed')}
              </p>
            ) : (
              activeGigs.map((g) => {
                const checked = selected.includes(g._id);
                return (
                  <label
                    key={g._id}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer border transition-colors ${
                      checked
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-transparent bg-white hover:border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      checked={checked}
                      disabled={switching || activeGigs.length === needed}
                      onChange={() => toggle(g._id)}
                    />
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {g.title}
                    </span>
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                      {t('approvalPublishing.status.active')}
                    </span>
                  </label>
                );
              })
            )}
            <p className="text-xs text-slate-500 pt-1">
              {t('approvalPublishing.activeLimit.selectHint', { count: needed })}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              disabled={!canSwitch}
              onClick={() => onSwitch(selected)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#c45c26] to-[#e11d48] shadow-sm hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${switching ? 'animate-spin' : ''}`} />
              {switching
                ? t('approvalPublishing.activeLimit.switching')
                : mode === 'reconcile'
                  ? t('approvalPublishing.activeLimit.reconcileSwitch')
                  : t('approvalPublishing.activeLimit.switch', {
                      title: activeLabels || targetGigTitle,
                    })}
            </button>
            <button
              type="button"
              disabled={switching}
              onClick={onUpgrade}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowUpRight className="h-4 w-4" />
              {t('approvalPublishing.activeLimit.upgrade', {
                plan: nextPlanHint || t('approvalPublishing.activeLimit.nextPlan'),
              })}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ActiveGigLimitModal;
