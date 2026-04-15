import type { Gig, GigHistory } from './types';
import { GigData } from '../types';
import Cookies from 'js-cookie';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL_GIGS || 'http://localhost:3000';

// Types for countries API
export interface Country {
  _id: string;
  name: {
    common: string;
    official: string;
    nativeName?: Record<string, {
      official: string;
      common: string;
      _id: string;
    }>;
  };
  flags: {
    png: string;
    svg: string;
    alt: string;
  };
  cca2: string;
  __v: number;
  createdAt: string;
  updatedAt: string;
}

export interface CountriesResponse {
  success: boolean;
  data: Country[];
}

export interface CountryResponse {
  success: boolean;
  data: Country;
}

// Types for timezones API
export interface Timezone {
  _id: string;
  countryCode: string;
  countryName: string;
  zoneName: string;
  gmtOffset: number;
  lastUpdated: string;
  __v: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimezonesResponse {
  success: boolean;
  data: Timezone[];
  count: number;
}

export interface TimezoneResponse {
  success: boolean;
  data: Timezone;
}

// Types for currencies API
export interface Currency {
  _id: string;
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface CurrenciesResponse {
  success: boolean;
  data: Currency[];
  total: number;
  message: string;
}

export interface CurrencyResponse {
  success: boolean;
  data: Currency;
  message: string;
}


// TODO: Implement these functions with your preferred storage solution
export async function createGig() {
  throw new Error('Not implemented');
}

export async function updateGig(_id: string, _updates: Partial<Gig>) {
  throw new Error('Not implemented');
}

export async function submitForReview(id: string) {
  return updateGig(id, { status: 'active' as any });
}

export async function publishGig(id: string) {
  return updateGig(id, { status: 'active' as any });
}

export async function closeGig(id: string) {
  return updateGig(id, { status: 'archived' as any });
}

export async function getGigHistory(gigId: string) {
  throw new Error('Not implemented');
}

// Countries API functions
export async function fetchAllCountries(): Promise<Country[]> {
  try {
    const response = await fetch(`${API_URL}/countries`);

    if (!response.ok) {
      throw new Error(`Failed to fetch countries: ${response.status} ${response.statusText}`);
    }

    const data: CountriesResponse = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch countries');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching countries:', error);
    throw error;
  }
}

export async function fetchCountryById(countryId: string): Promise<Country> {
  try {
    const response = await fetch(`${API_URL}/countries/${countryId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch country: ${response.status} ${response.statusText}`);
    }

    const data: CountryResponse = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch country');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching country:', error);
    throw error;
  }
}

export async function getCountryNameById(countryId: string): Promise<string> {
  try {
    const country = await fetchCountryById(countryId);
    return country.name.common;
  } catch (error) {
    console.error('Error getting country name:', error);
    return 'Unknown Country';
  }
}

// Timezones API functions
export async function fetchAllTimezones(): Promise<Timezone[]> {
  try {
    const TIMEZONE_API_URL = import.meta.env.VITE_REP_URL || '/api';
    const response = await fetch(`${TIMEZONE_API_URL}/timezones/`);

    if (!response.ok) {
      throw new Error(`Failed to fetch timezones: ${response.status} ${response.statusText}`);
    }

    const data: TimezonesResponse = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch timezones');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching timezones:', error);
    throw error;
  }
}

export async function fetchTimezoneById(timezoneId: string): Promise<Timezone> {
  try {
    const TIMEZONE_API_URL = import.meta.env.VITE_REP_URL || '/api';
    const response = await fetch(`${TIMEZONE_API_URL}/timezones/${timezoneId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch timezone: ${response.status} ${response.statusText}`);
    }

    const data: TimezoneResponse = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch timezone');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching timezone:', error);
    throw error;
  }
}

export async function getTimezoneNameById(timezoneId: string): Promise<string> {
  try {
    const timezone = await fetchTimezoneById(timezoneId);
    return `${timezone.zoneName} (${timezone.countryName})`;
  } catch (error) {
    console.error('Error getting timezone name:', error);
    return 'Unknown Timezone';
  }
}

export async function fetchCompanies() {
  try {
    const url = `${import.meta.env.VITE_API_URL_ONBOARDING}/companies`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch companies: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch companies');
    }

    return data.data;
  } catch (error) {
    console.error('❌ API: Error fetching companies:', error);
    throw error;
  }
}

export async function fetchCompanyById(companyId: string) {
  try {
    const url = `${import.meta.env.VITE_API_URL_ONBOARDING}/companies/${companyId}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch company: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch company');
    }

    return data.data;
  } catch (error) {
    console.error('❌ API: Error fetching company:', error);
    throw error;
  }
}

interface Company {
  _id: string;
  userId: string | { $oid: string };
  name: string;
  industry: string;
  // Add other company fields as needed
}

// export async function getCompanyIdByUserId(userId: string): Promise<string> {
//   try {
//     const companies = await fetchCompanies();
//     const company = companies.find((company: Company) => 
//       company.userId === userId || 
//       (typeof company.userId === 'object' && company.userId.$oid === userId)
//     );

//     if (!company) {
//       throw new Error(`No company found for userId: ${userId}`);
//     }

//     return company._id;
//   } catch (error) {
//     console.error('Error getting companyId by userId:', error);
//     throw error;
//   }
// }

// Fonction pour corriger automatiquement les données de schedule
function fixScheduleData(data: GigData): GigData {
  const workingDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Corriger availability.schedule
  if (data.availability && data.availability.schedule) {
    const fixedAvailabilitySchedule = data.availability.schedule.map((schedule, index) => {
      if (!schedule.day) {
        const dayIndex = index % workingDays.length;
        return {
          ...schedule,
          day: workingDays[dayIndex]
        };
      }
      return schedule;
    });

    data.availability.schedule = fixedAvailabilitySchedule;
  }

  // Corriger schedule.schedules
  if (data.schedule && data.schedule.schedules) {
    const fixedScheduleSchedules = data.schedule.schedules.map((schedule, index) => {
      if (!schedule.day) {
        const dayIndex = index % workingDays.length;
        return {
          ...schedule,
          day: workingDays[dayIndex]
        };
      }
      return schedule;
    });

    data.schedule.schedules = fixedScheduleSchedules;
  }

  return data;
}

export async function updateGigData(gigId: string, gigData: GigData): Promise<{ data: any; error?: Error }> {
  try {
    const userId = Cookies.get('userId') ?? "";

    if (!userId) {
      throw new Error('User ID not found in cookies');
    }

    // Get companyId based on userId
    const companyId = Cookies.get('companyId') ?? "";
    // Corriger automatiquement les données de schedule
    const fixedGigData = fixScheduleData(gigData);

    // Format skills data to ensure proper structure
    const formattedSkills = {
      ...fixedGigData.skills,
      languages: fixedGigData.skills.languages.map(lang => ({
        language: typeof lang.language === 'object' && (lang.language as any).$oid ? (lang.language as any).$oid : lang.language,
        proficiency: lang.proficiency,
        iso639_1: lang.iso639_1
      })),
      soft: fixedGigData.skills.soft.map(skill => ({
        skill: typeof skill.skill === 'object' && (skill.skill as any).$oid ? (skill.skill as any).$oid : skill.skill,
        level: skill.level,
        details: (skill as any).details || ''
      })),
      professional: fixedGigData.skills.professional.map(skill => ({
        skill: typeof skill.skill === 'object' && (skill.skill as any).$oid ? (skill.skill as any).$oid : skill.skill,
        level: skill.level,
        details: (skill as any).details || ''
      })),
      technical: fixedGigData.skills.technical.map(skill => ({
        skill: typeof skill.skill === 'object' && (skill.skill as any).$oid ? (skill.skill as any).$oid : skill.skill,
        level: skill.level,
        details: (skill as any).details || ''
      }))
    };

    // Format availability data with proper schedule nesting
    const formattedAvailability = {
      ...fixedGigData.availability,
      time_zone: (() => {
        const firstTimezone = fixedGigData.availability.timeZones?.[0];
        if (typeof firstTimezone === 'string') {
          return firstTimezone;
        }
        return fixedGigData.availability.time_zone || 'UTC';
      })(),
      schedule: (() => {
        // Use schedule from availability if available, otherwise use top-level schedule
        const scheduleData = fixedGigData.availability?.schedule || fixedGigData.schedule?.schedules || [];
        return scheduleData.map(schedule => ({
          day: schedule.day, // Use 'day' (singular) instead of converting to array
          hours: schedule.hours
        }));
      })()
    };

    // Keep destination zone as MongoDB ObjectId if it's valid, otherwise omit it
    const formattedDestinationZone = (() => {
      if (fixedGigData.destination_zone) {
        // If it's a MongoDB ObjectId (24 characters), keep it
        if (typeof fixedGigData.destination_zone === 'string' && fixedGigData.destination_zone.length === 24) {
          console.log('💾 UPDATE GIG - Using MongoDB ObjectId for destination_zone:', fixedGigData.destination_zone);
          return fixedGigData.destination_zone;
        }
        console.log('⚠️ UPDATE GIG - destination_zone is not a valid MongoDB ObjectId, omitting from request');
        return undefined; // Don't send invalid ObjectId
      }
      console.log('💾 UPDATE GIG - No destination_zone provided, omitting from request');
      return undefined; // Don't send default value
    })();

    // Format commission data to ensure currency is a MongoDB ObjectId
    const formattedCommission = (() => {
      if (!fixedGigData.commission) return undefined;

      const commission = { ...fixedGigData.commission };

      // Handle currency field - ensure it's a MongoDB ObjectId
      if (commission.currency) {
        const currencyValue = commission.currency as any;

        // If it's already a valid MongoDB ObjectId (24 hex characters), keep it
        if (typeof currencyValue === 'string' && currencyValue.length === 24 && /^[a-f0-9]{24}$/i.test(currencyValue)) {
          console.log('💾 UPDATE GIG - Using MongoDB ObjectId for commission.currency:', currencyValue);
          commission.currency = currencyValue;
        }
        // If it's an object with $oid, extract the ObjectId
        else if (typeof currencyValue === 'object' && currencyValue.$oid) {
          console.log('💾 UPDATE GIG - Extracting ObjectId from commission.currency.$oid:', currencyValue.$oid);
          commission.currency = currencyValue.$oid;
        }
        // If it's a currency code (like "EUR"), we need to handle it
        else if (typeof currencyValue === 'string' && currencyValue.length < 24) {
          console.error('⚠️ UPDATE GIG - commission.currency is a currency code, not an ObjectId:', currencyValue);
          console.error('⚠️ UPDATE GIG - This will cause a validation error. Please ensure currency is set to a valid ObjectId.');
          // Keep it as is - the backend will return a proper error message
        }
      }

      return commission;
    })();

    // Remove the schedule field and other fields that shouldn't be sent to backend
    const { schedule, time_zone, destinationZones, ...cleanGigData } = fixedGigData;

    const gigDataWithIds = {
      ...cleanGigData,
      userId,
      companyId,
      skills: formattedSkills,
      availability: formattedAvailability,
      ...(formattedDestinationZone && { destination_zone: formattedDestinationZone }),
      ...(formattedCommission && { commission: formattedCommission })
    };

    // Debug: Log the data being sent
    console.log('🔍 UPDATE GIG - Data being sent to backend:', JSON.stringify(gigDataWithIds, null, 2));
    console.log('🔍 UPDATE GIG - Gig ID:', gigId);
    console.log('🔍 UPDATE GIG - API URL:', `${API_URL}/gigs/${gigId}`);

    const response = await fetch(`${API_URL}/gigs/${gigId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gigDataWithIds),
    });
    const responseText = await response.text();

    if (!response.ok) {
      console.error('Error response text:', responseText);
      try {
        const errorData = JSON.parse(responseText);
        return { data: null, error: new Error(errorData.message || 'Failed to update gig data') };
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
        return { data: null, error: new Error(`Failed to update gig data: ${responseText}`) };
      }
    }

    try {
      const data = JSON.parse(responseText);
      return { data, error: undefined };
    } catch (parseError) {
      console.error('Error parsing success response:', parseError);
      return { data: null, error: new Error('Invalid JSON response from server') };
    }
  } catch (error) {
    console.error('Error in updateGigData:', error);
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error occurred') };
  }
}

export async function saveGigData(gigData: GigData): Promise<{ data: any; error?: Error }> {
  try {
    const userId = Cookies.get('userId') ?? "";

    if (!userId) {
      throw new Error('User ID not found in cookies');
    }

    // Get companyId based on userId
    const companyId = Cookies.get('companyId') ?? "";
    // Corriger automatiquement les données de schedule
    const fixedGigData = fixScheduleData(gigData);

    // Format skills data to ensure proper structure
    const formattedSkills = {
      ...fixedGigData.skills,
      languages: fixedGigData.skills.languages.map(lang => ({
        language: typeof lang.language === 'object' && (lang.language as any).$oid ? (lang.language as any).$oid : lang.language,
        proficiency: lang.proficiency,
        iso639_1: lang.iso639_1
      })),
      soft: fixedGigData.skills.soft.map(skill => ({
        skill: typeof skill.skill === 'object' && (skill.skill as any).$oid ? (skill.skill as any).$oid : skill.skill,
        level: skill.level,
        details: (skill as any).details || ''
      })),
      professional: fixedGigData.skills.professional.map(skill => ({
        skill: typeof skill.skill === 'object' && (skill.skill as any).$oid ? (skill.skill as any).$oid : skill.skill,
        level: skill.level,
        details: (skill as any).details || ''
      })),
      technical: fixedGigData.skills.technical.map(skill => ({
        skill: typeof skill.skill === 'object' && (skill.skill as any).$oid ? (skill.skill as any).$oid : skill.skill,
        level: skill.level,
        details: (skill as any).details || ''
      }))
    };



    // Format availability data with proper schedule nesting
    const formattedAvailability = {
      ...fixedGigData.availability,
      time_zone: (() => {
        const firstTimezone = fixedGigData.availability.timeZones?.[0];
        if (typeof firstTimezone === 'string') {
          return firstTimezone;
        }
        return fixedGigData.availability.time_zone || 'UTC';
      })(),
      schedule: (() => {
        // Use schedule from availability if available, otherwise use top-level schedule
        const scheduleData = fixedGigData.availability?.schedule || fixedGigData.schedule?.schedules || [];
        return scheduleData.map(schedule => ({
          day: schedule.day, // Use 'day' (singular) instead of converting to array
          hours: schedule.hours
        }));
      })()
    };

    // Keep destination zone as MongoDB ObjectId if it's valid, otherwise omit it
    const formattedDestinationZone = (() => {
      if (fixedGigData.destination_zone) {
        // If it's a MongoDB ObjectId (24 characters), keep it
        if (typeof fixedGigData.destination_zone === 'string' && fixedGigData.destination_zone.length === 24) {
          console.log('💾 SAVE GIG - Using MongoDB ObjectId for destination_zone:', fixedGigData.destination_zone);
          return fixedGigData.destination_zone;
        }
        console.log('⚠️ SAVE GIG - destination_zone is not a valid MongoDB ObjectId, omitting from request');
        return undefined; // Don't send invalid ObjectId
      }
      console.log('💾 SAVE GIG - No destination_zone provided, omitting from request');
      return undefined; // Don't send default value
    })();

    // Format commission data to ensure currency is a MongoDB ObjectId
    const formattedCommission = (() => {
      if (!fixedGigData.commission) return undefined;

      const commission = { ...fixedGigData.commission };

      // Handle currency field - ensure it's a MongoDB ObjectId
      if (commission.currency) {
        const currencyValue = commission.currency as any;

        // If it's already a valid MongoDB ObjectId (24 hex characters), keep it
        if (typeof currencyValue === 'string' && currencyValue.length === 24 && /^[a-f0-9]{24}$/i.test(currencyValue)) {
          console.log('💾 SAVE GIG - Using MongoDB ObjectId for commission.currency:', currencyValue);
          commission.currency = currencyValue;
        }
        // If it's an object with $oid, extract the ObjectId
        else if (typeof currencyValue === 'object' && currencyValue.$oid) {
          console.log('💾 SAVE GIG - Extracting ObjectId from commission.currency.$oid:', currencyValue.$oid);
          commission.currency = currencyValue.$oid;
        }
        // If it's a currency code (like "EUR"), we need to handle it
        else if (typeof currencyValue === 'string' && currencyValue.length < 24) {
          console.error('⚠️ SAVE GIG - commission.currency is a currency code, not an ObjectId:', currencyValue);
          console.error('⚠️ SAVE GIG - This will cause a validation error. Please ensure currency is set to a valid ObjectId.');
          // Keep it as is - the backend will return a proper error message
        }
      }

      return commission;
    })();

    // Remove the schedule field and other fields that shouldn't be sent to backend
    const { schedule, time_zone, destinationZones, ...cleanGigData } = fixedGigData;

    const gigDataWithIds = {
      ...cleanGigData,
      userId,
      companyId,
      skills: formattedSkills,
      availability: formattedAvailability,
      ...(formattedDestinationZone && { destination_zone: formattedDestinationZone }),
      ...(formattedCommission && { commission: formattedCommission })
    };

    const response = await fetch(`${API_URL}/gigs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gigDataWithIds),
    });
    const responseText = await response.text();

    if (!response.ok) {
      console.error('Error response text:', responseText);
      try {
        const errorData = JSON.parse(responseText);
        return { data: null, error: new Error(errorData.message || 'Failed to save gig data') };
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
        return { data: null, error: new Error(`Failed to save gig data: ${responseText}`) };
      }
    }

    try {
      const data = JSON.parse(responseText);

      // Save gig ID using the new utility function
      if (data && data._id) {
        // Gig ID saved successfully
      }

      return { data, error: undefined };
    } catch (parseError) {
      console.error('Error parsing success response:', parseError);
      return { data: null, error: new Error('Invalid JSON response from server') };
    }
  } catch (error) {
    console.error('Error in saveGigData:', error);
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error occurred') };
  }
}

export async function getGig(gigId: string | null) {
  try {
    if (!gigId) {
      // If no gigId is provided, fetch all gigs
      const { data } = await axios.get(`${API_URL}/gigs`);
      return { data, error: null };
    } else {
      // If gigId is provided, fetch a specific gig
      const { data } = await axios.get(`${API_URL}/gigs/${gigId}`);
      return { data: [data], error: null };
    }
  } catch (error) {
    console.error('Error fetching gig:', error);
    return { data: null, error };
  }
}


// Removed fetchCountryName - now using getCountryNameById from countries API

// Skills API functions
export async function fetchSoftSkills() {
  try {
    const url = `${import.meta.env.VITE_REP_URL}/skills/soft`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Soft skills API error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      console.error('❌ Soft skills API error:', data.message);
      return { data: [], error: data.message || 'API returned error' };
    }

    return { data: data.data || [], error: null };
  } catch (error) {
    console.error('❌ Error fetching soft skills:', error);
    return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function fetchTechnicalSkills() {
  try {
    const url = `${import.meta.env.VITE_REP_URL}/skills/technical`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Technical skills API error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      console.error('❌ Technical skills API error:', data.message);
      return { data: [], error: data.message || 'API returned error' };
    }

    return { data: data.data || [], error: null };
  } catch (error) {
    console.error('❌ Error fetching technical skills:', error);
    return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function fetchProfessionalSkills() {
  try {
    const url = `${import.meta.env.VITE_REP_URL}/skills/professional`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Professional skills API error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      console.error('❌ Professional skills API error:', data.message);
      return { data: [], error: data.message || 'API returned error' };
    }

    return { data: data.data || [], error: null };
  } catch (error) {
    console.error('❌ Error fetching professional skills:', error);
    return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// New functions to save skills to database
export async function saveSkillToDatabase(skillData: {
  name: string;
  description: string;
  category: 'soft' | 'technical' | 'professional';
  level?: number;
}): Promise<{ data: any; error?: Error }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_REP_URL}/skills/${skillData.category}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: skillData.name,
        description: skillData.description,
        category: skillData.category,
        level: skillData.level || 1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save skill: ${errorText}`);
    }

    const data = await response.json();
    return { data: data.data, error: undefined };
  } catch (error) {
    console.error('Error saving skill to database:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to save skill')
    };
  }
}

export async function updateSkillInDatabase(
  skillId: string,
  skillData: {
    name?: string;
    description?: string;
    category?: 'soft' | 'technical' | 'professional';
    level?: number;
  }
): Promise<{ data: any; error?: Error }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_REP_URL}/skills/${skillId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(skillData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update skill: ${errorText}`);
    }

    const data = await response.json();
    return { data: data.data, error: undefined };
  } catch (error) {
    console.error('Error updating skill in database:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to update skill')
    };
  }
}

export async function deleteSkillFromDatabase(skillId: string): Promise<{ data: any; error?: Error }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_REP_URL}/skills/${skillId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete skill: ${errorText}`);
    }

    const data = await response.json();
    return { data: data.data, error: undefined };
  } catch (error) {
    console.error('Error deleting skill from database:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to delete skill')
    };
  }
}

// Get skill by ID from API
export async function getSkillById(skillId: string, category: 'soft' | 'technical' | 'professional'): Promise<{ data: any; error?: Error }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_REP_URL}/skills/${category}/${skillId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return { data: data.data, error: undefined };
  } catch (error) {
    console.error(`Error fetching ${category} skill ${skillId}:`, error);
    return { data: null, error: error instanceof Error ? error : new Error(`Failed to fetch ${category} skill`) };
  }
}

export async function searchSkillsByName(name: string, category?: 'soft' | 'technical' | 'professional'): Promise<{ data: any[]; error?: Error }> {
  try {
    const categoryParam = category ? `&category=${category}` : '';
    const response = await fetch(`${import.meta.env.VITE_REP_URL}/skills/search?name=${encodeURIComponent(name)}${categoryParam}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to search skills: ${errorText}`);
    }

    const data = await response.json();
    return { data: data.data || [], error: undefined };
  } catch (error) {
    console.error('Error searching skills:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to search skills')
    };
  }
}

// Function to sync skills from external sources to database
export async function syncSkillsToDatabase(skills: Array<{
  name: string;
  description: string;
  category: 'soft' | 'technical' | 'professional';
  source?: string;
}>): Promise<{ data: any[]; error?: Error }> {
  try {
    const results = [];

    for (const skill of skills) {
      try {
        // Check if skill already exists
        const searchResult = await searchSkillsByName(skill.name, skill.category);

        if (searchResult.data.length > 0) {
          // Skill exists, update if needed
          const existingSkill = searchResult.data[0];
          if (existingSkill.description !== skill.description) {
            const updateResult = await updateSkillInDatabase(existingSkill._id, {
              description: skill.description
            });
            if (updateResult.data) {
              results.push(updateResult.data);
            }
          } else {
            results.push(existingSkill);
          }
        } else {
          // Skill doesn't exist, create new one
          const createResult = await saveSkillToDatabase(skill);
          if (createResult.data) {
            results.push(createResult.data);
          }
        }
      } catch (skillError) {
        console.error(`Error processing skill ${skill.name}:`, skillError);
        // Continue with other skills even if one fails
      }
    }

    return { data: results, error: undefined };
  } catch (error) {
    console.error('Error syncing skills to database:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to sync skills')
    };
  }
}

// Interfaces for API responses
interface Activity {
  _id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  __v: number;
  createdAt: string;
  updatedAt: string;
}

interface Industry {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  __v: number;
  createdAt: string;
  updatedAt: string;
}

interface Language {
  _id: string;
  code: string;
  name: string | { common: string; official: string; nativeName?: { [key: string]: { common: string; official: string } } };
  nativeName: string;
  __v: number;
  createdAt: string;
  lastUpdated: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T[];
  pagination: any;
  message: string;
}

export async function fetchActivities(): Promise<{ data: Activity[]; error?: Error }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_REP_URL}/activities`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result: ApiResponse<Activity> = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch activities');
    }
    return { data: result.data || [] };
  } catch (error) {
    console.error('Error fetching activities:', error);
    return { data: [], error: error as Error };
  }
}

export async function fetchIndustries(): Promise<{ data: Industry[]; error?: Error }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_REP_URL}/industries`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result: ApiResponse<Industry> = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch industries');
    }
    return { data: result.data || [] };
  } catch (error) {
    console.error('Error fetching industries:', error);
    return { data: [], error: error as Error };
  }
}

export async function fetchLanguages(): Promise<{ data: Language[]; error?: Error }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_REP_URL}/languages`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result: ApiResponse<Language> = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch languages');
    }
    return { data: result.data || [] };
  } catch (error) {
    console.error('Error fetching languages:', error);
    return { data: [], error: error as Error };
  }
}

// Currencies API functions
export async function fetchAllCurrencies(): Promise<Currency[]> {
  try {
    console.log('💰 Fetching all currencies from API...');
    const apiUrl = import.meta.env.VITE_API_URL_GIGS || 'https://v25gigsmanualcreationbackend-production.up.railway.app/api';
    const response = await fetch(`${apiUrl}/currencies`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: CurrenciesResponse = await response.json();
    console.log('💰 Currencies API response:', result);

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch currencies');
    }

    return result.data;
  } catch (error) {
    console.error('❌ Error fetching currencies:', error);
    return [];
  }
}

export async function fetchCurrencyById(currencyId: string): Promise<Currency | null> {
  try {
    console.log(`💰 Fetching currency by ID: ${currencyId}`);
    const apiUrl = import.meta.env.VITE_API_URL_GIGS || 'https://v25gigsmanualcreationbackend-production.up.railway.app/api';
    const response = await fetch(`${apiUrl}/currencies/id/${currencyId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: CurrencyResponse = await response.json();
    console.log('💰 Currency by ID API response:', result);

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch currency');
    }

    return result.data;
  } catch (error) {
    console.error(`❌ Error fetching currency ${currencyId}:`, error);
    return null;
  }
}