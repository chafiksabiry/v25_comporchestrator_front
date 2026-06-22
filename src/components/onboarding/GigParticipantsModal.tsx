import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Briefcase, RefreshCw, Users, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getActiveAgentsForCompany } from '../../api/matching';
import { ProgressService } from '../training/infrastructure/services/ProgressService';

type GigParticipantsModalProps = {
  gigId: string;
  gigTitle: string;
  companyId: string;
  onClose: () => void;
};

type ParticipantRow = {
  id: string;
  repId: string;
  name: string;
  email: string;
  journeyTitle?: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
};

const GigParticipantsModal: React.FC<GigParticipantsModalProps> = ({
  gigId,
  gigTitle,
  companyId,
  onClose,
}) => {
  const { t } = useTranslation();
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParticipants = useCallback(async () => {
    if (!companyId || !gigId) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const activeAgents = await getActiveAgentsForCompany(companyId);
      const filteredAgents = (Array.isArray(activeAgents) ? activeAgents : []).filter((record: any) => {
        const recordGigId = record?.gigId?._id || record?.gigId || record?.gig?._id;
        return String(recordGigId) === String(gigId);
      });

      const entries = filteredAgents
        .map((record: any) => {
          const agent = record?.agentId && typeof record.agentId === 'object' ? record.agentId : record;
          return {
            repId: String(agent?._id || agent?.id || record?.agentId || ''),
            gigId: String(gigId),
          };
        })
        .filter((entry) => entry.repId);

      const bulkProgress = await ProgressService.getCompanyParticipantsProgress(companyId, {
        gigId,
        entries,
      });

      const progressByKey = new Map(
        (bulkProgress?.participants || []).map((row) => [`${row.repId}:${row.gigId}`, row])
      );

      const rows: ParticipantRow[] = filteredAgents.map((record: any, index: number) => {
        const agent = record?.agentId && typeof record.agentId === 'object' ? record.agentId : record;
        const repId = String(agent?._id || agent?.id || record?.agentId || '');
        const apiRow = progressByKey.get(`${repId}:${gigId}`);

        return {
          id: String(repId || record?._id || index),
          repId,
          name:
            agent?.personalInfo?.name ||
            agent?.name ||
            apiRow?.name ||
            t('repOnboarding.participants.unnamed'),
          email: agent?.personalInfo?.email || agent?.email || apiRow?.email || '',
          journeyTitle: apiRow?.journeyTitle,
          progress: apiRow?.progress ?? 0,
          status: apiRow?.status ?? 'not_started',
        };
      });

      setParticipants(rows);
    } catch (error) {
      console.error('[GigParticipantsModal] fetch error:', error);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, gigId, t]);

  useEffect(() => {
    void fetchParticipants();
  }, [fetchParticipants]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const openFullTrainingView = () => {
    window.location.hash = `#/dashboard/training?gigId=${encodeURIComponent(gigId)}&tab=participants`;
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[min(90vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-white px-5 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-indigo-600">
              <Users className="h-4 w-4 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {t('gigDetails.participantsModal.label')}
              </span>
            </div>
            <h2 className="truncate text-lg font-black text-slate-900">{gigTitle}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{t('repOnboarding.participants.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
            aria-label={t('gigDetails.participantsModal.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <span className="text-xs font-bold text-slate-500">
            {loading
              ? t('repOnboarding.participants.loading')
              : t('gigDetails.participantsModal.count', { count: participants.length })}
          </span>
          <button
            type="button"
            onClick={() => void fetchParticipants()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('repOnboarding.participants.refresh')}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="mt-4 text-sm font-medium text-slate-600">
                {t('repOnboarding.participants.loading')}
              </p>
            </div>
          ) : participants.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/30 py-16 text-center">
              <Users className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-base font-bold text-slate-900">
                {t('repOnboarding.participants.emptyTitle')}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                {t('repOnboarding.participants.emptyDesc')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/90">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {t('repOnboarding.participants.name')}
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {t('repOnboarding.participants.training')}
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {t('repOnboarding.participants.progress')}
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {t('repOnboarding.participants.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {participants.map((participant) => (
                    <tr key={participant.id} className="hover:bg-indigo-50/40">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{participant.name}</div>
                        {participant.email ? (
                          <a
                            href={`mailto:${participant.email}`}
                            className="text-xs text-slate-500 hover:text-indigo-600 hover:underline"
                          >
                            {participant.email}
                          </a>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-700">
                        {participant.journeyTitle || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                              style={{ width: `${participant.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold tabular-nums text-slate-700">
                            {participant.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            participant.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : participant.status === 'in_progress'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {participant.status === 'completed'
                            ? t('repOnboarding.participants.statusCompleted')
                            : participant.status === 'in_progress'
                            ? t('repOnboarding.participants.statusInProgress')
                            : t('repOnboarding.participants.statusNotStarted')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            {t('gigDetails.participantsModal.close')}
          </button>
          <button
            type="button"
            onClick={openFullTrainingView}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:from-indigo-700 hover:to-purple-700"
          >
            <Briefcase className="h-4 w-4" />
            {t('gigDetails.participantsModal.openTraining')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GigParticipantsModal;
