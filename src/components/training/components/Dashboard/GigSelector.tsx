import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { GigFromApi } from '../../types';
import { OnboardingService } from '../../infrastructure/services/OnboardingService';

interface GigSelectorProps {
  companyId?: string;
  industryFilter?: string;
  industryName?: string;
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
      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-fuchsia-500" />
        <p className="text-xs text-gray-500">Loading gigs...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="relative w-full">
        <select
          value={selectedGigId || ''}
          onChange={(e) => {
            const g = gigs.find(g => g._id === e.target.value);
            if (g) onGigSelect(g);
          }}
          disabled={gigs.length === 0}
          className="w-full cursor-pointer appearance-none rounded-lg border border-gray-300 py-2.5 pl-3 pr-10 text-sm text-gray-900 transition-all outline-none hover:border-gray-400 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
        >
          <option value="" disabled className="text-gray-400">
            Select a gig...
          </option>
          {gigs.map((gig) => (
            <option key={gig._id} value={gig._id}>
              {gig.title}
              {gig.destination_zone?.name?.common ? ` — ${gig.destination_zone.name.common}` : ''}
            </option>
          ))}
        </select>
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${gigs.length === 0 ? 'text-gray-300' : 'text-gray-400'}`}
          aria-hidden
        />
      </div>
      {gigs.length === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
          <span>No gigs for &quot;{industryName || industryFilter || 'this industry'}&quot;. Choose another industry.</span>
        </div>
      )}
    </div>
  );
}
