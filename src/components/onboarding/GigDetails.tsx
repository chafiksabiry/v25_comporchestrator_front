import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

interface Gig {
  _id: string;
  title: string;
  description: string;
  status: string;
  category: string;
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
    currency: string;
    transactionCommission: {
      type: string;
      amount: string;
    };
  };
  availability: {
    schedule: Array<{
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }>;
    timeZone: string;
    flexibility: string[];
  };
  team: {
    size: string;
    territories: string[];
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
  const companyId = Cookies.get('companyId');

  useEffect(() => {
    const fetchGigs = async () => {
      if (!companyId) {
        setError('Company ID not found');
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get<GigResponse>(`${import.meta.env.VITE_GIGS_API}/gigs/company/${companyId}`);
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
        bg: 'bg-gradient-to-r from-gray-400 to-gray-600',
        text: 'text-white',
        border: 'border-gray-500'
      };
    }
    
    switch (status.toLowerCase()) {
      case 'active':
        return {
          bg: 'bg-gradient-to-r from-green-400 to-green-600',
          text: 'text-white',
          border: 'border-green-500'
        };
      case 'pending':
        return {
          bg: 'bg-gradient-to-r from-yellow-400 to-orange-500',
          text: 'text-white',
          border: 'border-yellow-500'
        };
      case 'completed':
        return {
          bg: 'bg-gradient-to-r from-blue-400 to-blue-600',
          text: 'text-white',
          border: 'border-blue-500'
        };
      case 'cancelled':
        return {
          bg: 'bg-gradient-to-r from-red-400 to-red-600',
          text: 'text-white',
          border: 'border-red-500'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-400 to-gray-600',
          text: 'text-white',
          border: 'border-gray-500'
        };
    }
  };

  const getCardGradient = (index: number) => {
    const gradients = [
      'from-purple-400 via-pink-500 to-red-500',
      'from-green-400 via-blue-500 to-purple-600',
      'from-yellow-400 via-orange-500 to-red-500',
      'from-pink-400 via-purple-500 to-indigo-500',
      'from-blue-400 via-cyan-500 to-blue-600',
      'from-indigo-400 via-purple-500 to-pink-500',
      'from-emerald-400 via-teal-500 to-emerald-600',
      'from-violet-400 via-purple-500 to-violet-600'
    ];
    return gradients[index % gradients.length];
  };

  const formatCommission = (commission: Gig['commission']) => {
    if (!commission) return 'Not specified';
    
    if (commission.transactionCommission?.amount) {
      return `${commission.transactionCommission.amount} ${commission.currency || 'EUR'}`;
    }
    if (commission.bonusAmount) {
      return `${commission.bonusAmount} ${commission.currency || 'EUR'}`;
    }
    return commission.base || 'Not specified';
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gig Details</h2>
        <div className="text-sm text-gray-500">
          {gigs.length} gig{gigs.length !== 1 ? 's' : ''} found
        </div>
      </div>
      
      {gigs.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No gigs found</h3>
          <p className="text-gray-500">No gigs have been created for this company yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gigs.map((gig, index) => {
            const statusColors = getStatusColor(gig.status);
            const cardGradient = getCardGradient(index);
            
            return (
              <div
                key={gig._id}
                className={`group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br ${cardGradient}`}
              >
                {/* Card Header */}
                <div className="p-6 text-white">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold leading-tight line-clamp-2 flex-1">
                      {gig.title}
                    </h3>
                    <div className={`ml-3 px-3 py-1 rounded-full text-xs font-semibold ${statusColors.bg} ${statusColors.text} border ${statusColors.border} flex-shrink-0`}>
                      {gig.status}
                    </div>
                  </div>
                  
                  {/* Category Badge */}
                  {gig.category && (
                    <div className="mb-3">
                      <span className="inline-block bg-white/20 text-white px-2 py-1 rounded-md text-xs font-medium">
                        {gig.category}
                      </span>
                    </div>
                  )}
                  
                  {/* Description */}
                  <p className="text-white/90 text-sm leading-relaxed mb-4 overflow-hidden" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: '1.4',
                    maxHeight: '4.2em'
                  }}>
                    {gig.description || 'No description available'}
                  </p>
                  
                  {/* Key Info Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Seniority */}
                    {gig.seniority && gig.seniority.level && (
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-white/70 text-xs font-medium mb-1">Seniority</div>
                        <div className="text-white text-sm font-semibold">
                          {gig.seniority.level} ({gig.seniority.yearsExperience || '0'}y)
                        </div>
                      </div>
                    )}
                    
                    {/* Commission */}
                    {gig.commission && (
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-white/70 text-xs font-medium mb-1">Commission</div>
                        <div className="text-white text-sm font-semibold">
                          {formatCommission(gig.commission)}
                        </div>
                      </div>
                    )}
                    
                    {/* Availability */}
                    {gig.availability && (
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-white/70 text-xs font-medium mb-1">Availability</div>
                        <div className="text-white text-sm font-semibold">
                          {getAvailabilityText(gig.availability)}
                        </div>
                      </div>
                    )}
                    
                    {/* Team Size */}
                    {gig.team && gig.team.size && (
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-white/70 text-xs font-medium mb-1">Team Size</div>
                        <div className="text-white text-sm font-semibold">
                          {gig.team.size} members
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/20">
                    <div className="flex items-center text-white/80 text-xs">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {gig.createdAt ? new Date(gig.createdAt).toLocaleDateString() : 'Date unknown'}
                    </div>
                    
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg text-xs font-medium">
                      View Details
                    </button>
                  </div>
                </div>
                
                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GigDetails; 