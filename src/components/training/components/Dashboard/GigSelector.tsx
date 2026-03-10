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

      <div className="max-w-xl w-full">
        <select
          value={selectedGigId || ''}
          onChange={(e) => {
            const selectedGig = gigs.find(g => g._id === e.target.value);
            if (selectedGig) onGigSelect(selectedGig);
          }}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg bg-white"
        >
          <option value="" disabled>Select a position...</option>
          {gigs.map((gig) => (
            <option key={gig._id} value={gig._id}>
              {gig.title} {gig.destination_zone?.name?.common ? ` - ${gig.destination_zone.name.common}` : ''}
            </option>
          ))}
        </select>

        {/* Show selected details if any */}
        {selectedGigId && gigs.find(g => g._id === selectedGigId) && (() => {
          const gig = gigs.find(g => g._id === selectedGigId)!;
          return (
            <div className="mt-6 border border-blue-200 bg-blue-50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-blue-900">{gig.title}</h4>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(gig.status)}`}>
                  {gig.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {gig.description && (
                <p className="text-sm text-blue-800 line-clamp-2 mt-1 mb-3">{gig.description}</p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                {gig.category && (
                  <div className="flex items-center">
                    <Briefcase className="h-3 w-3 mr-1 opacity-70" />
                    <span>{gig.category}</span>
                  </div>
                )}
                {gig.seniority?.level && (
                  <div className="flex items-center">
                    <Users className="h-3 w-3 mr-1 opacity-70" />
                    <span>{gig.seniority.level}</span>
                  </div>
                )}
                {gig.availability?.minimumHours?.weekly && (
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1 opacity-70" />
                    <span>{gig.availability.minimumHours.weekly}h/week</span>
                  </div>
                )}
                {gig.destination_zone?.name?.common && (
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1 opacity-70" />
                    <span>{gig.destination_zone.name.common}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

