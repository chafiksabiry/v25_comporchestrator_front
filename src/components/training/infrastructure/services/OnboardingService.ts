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

      console.log('[OnboardingService] Total gigs fetched:', response.data.length);
      if (response.data.length > 0) {
        console.log('[OnboardingService] First gig industries:', response.data[0]?.industries || 'No industries');
        console.log('[OnboardingService] First gig industry IDs:', response.data[0]?.industries?.map((ind: any) => ind._id || ind.id) || 'No IDs');
        console.log('[OnboardingService] First gig industry names:', response.data[0]?.industries?.map((ind: any) => ind.name) || 'No names');
      }

      // Check if industryIdentifier is an ID (ObjectId format: 24 hex characters) or a name
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(industryIdentifier);
      console.log('[OnboardingService] Industry identifier is ObjectId:', isObjectId);

      // Filter gigs by industry (by ID or by name)
      const filteredGigs = response.data.filter((gig: GigFromApi) => {
        if (!gig.industries || gig.industries.length === 0) {
          return false;
        }

        const hasMatchingIndustry = gig.industries.some((industry: any) => {
          if (isObjectId) {
            // Compare by ID
            const industryId = industry._id || industry.id;
            const match = industryId === industryIdentifier;
            if (match) {
              console.log('[OnboardingService] Match found by ID:', industryId, '=', industryIdentifier);
            }
            return match;
          } else {
            // Compare by name - Enhanced with flexible matching
            const name = (industry.name || '').toLowerCase().trim();
            const target = (industryIdentifier || '').toLowerCase().trim();
            
            // 1. Exact match
            if (name === target) {
              console.log('[OnboardingService] Match found by name:', name);
              return true;
            }
            
            // 2. Substring match
            if (name.includes(target) || target.includes(name)) {
              console.log(`[OnboardingService] Match found by substring: "${name}" vs "${target}"`);
              return true;
            }
            
            // 3. Keyword match (split by spaces and match significant words)
            const nameKeywords = name.split(/\s+/).filter((k: string) => k.length > 3);
            const targetKeywords = target.split(/\s+/).filter((k: string) => k.length > 3);
            
            const hasCommonKeyword = targetKeywords.some((tk: string) => 
              nameKeywords.some((nk: string) => nk.includes(tk) || tk.includes(nk))
            );
            
            if (hasCommonKeyword) {
              console.log(`[OnboardingService] Match found by keywords: "${name}" vs "${target}"`);
              return true;
            }

            return false;
          }
        });

        return hasMatchingIndustry;
      });

      console.log('[OnboardingService] Filtered gigs count:', filteredGigs.length);

      if (filteredGigs.length > 0) {
        console.log('[OnboardingService] Filtered gig titles:', filteredGigs.map(g => g.title));
        return {
          ...response,
          data: filteredGigs
        };
      } else {
        console.log('[OnboardingService] ⚠️ No industry match found. Debug info:');
        console.log('[OnboardingService] - Looking for:', industryIdentifier);
        
        // GLOBAL FALLBACK: If no match found, return all gigs for this company 
        // This ensures the user can proceed even if industry alignment is poor.
        if (response.data.length > 0) {
          console.log(`[OnboardingService] 🔄 Falling back to all company gigs (${response.data.length}) to prevent onboarding blockage.`);
          return {
            ...response,
            data: response.data
          };
        }
      }

      return {
        ...response,
        data: []
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

