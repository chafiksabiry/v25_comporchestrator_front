import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import Swal from 'sweetalert2';
import { GigReview } from '../gigsaicreation/components/GigReview';
import { Clock, Users, Plus } from 'lucide-react';

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
}

const GigDetails: React.FC<GigDetailsProps> = ({ onAddNew }) => {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const companyId = Cookies.get('companyId');

  

  useEffect(() => {
    const fetchGigs = async () => {
      if (!companyId) {
        setError('Company ID not found');
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get<GigResponse>(`${import.meta.env.VITE_API_URL_GIGS}/gigs/company/${companyId}?populate=companyId`);
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
    const rawGig = selectedGig as any;
    
    // Map populated API data back into the flat GigData structure expected by GigReview
    const mappedGig = {
      ...rawGig,
      destination_zone: rawGig.destination_zone?._id || rawGig.destination_zone?.cca2 || rawGig.destination_zone,
      commission: {
        ...rawGig.commission,
        currency: rawGig.commission?.currency?._id || rawGig.commission?.currency
      },
      skills: {
        ...rawGig.skills,
        professional: rawGig.skills?.professional?.map((s: any) => ({
          skill: s.skill?._id || s.skill,
          level: s.level || 50
        })) || [],
        technical: rawGig.skills?.technical?.map((s: any) => ({
          skill: s.skill?._id || s.skill,
          level: s.level || 50
        })) || [],
        soft: rawGig.skills?.soft?.map((s: any) => ({
          skill: s.skill?._id || s.skill,
          level: s.level || 50
        })) || [],
        languages: rawGig.skills?.languages?.map((l: any) => ({
          language: l.language?._id || l.language,
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
      <GigReview
        data={mappedGig as any}
        isReadOnly={true}
        onBack={() => setSelectedGig(null)}
        onEdit={() => {}}
        onSubmit={async () => {}}
        isSubmitting={false}
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
    <div className="w-full py-2 space-y-4 animate-in fade-in duration-500">
      {/* Header Area - Branded Gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-harx p-6 mb-3 shadow-lg shadow-harx-500/20">
        <div className="relative z-10 flex items-center justify-between font-black">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Gig Details</h1>
            <p className="text-[14px] font-medium text-white/90">Define and manage your multi-channel intelligence assets</p>
          </div>
          <button
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-black px-5 py-2.5 rounded-2xl shadow-xl border border-white/20 transition-all duration-200 uppercase tracking-widest text-[10px]"
            onClick={() => {
              if (onAddNew) {
                onAddNew();
              } else {
                window.location.href = '/app6';
              }
            }}
          >
            <Plus className="w-5 h-5" />
            Add New Gig
          </button>
        </div>
        {/* Abstract background pattern */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black/10 rounded-full blur-2xl" />
      </div>
      {gigs.length === 0 ? (
        <div className="text-center py-10 bg-white/40 backdrop-blur-md rounded-[2rem] border-2 border-dashed border-gray-200">
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
            <div className="col-span-6 pl-4 border-l border-white/10">Gig & Category</div>
            <div className="col-span-2 pl-4 border-l border-white/10">Commitment</div>
            <div className="col-span-3 text-right">Strategic Actions</div>
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
                  <div className="col-span-6 pl-4 border-l border-gray-100">
                    <h3 className="text-lg font-black text-gray-900 group-hover:text-harx-600 transition-colors leading-tight truncate">
                      {gig.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-harx-500 uppercase tracking-widest bg-harx-50 px-2 py-0.5 rounded-md border border-harx-100 italic">
                        {gig.category || 'Standard'}
                      </span>
                    </div>
                  </div>

                  {/* Commitment */}
                  <div className="col-span-2 border-l border-gray-100 pl-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs font-bold text-gray-700">{getAvailabilityText(gig.availability)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs font-bold text-gray-700">{gig.team?.size || '1'} reps</span>
                      </div>
                    </div>
                  </div>

                  {/* Strategic Actions */}
                  <div className="col-span-3 flex justify-end items-center gap-3">
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
                      Details
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

