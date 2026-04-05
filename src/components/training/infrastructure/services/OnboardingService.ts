import axios from 'axios';
import Cookies from 'js-cookie';
import { IndustryApiResponse, GigApiResponse, GigFromApi } from '../../types';

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
   * Get company ID from cookies
   */
  getCompanyIdFromCookie(): string | undefined {
    return Cookies.get('companyId');
  },

  /**
   * Fetch gigs for a specific company
   * @param companyId - The company ID to fetch gigs for (optional, will use cookie if not provided)
   */
  async fetchGigsByCompany(companyId?: string): Promise<GigApiResponse> {
    try {
      // Use provided companyId or get from cookie
      const effectiveCompanyId = companyId || this.getCompanyIdFromCookie();

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
      const effectiveCompanyId = companyId || this.getCompanyIdFromCookie();
      console.log('[OnboardingService] Fetching gigs for companyId:', effectiveCompanyId);
      console.log('[OnboardingService] Filtering by industry:', industryIdentifier);

      // First fetch all gigs for the company
      const response = await this.fetchGigsByCompany(companyId);

      if (!response.data || response.data.length === 0) {
        console.log('[OnboardingService] No gigs found for this company at all');
        return response;
      }

      console.log('[OnboardingService] Total gigs fetched:', response.data.length);

      // Check if industryIdentifier is an ID (ObjectId format: 24 hex characters) or a name
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

      console.log('[OnboardingService] Final gigs count:', filteredGigs.length);

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
      const effectiveCompanyId = companyId || this.getCompanyIdFromCookie();

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
};

