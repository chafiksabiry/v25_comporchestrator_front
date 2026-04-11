import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ChevronDown } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-fuchsia-200 bg-gradient-to-r from-fuchsia-50/80 to-purple-50/50 py-5">
        <Loader2 className="h-6 w-6 animate-spin text-fuchsia-600" />
        <p className="text-xs font-medium text-fuchsia-900/80 md:text-sm">Loading available gigs…</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="relative w-full">
        <select
          value={selectedGigId || ''}
          onChange={(e) => {
            const selectedGig = gigs.find(g => g._id === e.target.value);
            if (selectedGig) onGigSelect(selectedGig);
          }}
          disabled={gigs.length === 0}
          className="w-full cursor-pointer appearance-none rounded-xl border-2 border-fuchsia-200/90 bg-gradient-to-b from-white to-purple-50/35 py-2 pl-3 pr-10 text-sm font-medium text-gray-900 shadow-sm transition-all outline-none hover:border-fuchsia-400 hover:shadow-md hover:shadow-fuchsia-500/10 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 md:py-2.5 md:pl-4 md:pr-12 md:text-base"
        >
          <option value="" disabled className="text-gray-500">
            Select a gig…
          </option>
          {gigs.map((gig) => (
            <option key={gig._id} value={gig._id} className="bg-white text-gray-900">
              {gig.title}
              {gig.destination_zone?.name?.common ? ` — ${gig.destination_zone.name.common}` : ''}
            </option>
          ))}
        </select>
        <ChevronDown
          className={`pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 md:right-3.5 md:h-5 md:w-5 ${gigs.length === 0 ? 'text-gray-400' : 'text-fuchsia-600'}`}
          aria-hidden
        />
      </div>
      {gigs.length === 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-sm text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>
            No gigs for &quot;{industryName || industryFilter || 'this industry'}&quot;. Choose another industry above.
          </span>
        </div>
      )}
    </div>
  );
}
