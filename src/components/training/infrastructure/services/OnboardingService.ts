import axios from 'axios';
import Cookies from 'js-cookie';
import { IndustryApiResponse, GigApiResponse, GigFromApi } from '../../types';
import React from 'react';
const REPS_WIZARD_API_URL = 'https://v25repscreationwizardbackend-production.up.railway.app';
const INDUSTRIES_API_URL = `${REPS_WIZARD_API_URL}/api/industries`;
const GIGS_API_URL = 'https://v25gigsmanualcreationbackend-production.up.railway.app/api/gigs/company';
const COMPANY_API_URL = 'https://v25searchcompanywizardbackend-production.up.railway.app/api/companies';

export const OnboardingService = {
  /**
   * Fetch all industries from the API
   */
  async fetchIndustries(): Promise<IndustryApiResponse> {
    try {
      const response = await axios.get<IndustryApiResponse>(INDUSTRIES_API_URL);
      return response.data;
    } catch (error) {
      console.error('Error fetching industries:', error);
      throw new Error('Failed to fetch industries');
    }
  },

  /**
   * Get company ID from cookies or localStorage
   */
  getCompanyId(): string | undefined {
    return Cookies.get('companyId') || localStorage.getItem('companyId') || undefined;
  },

  /**
   * Fetch gigs for a specific company
   * @param companyId - The company ID to fetch gigs for (optional, will use cookie if not provided)
   */
  async fetchGigsByCompany(companyId?: string): Promise<GigApiResponse> {
    try {
      // Use provided companyId or get from cookie
      const effectiveCompanyId = companyId || this.getCompanyId();

      if (!effectiveCompanyId) {
        throw new Error('No company ID provided or found in cookies');
      }

      const response = await axios.get<GigApiResponse>(`${GIGS_API_URL}/${effectiveCompanyId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching gigs for company:`, error);
      throw new Error('Failed to fetch gigs');
    }
  },

  /**
   * Fetch and filter gigs by industry
   * @param industryIdentifier - The industry ID or name to filter by
   * @param companyId - The company ID (optional, will use cookie if not provided)
   */
  async fetchGigsByIndustry(industryIdentifier: string, companyId?: string): Promise<GigApiResponse> {
    try {
      const effectiveCompanyId = companyId || this.getCompanyId();
      
      

      // First fetch all gigs for the company
      const response = await this.fetchGigsByCompany(companyId);

      if (!response.data || response.data.length === 0) {
        
        return response;
      }

      

      // Check if industryIdentifier is an ID (ObjectId format: 24 hex characters) or a name
      if (!industryIdentifier) {
        console.warn('[OnboardingService] industryIdentifier is empty, returning all company gigs');
        return response;
      }
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(industryIdentifier);
      const searchTerms = isObjectId ? [] : industryIdentifier.toLowerCase().trim().split(/\s+/).filter((t: string) => t.length > 3);

      // Filter gigs by industry (by ID or by name)
      let filteredGigs = response.data.filter((gig: GigFromApi) => {
        if (!gig.industries || gig.industries.length === 0) {
          return false;
        }

        return gig.industries.some((industry: any) => {
          const industryId = industry._id || industry.id;
          const industryName = (industry.name || '').toLowerCase().trim();
          const targetIdentifier = industryIdentifier.toLowerCase().trim();

          if (isObjectId) {
            // Compare by ID
            return industryId === industryIdentifier;
          } else {
            // 1. Exact match
            if (industryName === targetIdentifier) return true;

            // 2. Substring match
            if (industryName.includes(targetIdentifier) || targetIdentifier.includes(industryName)) return true;

            // 3. Keyword match (significant words > 3 chars)
            if (searchTerms.length > 0) {
              const targetKeywords = industryName.split(/\s+/).filter((t: string) => t.length > 3);
              return searchTerms.some(term => targetKeywords.includes(term));
            }

            return false;
          }
        });
      });

      // GLOBAL FALLBACK: If no match found by industry, but company HAS gigs, return them all
      // This prevents the user from being stuck with "No matching gigs found"
      if (filteredGigs.length === 0 && response.data.length > 0) {
        console.warn(`[OnboardingService] No exact industry match for "${industryIdentifier}". Falling back to all company gigs (${response.data.length}).`);
        filteredGigs = response.data;
      }

      

      return {
        ...response,
        data: filteredGigs
      };
    } catch (error) {
      console.error(`Error fetching gigs for industry ${industryIdentifier}:`, error);
      throw new Error('Failed to fetch gigs for industry');
    }
  },

  /**
   * Fetch company data by company ID
   * @param companyId - The company ID (optional, will use cookie if not provided)
   */
  async fetchCompanyData(companyId?: string): Promise<any> {
    try {
      // Use provided companyId or get from cookie
      const effectiveCompanyId = companyId || this.getCompanyId();

      if (!effectiveCompanyId) {
        throw new Error('No company ID provided or found in cookies');
      }

      const response = await axios.get(`${COMPANY_API_URL}/${effectiveCompanyId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching company data:', error);
      throw new Error('Failed to fetch company data');
    }
  },

  /**
   * Update onboarding progress for a company (Phase 3, Step 9)
   * @param companyId - The company ID
   */
  async updateOnboardingProgress(companyId: string): Promise<void> {
    const apiUrl =
      import.meta.env.VITE_COMPANY_API_URL ||
      "https://v25searchcompanywizardbackend-production.up.railway.app/api";
    const onboardingUrl = `${apiUrl}/onboarding/companies/${companyId}/onboarding`;
    const stepUrl = `${apiUrl}/onboarding/companies/${companyId}/onboarding/phases/3/steps/8`;

    try {
      await axios.put(stepUrl, { status: "completed" });
    } catch (error) {
      console.error("[OnboardingService] Failed to mark step 8 completed:", error);
      window.dispatchEvent(new Event("refreshOnboardingProgress"));
      throw error;
    }

    try {
      const { data: progress } = await axios.get(onboardingUrl);
      const raw = progress as Record<string, unknown>;
      const completedSteps = Array.isArray(raw?.completedSteps)
        ? [...(raw.completedSteps as number[])]
        : [];
      if (!completedSteps.includes(8)) completedSteps.push(8);
      const phaseId = typeof raw?.currentPhase === "number" ? (raw.currentPhase as number) : 3;
      const cookiePayload = { ...raw, completedSteps };
      Cookies.set("companyOnboardingProgress", JSON.stringify(cookiePayload), { expires: 7 });
      
      // Dispatch events for UI updates
      window.dispatchEvent(
        new CustomEvent("stepCompleted", {
          detail: {
            stepId: 8,
            phaseId,
            status: "completed",
            completedSteps,
          },
        })
      );
      window.dispatchEvent(new Event("refreshOnboardingProgress"));
    } catch (error) {
      console.error("[OnboardingService] Failed to reload onboarding after step 9:", error);
      window.dispatchEvent(new Event("refreshOnboardingProgress"));
    }
  },
};

