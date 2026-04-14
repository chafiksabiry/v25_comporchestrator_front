import { GigData, GigSuggestion } from '../types';
import { generateMockGigSuggestions } from './mockData';

const API_BASE_URL = import.meta.env.VITE_GIGS_API || 'https://v25gigsmanualcreationbackend-production.up.railway.app/api';

// Configuration pour activer/désactiver le mode mock
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true' || false;

// Helper function to validate and clean territory IDs
// Removes timezone IDs that might have been incorrectly included in territories
function validateTerritories(territories: string[], timezoneId?: string): string[] {
  if (!territories || !Array.isArray(territories)) return [];

  // Filter out timezone ID if it appears in territories
  return territories.filter(territoryId => {
    // Remove the timezone ID if it appears in territories
    if (timezoneId && territoryId === timezoneId) {
      console.warn(`⚠️ Timezone ID ${timezoneId} found in territories, removing it`);
      return false;
    }
    return true;
  });
}

export async function generateGigSuggestions(description: string): Promise<GigSuggestion> {
  if (!description) {
    throw new Error('Description is required');
  }

  // Si le mode mock est activé, utiliser les données mockées
  if (USE_MOCK_DATA) {
    console.log('🎭 MOCK MODE ENABLED - Using mock data instead of OpenAI API');
    return await generateMockGigSuggestions(description);
  }

  try {
    console.log('🤖 REAL API MODE - Calling OpenAI backend');
    const response = await fetch(`${API_BASE_URL}/ai/generate-gig-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: description
      })
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Log the backend response for debugging
    console.log('Backend API Response:', data);

    // Transform the backend response to match our GigSuggestion type
    const timezoneId = data.availability?.time_zone;
    const originalTerritories = data.team?.territories || [];
    const cleanedTerritories = validateTerritories(originalTerritories, timezoneId);

    // Log if territories were cleaned
    if (originalTerritories.length !== cleanedTerritories.length) {
      console.log(`🧹 Cleaned territories: ${originalTerritories.length} → ${cleanedTerritories.length}`);
      console.log('Original:', originalTerritories);
      console.log('Cleaned:', cleanedTerritories);
    }

    const transformedData = {
      jobTitles: data.jobTitles || [],
      jobDescription: data.jobDescription || '',
      category: data.category || '',
      destination_zone: data.destination_zone || '',
      activities: data.activities || [],
      industries: data.industries || [],
      seniority: data.seniority || { level: '', yearsExperience: 0 },
      skills: data.skills || { languages: [], soft: [], professional: [], technical: [] },
      availability: data.availability || {},
      commission: (() => {
        const rawCommission = data.commission || {};

        // Check if we received the old structure (transactionCommission is an object or baseAmount exists)
        const isLegacyStructure =
          (rawCommission.transactionCommission && typeof rawCommission.transactionCommission === 'object') ||
          rawCommission.baseAmount !== undefined;

        if (isLegacyStructure) {
          console.log('⚠️ Detected legacy commission structure, adapting to new format');
          return {
            commission_per_call: rawCommission.baseAmount || 0, // Map baseAmount to commission_per_call
            bonusAmount: String(rawCommission.bonusAmount || "0"), // Convert to string
            currency: rawCommission.currency || null, // Let Suggestions.tsx set default if missing
            minimumVolume: {
              amount: String(rawCommission.minimumVolume?.amount || "0"), // Convert to string
              period: rawCommission.minimumVolume?.period || "Monthly",
              unit: rawCommission.minimumVolume?.unit || "Transactions"
            },
            transactionCommission: rawCommission.transactionCommission?.amount || 0, // Extract amount
            additionalDetails: rawCommission.additionalDetails || ""
          };
        }

        // Ensure currency is strictly valid object if passed through
        if (rawCommission.currency && typeof rawCommission.currency === 'string') {
          rawCommission.currency = { $oid: rawCommission.currency };
        }

        return rawCommission;
      })(),
      team: {
        ...data.team,
        size: data.team?.size || 1,
        structure: data.team?.structure || [],
        territories: cleanedTerritories
      },

      // Missing fields required by GigSuggestion interface
      title: data.jobTitles?.[0] || '',
      description: data.jobDescription || '',
      highlights: data.highlights || [],
      deliverables: data.deliverables || [],
      requirements: { essential: [], preferred: [] },
      timeframes: [],
      benefits: [],
      activity: { options: [] },
      leads: { types: [], sources: [], distribution: { method: '', rules: [] }, qualificationCriteria: [] },
      documentation: { templates: {}, reference: {}, product: [], process: [], training: [] },
      selectedJobTitle: data.jobTitles?.[0] || '',
      sectors: data.category ? [data.category] : [],
      destinationZones: data.destination_zone ? [data.destination_zone] : [],

      // Schedule mapping
      schedule: {
        schedules: data.availability?.schedule ? data.availability.schedule.map((sched: any) => ({
          day: sched.day,
          hours: sched.hours,
          days: [sched.day] // backend returns day, frontend type wants days array? check type
        })) : [],
        timeZones: data.availability?.time_zone ? [data.availability.time_zone] : [],
        time_zone: data.availability?.time_zone || '',
        flexibility: data.availability?.flexibility || [],
        minimumHours: data.availability?.minimumHours || { daily: 0, weekly: 0, monthly: 0 }
      }
    };

    console.log('Transformed data for UI:', transformedData);
    return transformedData;
  } catch (error) {
    console.error('Error calling backend API:', error);
    throw error;
  }
}

// Convert GigData back to GigSuggestion format for the Suggestions component
export function mapGigDataToSuggestions(gigData: GigData): any {
  console.log('🔄 REVERSE MAPPING - Converting gigData back to suggestions format');
  console.log('🔄 REVERSE MAPPING - gigData.schedule:', gigData.schedule);
  console.log('🔄 REVERSE MAPPING - gigData.availability:', gigData.availability);

  return {
    jobTitles: gigData.title ? [gigData.title] : [],
    description: gigData.description || '',
    category: gigData.category || '',
    destinationZones: gigData.destinationZones || [],
    activities: gigData.activities || [],
    industries: gigData.industries || [],
    seniority: gigData.seniority || { level: '', yearsExperience: 0 },
    skills: (gigData.skills ? {
      ...gigData.skills,
      certifications: (gigData.skills as any)?.certifications || []
    } : { languages: [], soft: [], professional: [], technical: [], certifications: [] }) as any,
    schedule: gigData.schedule || {
      schedules: [],
      time_zone: '',
      timeZones: [],
      flexibility: [],
      minimumHours: {}
    },
    availability: gigData.availability || {},
    commission: gigData.commission || {},
    team: gigData.team || { size: 1, structure: [], territories: [] },
    highlights: gigData.highlights || [],
    requirements: gigData.requirements || { essential: [], preferred: [] },
    benefits: gigData.benefits || [],
    callTypes: gigData.callTypes || []
  };
}

// Keep the mapGeneratedDataToGigData function for compatibility
export function mapGeneratedDataToGigData(generatedData: any): Partial<GigData> {
  console.log('🗺️ MAPPING - generatedData.schedule:', generatedData.schedule);
  console.log('🗺️ MAPPING - generatedData.availability:', generatedData.availability);
  console.log('🗺️ MAPPING - generatedData.destination_zone:', generatedData.destination_zone);
  console.log('🗺️ MAPPING - generatedData.destinationZones:', generatedData.destinationZones);

  const mappedDestinationZone = generatedData.destination_zone || generatedData.destinationZones?.[0] || '';
  console.log('🗺️ MAPPING - Final destination_zone:', mappedDestinationZone);

  return {
    title: generatedData.jobTitles?.[0] || '',
    description: generatedData.description || '',
    category: generatedData.category || '',
    seniority: generatedData.seniority || { level: '', yearsExperience: 0 },
    activities: generatedData.activities || [],
    industries: generatedData.industries || [],
    skills: generatedData.skills || { languages: [], soft: [], professional: [], technical: [] } as any,
    availability: generatedData.availability || {},
    schedule: generatedData.schedule || {
      schedules: [],
      time_zone: '',
      timeZones: [],
      flexibility: [],
      minimumHours: {}
    },
    commission: generatedData.commission || {} as any,
    team: generatedData.team || { size: 1, structure: [], territories: [] },
    destination_zone: mappedDestinationZone
  };
}