import toast from 'react-hot-toast';
import { BellRing } from 'lucide-react';
import { createElement } from 'react';
import { playNotificationSound } from '../utils/notificationSound';
import type { EscrowMessage } from './escrowSocket';

export const CALL_ANALYSIS_HELP_EVENT = 'harx:call-analysis-help';

export function dispatchCallAnalysisHelpEvent(data: EscrowMessage) {
  window.dispatchEvent(new CustomEvent(CALL_ANALYSIS_HELP_EVENT, { detail: data }));
}

export function showCallAnalysisHelpToast(data: EscrowMessage) {
  const callId = data.callId ? String(data.callId) : '';
  if (!callId) return;

  playNotificationSound();

  toast(
    (toastData) =>
      createElement(
        'div',
        { className: 'flex items-start gap-3' },
        createElement(BellRing, { className: 'w-5 h-5 text-amber-600 shrink-0' }),
        createElement(
          'div',
          null,
          createElement('p', { className: 'font-bold text-sm' }, 'Analyse bloquée — action requise'),
          createElement(
            'p',
            { className: 'text-xs mt-1 opacity-90' },
            `${data.repName || 'Un rep'} demande une relance pour l'appel avec ${data.leadName || 'un client'}.`
          ),
          createElement(
            'button',
            {
              type: 'button',
              className: 'mt-2 text-xs font-black uppercase tracking-widest text-harx-600',
              onClick: () => {
                toast.dismiss(toastData.id);
                window.location.hash = '#/dashboard/calls';
                dispatchCallAnalysisHelpEvent(data);
              },
            },
            "Voir l'appel"
          )
        )
      ),
    { duration: 10000, icon: null }
  );
}

export function handleCallAnalysisHelpMessage(data: EscrowMessage) {
  if (data?.type !== 'call_analysis_help_requested') return false;
  showCallAnalysisHelpToast(data);
  dispatchCallAnalysisHelpEvent(data);
  return true;
}
