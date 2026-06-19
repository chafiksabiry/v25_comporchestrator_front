import React from 'react';
import { createPortal } from 'react-dom';
import {
  X, Mail, Phone, MapPin, Calendar, User, Edit, Globe, Hash,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface LeadDetail {
  _id: string;
  First_Name?: string;
  Last_Name?: string;
  Email_1?: string;
  Phone?: string;
  Address?: string;
  Postal_Code?: string;
  City?: string;
  Date_of_Birth?: string;
  Deal_Name?: string;
  Stage?: string;
  Pipeline?: string;
  updatedAt?: string;
}

interface Props {
  lead: LeadDetail;
  onClose: () => void;
  onEdit?: () => void;
}

function getInitials(lead: LeadDetail): string {
  const first = lead.First_Name?.[0] || '';
  const last = lead.Last_Name?.[0] || '';
  return (first + last).toUpperCase() || '?';
}

function getFullName(lead: LeadDetail): string {
  const name = `${lead.First_Name || ''} ${lead.Last_Name || ''}`.trim();
  return name || lead.Deal_Name || 'Lead';
}

function formatDate(value?: string): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return value;
  }
}

function DetailRow({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-harx-100 hover:bg-white transition-colors">
      <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
        <Icon className="w-4 h-4 text-harx-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
        <p className={`text-sm font-semibold truncate ${highlight ? 'text-harx-600' : 'text-slate-800'}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

export default function LeadDetailModal({ lead, onClose, onEdit }: Props) {
  const { t } = useTranslation();
  const initials = getInitials(lead);
  const fullName = getFullName(lead);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-[28px] bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div className="relative bg-gradient-harx px-6 pt-6 pb-16 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-6 -mb-6" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-black text-white">{initials}</span>
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">{fullName}</h2>
                {lead.Deal_Name && lead.Deal_Name !== fullName && (
                  <p className="text-sm font-medium text-white/80 mt-0.5">{lead.Deal_Name}</p>
                )}
                {(lead.Stage || lead.Pipeline) && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {lead.Stage && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20">
                        {lead.Stage}
                      </span>
                    )}
                    {lead.Pipeline && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-white/90 border border-white/15">
                        {lead.Pipeline}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content card overlapping header */}
        <div className="relative -mt-10 mx-4 mb-4">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 mb-1">
              {t('uploadContacts.list.details.contactInfo')}
            </p>
            <DetailRow icon={Mail} label={t('uploadContacts.list.table.email')} value={lead.Email_1} highlight />
            <DetailRow icon={Phone} label={t('uploadContacts.list.table.mobile')} value={lead.Phone} />

            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 mt-3 mb-1">
              {t('uploadContacts.list.details.addressInfo')}
            </p>
            <DetailRow icon={MapPin} label={t('uploadContacts.list.table.address')} value={lead.Address} />
            <div className="grid grid-cols-2 gap-2">
              <DetailRow icon={Globe} label={t('uploadContacts.list.table.city')} value={lead.City} />
              <DetailRow icon={Hash} label={t('uploadContacts.list.table.postalCode')} value={lead.Postal_Code} />
            </div>

            {(lead.Date_of_Birth || lead.updatedAt) && (
              <>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 mt-3 mb-1">
                  {t('uploadContacts.list.details.additionalInfo')}
                </p>
                {lead.Date_of_Birth && (
                  <DetailRow icon={Calendar} label={t('uploadContacts.preview.dob')} value={formatDate(lead.Date_of_Birth)} />
                )}
                {lead.updatedAt && (
                  <DetailRow icon={User} label={t('uploadContacts.list.details.lastUpdated')} value={formatDate(lead.updatedAt)} />
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            {t('uploadContacts.list.details.close')}
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-gradient-harx rounded-xl hover:brightness-110 transition-all shadow-md shadow-harx-500/20"
            >
              <Edit className="w-3.5 h-3.5" />
              {t('uploadContacts.list.edit.button')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
