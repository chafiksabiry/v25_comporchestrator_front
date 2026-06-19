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
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
      <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-harx-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">{label}</p>
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
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/30 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-harx px-5 py-4">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <span className="text-lg font-black text-white">{initials}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-white tracking-tight truncate">{fullName}</h2>
              {lead.Deal_Name && lead.Deal_Name !== fullName && (
                <p className="text-xs font-medium text-white/80 truncate">{lead.Deal_Name}</p>
              )}
              {(lead.Stage || lead.Pipeline) && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {lead.Stage && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20">
                      {lead.Stage}
                    </span>
                  )}
                  {lead.Pipeline && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/10 text-white/90 border border-white/15">
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
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content — compact grid, no scroll */}
        <div className="p-4 space-y-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              {t('uploadContacts.list.details.contactInfo')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <DetailRow icon={Mail} label={t('uploadContacts.list.table.email')} value={lead.Email_1} highlight />
              <DetailRow icon={Phone} label={t('uploadContacts.list.table.mobile')} value={lead.Phone} />
            </div>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              {t('uploadContacts.list.details.addressInfo')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="sm:col-span-2">
                <DetailRow icon={MapPin} label={t('uploadContacts.list.table.address')} value={lead.Address} />
              </div>
              <DetailRow icon={Globe} label={t('uploadContacts.list.table.city')} value={lead.City} />
              <DetailRow icon={Hash} label={t('uploadContacts.list.table.postalCode')} value={lead.Postal_Code} />
            </div>
          </div>

          {(lead.Date_of_Birth || lead.updatedAt) && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                {t('uploadContacts.list.details.additionalInfo')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {lead.Date_of_Birth && (
                  <DetailRow icon={Calendar} label={t('uploadContacts.preview.dob')} value={formatDate(lead.Date_of_Birth)} />
                )}
                {lead.updatedAt && (
                  <DetailRow icon={User} label={t('uploadContacts.list.details.lastUpdated')} value={formatDate(lead.updatedAt)} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 pb-4 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            {t('uploadContacts.list.details.close')}
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black text-white bg-gradient-harx rounded-xl hover:brightness-110 transition-all shadow-md shadow-harx-500/20"
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
