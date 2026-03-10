import React, { useState, useEffect } from 'react';
import { Briefcase, Calendar, Clock, MapPin, DollarSign, Users, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { GigFromApi } from '../../types';
import { OnboardingService } from '../../infrastructure/services/OnboardingService';

interface GigSelectorProps {
  companyId?: string;  // Optional - will use cookie if not provided
  industryFilter?: string;  // Optional industry filter
  onGigSelect: (gig: GigFromApi) => void;
  selectedGigId?: string;
}

export default function GigSelector({ companyId, industryFilter, onGigSelect, selectedGigId }: GigSelectorProps) {
  const [gigs, setGigs] = useState<GigFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGigs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let response;
        
        // If industry filter is provided, use it
        if (industryFilter) {
          response = await OnboardingService.fetchGigsByIndustry(industryFilter, companyId);
        } else {
          response = await OnboardingService.fetchGigsByCompany(companyId);
        }
        
        if (!response.data || response.data.length === 0) {
          setGigs([]);
          if (industryFilter) {
            setError(`No gigs available for "${industryFilter}" industry. Please try selecting a different industry or contact support.`);
          } else {
            setError('No gigs available for this company. Please contact support.');
          }
        } else {
          setGigs(response.data);
          setError(null);
        }
      } catch (err: any) {
        setGigs([]);
        const errorMessage = err?.message || 'Failed to load available gigs';
        setError(`${errorMessage}. Please try again later or contact support.`);
        console.error('Error loading gigs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGigs();
  }, [companyId, industryFilter]);

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'to_activate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-600">Loading available gigs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-600 font-medium mb-2">Error Loading Gigs</p>
        <p className="text-gray-600 text-sm">{error}</p>
      </div>
    );
  }

  if (gigs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Briefcase className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600">No gigs available for this company.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Select Your Gig</h3>
        <p className="text-gray-600">Choose the gig position you want to train for</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gigs.map((gig) => (
          <div
            key={gig._id}
            onClick={() => onGigSelect(gig)}
            className={`border-2 rounded-xl p-5 cursor-pointer transition-all hover:shadow-lg ${
              selectedGigId === gig._id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 mb-1">{gig.title}</h4>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(gig.status)}`}>
                  {gig.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              {selectedGigId === gig._id && (
                <CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0 ml-2" />
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{gig.description}</p>

            {/* Details Grid */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-gray-700">
                <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                <span className="font-medium mr-2">Category:</span>
                <span>{gig.category}</span>
              </div>

              <div className="flex items-center text-gray-700">
                <Users className="h-4 w-4 mr-2 text-gray-400" />
                <span className="font-medium mr-2">Level:</span>
                <span>{gig.seniority.level} ({gig.seniority.yearsExperience} years)</span>
              </div>

              <div className="flex items-center text-gray-700">
                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                <span className="font-medium mr-2">Hours:</span>
                <span>{gig.availability.minimumHours.weekly}h/week</span>
              </div>

              {gig.commission && (
                <div className="flex items-center text-gray-700">
                  <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="font-medium mr-2">Compensation:</span>
                  <span>
                    {gig.commission.baseAmount} {gig.commission.currency.code} {gig.commission.base}
                  </span>
                </div>
              )}

              {gig.destination_zone && (
                <div className="flex items-center text-gray-700">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="font-medium mr-2">Location:</span>
                  <span>{gig.destination_zone.name?.common}</span>
                </div>
              )}
            </div>

            {/* Industries */}
            {gig.industries && gig.industries.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {gig.industries.slice(0, 2).map((industry) => (
                    <span
                      key={industry._id}
                      className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full"
                    >
                      {industry.name}
                    </span>
                  ))}
                  {gig.industries.length > 2 && (
                    <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      +{gig.industries.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Languages */}
            {gig.skills.languages && gig.skills.languages.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-gray-600">
                  Languages: {gig.skills.languages.map((lang: any) => lang.language.name).join(', ')}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

