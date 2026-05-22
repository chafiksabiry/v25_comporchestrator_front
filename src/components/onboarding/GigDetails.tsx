import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import Swal from 'sweetalert2';
import GigDetailsView from './GigDetailsView';
import {
  Plus,
  Trash2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Gig {
  _id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  industries: any;
  activities: any;
  skills: any;
  destination_zone: any;
  highlights: any;
  deliverables: any;
  userId: any;
  companyId: any;
  [key: string]: any; 
  seniority: {
    level: string;
    yearsExperience: string;
  };
  commission: {
    base: string;
    baseAmount: string;
    bonus: string;
    bonusAmount: string;
    structure: string;
    currency: {
      _id: string;
      code: string;
      name: string;
      symbol: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
      __v: number;
    };
    transactionCommission: any;
    commission_per_call?: number;
    minimumVolume?: {
      amount: string | number;
      period: string;
      unit: string;
    };
    additionalDetails?: string;
  };
  availability: {
    minimumHours: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    schedule: Array<{
      day: string;
      hours: {
        start: string;
        end: string;
      };
      _id: string;
    }>;
    time_zone: {
      _id: string;
      countryCode: string;
      countryName: string;
      zoneName: string;
      gmtOffset: number;
      lastUpdated: string;
      __v: number;
      createdAt: string;
      updatedAt: string;
    };
    flexibility: string[];
  };
  team: {
    size: string;
    structure: Array<{
      seniority: {
        level: string;
        yearsExperience: string;
      };
      roleId: string;
      count: number;
      _id: string;
    }>;
    territories: Array<{
      name: {
        common: string;
        official: string;
        nativeName: {
          [key: string]: {
            official: string;
            common: string;
            _id: string;
          };
        };
      };
      flags: {
        png: string;
        svg: string;
        alt: string;
      };
      _id: string;
      cca2: string;
      __v: number;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

interface GigResponse {
  data: Gig[];
}

interface GigDetailsProps {
  onAddNew?: () => void;
  /** Bump after gig creation so the list + setup warnings refresh. */
  refreshKey?: number;
}

/** Normalised gig status (API may return `to_activate`, `TO_ACTIVATE`, etc.). */
function normalizeGigStatus(status: string | undefined): string {
  return (status || '').toLowerCase().replace(/-/g, '_');
}

/** True when the gig is created but not yet activated (still in setup). */
function isGigPendingActivation(gig: Gig): boolean {
  const s = normalizeGigStatus(gig.status);
  if (s === 'active') return false;
  return ['to_activate', 'pending', 'draft'].includes(s);
}

/**
 * Show setup/activation warning for this gig when its status is still
 * pending activation (created but not yet active). The commission model
 * is no longer part of the rule — any unfinished gig should surface the
 * checklist so the rep can complete telephony, contacts, script, KB,
 * e-learning, session planning and activation before going live.
 */
function shouldWarnForGig(gig: Gig): boolean {
  return isGigPendingActivation(gig);
}

const GigDetails: React.FC<GigDetailsProps> = ({ onAddNew, refreshKey = 0 }) => {
  const { t } = useTranslation();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const companyId = Cookies.get('companyId');

  useEffect(() => {
    const fetchGigs = async () => {
      if (!companyId) {
        setError(t('gigDetails.errors.companyId'));
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get<GigResponse>(`${import.meta.env.VITE_API_URL_GIGS}/gigs/company/${companyId}?populate=companyId`);
        setGigs(response.data.data);
      } catch (err) {
        setError(t('gigDetails.errors.fetchFailed'));
        console.error('Error fetching gigs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGigs();
  }, [companyId, refreshKey]);

  // Pending gigs are surfaced by the shared `GigSetupChecklist` widget below
  // (per-gig API probing + Continue buttons). Here we only need to know if a
  // row should pulse amber for visual emphasis.

  const getStatusColor = (status: string) => {
    if (!status) {
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-slate-200'
      };
    }
    switch (status.toLowerCase().replace(/-/g, '_')) {
      case 'active':
        return {
          bg: 'bg-emerald-50/75 backdrop-blur-xs',
          text: 'text-emerald-600',
          border: 'border-emerald-100'
        };
      case 'to_activate':
        return {
          bg: 'bg-amber-50/75 backdrop-blur-xs',
          text: 'text-amber-700',
          border: 'border-amber-200'
        };
      case 'pending':
        return {
          bg: 'bg-amber-50/75 backdrop-blur-xs',
          text: 'text-amber-600',
          border: 'border-amber-100'
        };
      case 'completed':
        return {
          bg: 'bg-purple-50/75 backdrop-blur-xs',
          text: 'text-purple-600',
          border: 'border-purple-100'
        };
      case 'cancelled':
        return {
          bg: 'bg-rose-50/75 backdrop-blur-xs',
          text: 'text-rose-600',
          border: 'border-rose-100'
        };
      default:
        return {
          bg: 'bg-slate-50',
          text: 'text-slate-600',
          border: 'border-slate-200'
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-harx-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600 bg-red-50 rounded-xl border border-red-200">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      </div>
    );
  }

  // If a gig is selected, show the details view
  if (selectedGig) {
    const rawGig = selectedGig as any;
    
    // Map populated API data back into the flat GigData structure expected by GigReview
    const mappedGig = {
      ...rawGig,
      destination_zone: rawGig.destination_zone,
      commission: {
        ...rawGig.commission,
        currency: rawGig.commission?.currency?._id || rawGig.commission?.currency
      },
      skills: {
        ...rawGig.skills,
        professional: rawGig.skills?.professional?.map((s: any) => ({
          skill: s.skill,
          level: s.level || 50
        })) || [],
        technical: rawGig.skills?.technical?.map((s: any) => ({
          skill: s.skill,
          level: s.level || 50
        })) || [],
        soft: rawGig.skills?.soft?.map((s: any) => ({
          skill: s.skill,
          level: s.level || 50
        })) || [],
        languages: rawGig.skills?.languages?.map((l: any) => ({
          language: l.language,
          proficiency: l.proficiency || 'Intermediate',
          iso639_1: l.language?.iso639_1 || 'en'
        })) || []
      },
      industries: rawGig.industries?.map((i: any) => i._id || i) || [],
      activities: rawGig.activities?.map((a: any) => a._id || a) || [],
      schedule: {
         ...rawGig.schedule,
         schedules: rawGig.availability?.schedule?.map((s: any) => ({
            day: s.day,
            hours: s.hours
         })) || []
      }
    };

    
    return (
      <GigDetailsView
        gig={mappedGig as any}
        onBack={() => setSelectedGig(null)}
      />
    );
  }

  const handleDelete = async (e: React.MouseEvent, gigId: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await axios.delete(`${import.meta.env.VITE_API_URL_GIGS}/gigs/${gigId}`);
      setGigs((prev: any[]) => prev.filter(g => g._id !== gigId));

      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
      Toast.fire({
        icon: 'success',
        title: t('gigDetails.success.deleted')
      });

    } catch (err) {
      console.error('Error deleting gig:', err);
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      Toast.fire({
        icon: 'error',
        title: t('gigDetails.errors.deleteFailed')
      });
    }
  };

  return (
    <div className="w-full py-4 space-y-6 bg-slate-50/50 rounded-[2rem] border border-slate-100/80 p-6 sm:p-8 relative overflow-hidden shadow-xl shadow-slate-100/40 animate-slide-up">
      {/* Soft ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-500/[0.03] rounded-full blur-[100px] pointer-events-none animate-float-slow" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-rose-500/[0.03] rounded-full blur-[100px] pointer-events-none animate-float-slow" style={{ animationDelay: '-3s' }} />

      {/* Header Area - Glassmorphic Branded Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 p-6 sm:p-8 shadow-md shadow-slate-100/50 hover-lift z-10">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 font-black">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-black text-slate-900 leading-tight uppercase tracking-tight bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950">
              {t('gigDetails.title')}
            </h1>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
              {t('gigDetails.subtitle')}
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 via-purple-600 to-indigo-600 hover:from-purple-700 hover:via-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105 active:scale-95"
            onClick={() => {
              if (onAddNew) {
                onAddNew();
              } else {
                window.location.href = '/app6';
              }
            }}
          >
            <Plus className="w-4 h-4" />
            {t('gigDetails.addNew')}
          </button>
        </div>
        {/* Subtle geometric circles */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-slate-50 rounded-full pointer-events-none border border-slate-100/30" />
      </div>

      {gigs.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl shadow-sm z-10 relative">
          <div className="mx-auto w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse-subtle">
            <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">{t('gigDetails.empty.title')}</h3>
          <p className="text-slate-400 font-medium max-w-md mx-auto text-sm">{t('gigDetails.empty.subtitle')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-md border border-slate-100/80 overflow-hidden h-[calc(100vh-280px)] flex flex-col min-h-[400px] z-10 relative">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 items-center">
            <div className="col-span-2">{t('gigDetails.table.status')}</div>
            <div className="col-span-5 pl-4 border-l border-slate-200">{t('gigDetails.table.gigAndCategory')}</div>
            <div className="col-span-3 pl-4 border-l border-slate-200">COMMISSION & REVENUE</div>
            <div className="col-span-2 text-right">{t('gigDetails.table.strategicActions')}</div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto scrollbar-auto pr-2 p-4 space-y-3 min-h-0 bg-slate-50/20">
            {gigs.map((gig, index) => {
              const statusColors = getStatusColor(gig.status);
              const rowWarn = shouldWarnForGig(gig);

              return (
                <div
                  key={gig._id}
                  className="animate-fade-in-row"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                <div
                  className={`grid grid-cols-12 gap-4 items-center rounded-2xl bg-white border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg group cursor-default ${
                    rowWarn
                      ? 'border-amber-200/90 ring-1 ring-amber-100/80 hover:border-amber-300 hover:shadow-amber-500/[0.06]'
                      : 'border-slate-100/80 hover:border-purple-200/80 hover:shadow-purple-500/[0.02]'
                  }`}
                >
                  {/* Status */}
                  <div className="col-span-2">
                    <div className={`inline-flex px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                      {gig.status}
                    </div>
                  </div>

                  {/* Title & Category */}
                  <div className="col-span-5 pl-4 border-l border-slate-100">
                    <h3 className="text-base font-black text-slate-800 group-hover:text-purple-600 transition-colors leading-tight truncate">
                      {gig.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100/50 italic">
                        {gig.category || t('gigDetails.standard')}
                      </span>
                    </div>
                  </div>

                  {/* Commission & Revenue */}
                  <div className="col-span-3 border-l border-slate-100 pl-4">
                    <div className="flex flex-wrap gap-2">
                      {/* Call Commission */}
                      {gig.commission?.commission_per_call && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-cyan-50 text-cyan-600 border border-cyan-100/70 shadow-xs hover:scale-105 transition-all duration-300">
                          Call: {gig.commission.commission_per_call}€
                        </span>
                      )}
                      {/* Transaction Commission */}
                      {(gig.commission?.transactionCommission !== undefined && gig.commission?.transactionCommission !== null) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-purple-50 text-purple-600 border border-purple-100/70 shadow-xs hover:scale-105 transition-all duration-300">
                          Trans: {typeof gig.commission.transactionCommission === 'number'
                            ? gig.commission.transactionCommission
                            : (gig.commission.transactionCommission?.amount || '21')}€
                        </span>
                      )}
                      {/* Bonus Commission */}
                      {gig.commission?.bonusAmount && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-rose-50 text-rose-600 border border-rose-100/70 shadow-xs hover:scale-105 transition-all duration-300">
                          Bonus: +{gig.commission.bonusAmount}€
                        </span>
                      )}
                      {/* Fallback if no commission configured */}
                      {!gig.commission?.commission_per_call && 
                       !gig.commission?.transactionCommission && 
                       !gig.commission?.bonusAmount && (
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          No Commission Configured
                        </span>
                      )}
                    </div>

                    {/* Additional details */}
                    {(gig.commission?.minimumVolume || gig.commission?.additionalDetails) && (
                      <div className="mt-2 text-[9px] text-slate-400 font-bold uppercase tracking-wide leading-tight space-y-0.5">
                        {gig.commission?.minimumVolume && (
                          <div className="flex items-center gap-1 text-slate-500 font-extrabold">
                            <span className="text-rose-500 text-[10px] animate-pulse">🎯</span>
                            <span>
                              Bonus: every {gig.commission.minimumVolume.amount} {gig.commission.minimumVolume.unit || 'calls'} / {gig.commission.minimumVolume.period || 'month'}
                            </span>
                          </div>
                        )}
                        {gig.commission?.additionalDetails && (
                          <div className="text-[9px] text-slate-400 font-medium normal-case line-clamp-1 italic text-slate-400/80 pl-3.5">
                            "{gig.commission.additionalDetails}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Strategic Actions */}
                  <div className="col-span-2 flex justify-end items-center gap-3">
                    <button
                      className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 hover:scale-110 active:scale-90 transition-all duration-300 shadow-sm"
                      onClick={(e) => handleDelete(e, gig._id)}
                      title={t('gigDetails.terminate')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md hover:shadow-lg hover:shadow-purple-500/10 hover:scale-105 active:scale-95 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedGig(gig);
                      }}
                    >
                      {t('gigDetails.detailsBtn')}
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

                {rowWarn && (
                  <div
                    role="status"
                    className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-2 text-[11px] font-bold leading-snug text-amber-900"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>{t('gigDetails.setupBanner.rowWarning')}</span>
                  </div>
                )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Styled custom classes and animations */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        .animate-float-slow {
          animation: floatSlow 10s infinite ease-in-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes fadeInRow {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-row {
          animation: fadeInRow 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes subtlePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(168, 85, 247, 0); }
          50% { transform: scale(1.03); box-shadow: 0 0 10px rgba(168, 85, 247, 0.15); }
        }
        .animate-pulse-subtle {
          animation: subtlePulse 3s infinite ease-in-out;
        }
        .hover-lift {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px -10px rgba(15, 23, 42, 0.05);
        }
      `}</style>
    </div>
  );
};

export default GigDetails;

