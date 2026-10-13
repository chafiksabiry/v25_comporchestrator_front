/**
 * PendingSaleReviewsPopup
 *
 * Cahier de recette VAL-01: "Pop-up à chaque connexion de l'entreprise [...]
 * indiquant qu'au-delà du délai (délai de rétractation du pays du gig) le
 * REP sera crédité."
 *
 * Fed by `GET /api/escrow/pending-reviews/:companyId` (v25_comporchestrator_back):
 * AI-detected sales the company hasn't approved/refused yet, each with the
 * deadline past which it auto-resolves as if approved
 * (resolveExpiredPendingReviews, hourly cron). Shown once per session on
 * login — dismissible, not blocking.
 */
import React, { useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Clock } from 'lucide-react';
import Cookies from 'js-cookie';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../../../lib/authFetch';
import { getOrchestratorApiBase } from '../../../lib/paypalCheckout';

type PendingReview = {
  _id: string;
  amount: number;
  reviewDeadlineAt?: string;
  description?: string;
  createdAt: string;
};

const SESSION_KEY = 'harx_pending_sale_reviews_dismissed';

function formatDeadline(iso?: string, locale = 'fr-FR'): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function PendingSaleReviewsPopup() {
  const { t, i18n } = useTranslation();
  const [reviews, setReviews] = useState<PendingReview[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === 'true') return;

    const companyId = Cookies.get('companyId');
    if (!companyId) return;

    const apiBase = getOrchestratorApiBase();
    authFetch(`${apiBase}/escrow/pending-reviews/${companyId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const rows: PendingReview[] = Array.isArray(json?.data) ? json.data : [];
        if (rows.length > 0) {
          setReviews(rows);
          setOpen(true);
        }
      })
      .catch(() => {
        /* silent — this is an informational reminder, never blocking */
      });
  }, []);

  const handleClose = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setOpen(false);
  };

  if (!reviews || reviews.length === 0) return null;

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    <Dialog.Title className="text-base font-semibold text-gray-900">
                      {t(
                        'escrow.pendingReviews.title',
                        'Commissions en attente de votre validation'
                      )}
                    </Dialog.Title>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label={t('common.close', 'Fermer')}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="mt-2 text-sm text-gray-600">
                  {t(
                    'escrow.pendingReviews.explain',
                    "{{count}} vente(s) ou rendez-vous/rappel(s) détecté(s) n'ont pas encore été validé(s). Passé le délai indiqué, le REP sera automatiquement crédité.",
                    { count: reviews.length }
                  )}
                </p>

                <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                  {reviews.map((r) => (
                    <li
                      key={r._id}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <div className="font-medium text-gray-900">
                        {r.amount.toFixed(2)} € — {r.description || t('escrow.pendingReviews.sale', 'Vente')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t('escrow.pendingReviews.deadline', 'Crédit automatique le')}{' '}
                        {formatDeadline(r.reviewDeadlineAt, i18n.language === 'en' ? 'en-US' : 'fr-FR')}
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    {t('escrow.pendingReviews.cta', 'Compris')}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default PendingSaleReviewsPopup;
