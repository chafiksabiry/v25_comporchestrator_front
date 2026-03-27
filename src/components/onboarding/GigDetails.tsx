import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import Swal from 'sweetalert2';
import GigDetailsView from './GigDetailsView';
import { Phone, Repeat, Star, Target } from 'lucide-react';

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

const GigDetails = () => {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const companyId = Cookies.get('companyId');

  console.log('GigDetails render - selectedGig:', selectedGig);

  useEffect(() => {
    const fetchGigs = async () => {
      if (!companyId) {
        setError('Company ID not found');
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get<GigResponse>(`${import.meta.env.VITE_GIGS_API}/gigs/company/${companyId}?populate=companyId`);
        setGigs(response.data.data);
      } catch (err) {
        setError('Failed to fetch gigs');
        console.error('Error fetching gigs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGigs();
  }, [companyId]);

  const getStatusColor = (status: string) => {
    if (!status) {
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        border: 'border-gray-200'
      };
    }
    switch (status.toLowerCase()) {
      case 'active':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200'
        };
      case 'pending':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200'
        };
      case 'completed':
        return {
          bg: 'bg-harx-50',
          text: 'text-harx-700',
          border: 'border-harx-200'
        };
      case 'cancelled':
        return {
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-600',
          border: 'border-gray-200'
        };
    }
  };


  const getAvailabilityText = (availability: Gig['availability']) => {
    if (!availability) return 'Not specified';

    if (availability.schedule && availability.schedule.length > 0) {
      const days = availability.schedule.length;
      return `${days} day${days > 1 ? 's' : ''}/week`;
    }
    return 'Flexible';
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
    console.log('Rendering GigDetailsView with gig:', selectedGig);
    return (
      <GigDetailsView
        gig={selectedGig as any}
        onBack={() => setSelectedGig(null)}
      />
    );
  }

  const handleDelete = async (e: React.MouseEvent, gigId: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await axios.delete(`${import.meta.env.VITE_GIGS_API}/gigs/${gigId}`);
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
        title: 'Gig deleted successfully'
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
        title: 'Failed to delete gig'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gig Details</h2>
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-2 bg-gradient-harx hover:opacity-90 text-white font-bold px-5 py-2 rounded-full shadow-lg shadow-harx-500/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-harx-400"
            onClick={() => { window.location.href = '/app6'; }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add gig
          </button>
        </div>
      </div>
      {gigs.length === 0 ? (
        <div className="text-center py-20 bg-white/40 backdrop-blur-md rounded-[2rem] border-2 border-dashed border-gray-200">
          <div className="mx-auto w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">No intelligence assets found</h3>
          <p className="text-gray-500 font-medium">Initialize your first gig to start the matching process.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-gray-900 rounded-2xl text-[10px] font-black text-white/60 uppercase tracking-[0.2em] shadow-xl italic">
            <div className="col-span-1">Status</div>
            <div className="col-span-3">Gig & Category</div>
            <div className="col-span-4">Commission ROI</div>
            <div className="col-span-2">Commitment</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* List Items */}
          <div className="space-y-3">
            {gigs.map((gig) => {
              const statusColors = getStatusColor(gig.status);

              return (
                <div
                  key={gig._id}
                  className="grid grid-cols-12 gap-4 items-center rounded-3xl bg-white/60 backdrop-blur-md border border-white/40 p-5 transition-all duration-300 hover:bg-white hover:shadow-xl hover:shadow-harx-500/10 group cursor-default"
                >
                  {/* Status */}
                  <div className="col-span-1">
                    <div className={`inline-flex px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                      {gig.status}
                    </div>
                  </div>

                  {/* Title & Category */}
                  <div className="col-span-3 pl-4 border-l border-gray-100">
                    <h3 className="text-lg font-black text-gray-900 group-hover:text-harx-600 transition-colors leading-tight truncate">
                      {gig.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-harx-500 uppercase tracking-widest bg-harx-50 px-2 py-0.5 rounded-md border border-harx-100 italic">
                        {gig.category || 'Standard'}
                      </span>
                    </div>
                  </div>

                  {/* Configuration (Commission Dashboard) */}
                  <div className="col-span-3 border-l border-gray-100 pl-6">
                    <div className="flex items-center gap-6 h-full">
                      {/* Per Call */}
                      <div className="flex flex-col items-center min-w-[70px]">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Per Call</span>
                        <div className="flex items-center gap-1.5 font-black text-gray-900">
                          <Phone className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-xl leading-none">{gig.commission?.commission_per_call || 0}€</span>
                        </div>
                      </div>

                      {/* Per Transaction */}
                      <div className="flex flex-col items-center min-w-[70px]">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Per Sale</span>
                        <div className="flex items-center gap-1.5 font-black text-gray-900">
                          <Repeat className="w-3.5 h-3.5 text-harx-500" />
                          <span className="text-xl leading-none">
                            {typeof gig.commission?.transactionCommission === 'object' 
                              ? gig.commission?.transactionCommission.amount 
                              : (gig.commission?.transactionCommission || 0)}
                            €
                          </span>
                        </div>
                      </div>

                      {/* Bonus */}
                      <div className="flex flex-col items-center min-w-[70px]">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Bonus ROI</span>
                        <div className="flex items-center gap-1.5 font-black text-gray-900">
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xl leading-none">{gig.commission?.bonusAmount || 0}€</span>
                        </div>
                      </div>

                      {/* Min Volume */}
                      <div className="flex flex-col items-center min-w-[70px]">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Target</span>
                        <div className="flex items-center gap-1.5 font-black text-gray-900">
                          <Target className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xl leading-none">{gig.commission?.minimumVolume?.amount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Commitment (Availability & Team) */}
                  <div className="col-span-2 border-l border-gray-100 pl-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-bold text-gray-700">{getAvailabilityText(gig.availability)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-xs font-bold text-gray-700">{gig.team?.size || '1'} reps</span>
                      </div>
                    </div>
                  </div>

                  {/* Strategic Actions */}
                  <div className="col-span-2 flex justify-end items-center gap-3">
                    <button
                      className="p-3 rounded-2xl bg-gray-50 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-gray-100 transition-all duration-300 shadow-sm"
                      onClick={(e) => handleDelete(e, gig._id)}
                      title="Terminate Intelligence Asset"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      className="flex items-center gap-2 bg-gradient-harx text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-harx-500/20 hover:shadow-harx-500/40 hover:-translate-y-0.5 transition-all duration-300"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedGig(gig);
                      }}
                    >
                      Analyze
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GigDetails;

