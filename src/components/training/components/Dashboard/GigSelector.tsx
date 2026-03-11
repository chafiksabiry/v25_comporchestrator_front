import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { GigFromApi } from '../../types';
import { OnboardingService } from '../../infrastructure/services/OnboardingService';

interface GigSelectorProps {
  companyId?: string;  // Optional - will use cookie if not provided
  industryFilter?: string;  // Optional industry filter
  industryName?: string; // Add industryName for display mapping
  onGigSelect: (gig: GigFromApi) => void;
  selectedGigId?: string;
}

export default function GigSelector({ companyId, industryFilter, industryName, onGigSelect, selectedGigId }: GigSelectorProps) {
  const [gigs, setGigs] = useState<GigFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchGigs = async () => {
      try {
        setLoading(true);

        let response;

        // If industry filter is provided, use it
        if (industryFilter) {
          response = await OnboardingService.fetchGigsByIndustry(industryFilter, companyId);
        } else {
          response = await OnboardingService.fetchGigsByCompany(companyId);
        }

        if (!response.data || response.data.length === 0) {
          setGigs([]);
          if (!industryFilter) {
            console.log('No gigs available for this company. Please contact support.');
          }
        } else {
          setGigs(response.data);
        }
      } catch (err: any) {
        setGigs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGigs();
  }, [companyId, industryFilter, industryName]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-gray-600">Loading available gigs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-xl w-full">
        <select
          value={selectedGigId || ''}
          onChange={(e) => {
            const selectedGig = gigs.find(g => g._id === e.target.value);
            if (selectedGig) onGigSelect(selectedGig);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white"
        >
          <option value="" disabled>Select a position...</option>
          {gigs.map((gig) => (
            <option key={gig._id} value={gig._id}>
              {gig.title} {gig.destination_zone?.name?.common ? ` - ${gig.destination_zone.name.common}` : ''}
            </option>
          ))}
        </select>
        {gigs.length === 0 && (
          <div className="mt-2 flex items-center text-amber-600 text-xs bg-amber-50 p-2 rounded-md border border-amber-100">
            <AlertCircle className="h-4 w-4 mr-1.5 flex-shrink-0" />
            <span>No gigs available for "{industryName || industryFilter}". Please select a different industry.</span>
          </div>
        )}
      </div>
    </div>
  );
}
