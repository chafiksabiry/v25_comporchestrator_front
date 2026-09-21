import Cookies from 'js-cookie';
import { GigData, GigSuggestion } from '../types';
import { applyBackendAiUsage } from '../../../lib/aiTokensUsage';
import { generateMockGigSuggestions } from './mockData';
import {
  convertActivityNamesToIds,
  convertIndustryNamesToIds,
  getActivityById,
  getIndustryById,
} from './activitiesIndustries';

const API_BASE_URL = import.meta.env.VITE_API_URL_GIGS || 'https://v25gigsmanualcreationbackend-production.up.railway.app/api';

// Configuration pour activer/désactiver le mode mock
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true' || false;

function getCompanyId(): string | undefined {
  const id = Cookies.get('companyId');
  return id ? String(id).trim() : undefined;
}

function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const row = value as Record<string, unknown>;
    const nested =
      row.text ?? row.label ?? row.name ?? row.value ?? row.title ?? row.highlight ?? row.deliverable;
    if (typeof nested === 'string') return nested.trim();
    if (nested && typeof nested === 'object') {
      const named = nested as { common?: unknown };
      if (typeof named.common === 'string') return named.common.trim();
    }
  }
  return '';
}

/** First non-empty text list among aliases. Empty arrays do not block later sources. */
export function asTextList(...sources: unknown[]): string[] {
  const out: string[] = [];
  const push = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    const text = asText(value);
    if (text && !out.includes(text)) out.push(text);
  };
  sources.forEach(push);
  return out;
}

function asZoneId(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const row = value as { _id?: unknown; $oid?: unknown; id?: unknown };
    const id = row._id ?? row.$oid ?? row.id;
    if (typeof id === 'string' && id.trim()) return id.trim();
    if (id && typeof id === 'object' && '$oid' in (id as object)) {
      const oid = (id as { $oid?: unknown }).$oid;
      if (typeof oid === 'string') return oid.trim();
    }
  }
  return asText(value);
}

function asZoneList(...sources: unknown[]): string[] {
  const out: string[] = [];
  const push = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    const id = asZoneId(value);
    if (id && !out.includes(id)) out.push(id);
  };
  sources.forEach(push);
  return out;
}

function throwInsufficientTokens(data: any, status?: number): never {
  const err = new Error(
    String(data?.message || data?.error || 'Solde de tokens AI insuffisant. Rechargez pour continuer.')
  ) as Error & { code?: string; tokens?: number };
  err.code = 'insufficient_tokens';
  err.tokens = data?.data?.tokens ?? 0;
  if (status) (err as any).status = status;
  throw err;
}

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

export async function transcribeGigAudio(
  blob: Blob,
  options?: { language?: string; filename?: string; signal?: AbortSignal; companyId?: string }
): Promise<string> {
  const form = new FormData();
  const ext = blob.type.includes('mp4')
    ? 'mp4'
    : blob.type.includes('wav')
      ? 'wav'
      : blob.type.includes('mpeg') || blob.type.includes('mp3')
        ? 'mp3'
        : 'webm';
  form.append('audio', blob, options?.filename || `gig-brief.${ext}`);
  if (options?.language) {
    form.append('language', options.language);
  }
  const companyId = options?.companyId || getCompanyId();
  if (companyId) {
    form.append('companyId', companyId);
  }

  const response = await fetch(`${API_BASE_URL}/ai/transcribe-audio`, {
    method: 'POST',
    body: form,
    signal: options?.signal,
  });

  const data = await response.json().catch(() => ({}));
  if (response.status === 402 || data?.error === 'insufficient_tokens') {
    throwInsufficientTokens(data, response.status);
  }
  if (!response.ok) {
    throw new Error(
      String(data.message || data.error || `Transcription failed (${response.status})`)
    );
  }

  applyBackendAiUsage(data?.usage, companyId);

  const transcript = String(data.transcript || '').trim();
  if (!transcript) {
    throw new Error('Empty transcription');
  }
  return transcript;
}

export async function generateGigSuggestions(description: string): Promise<GigSuggestion> {
  if (!description) {
    throw new Error('Description is required');
  }

  // Si le mode mock est activé, utiliser les données mockées
  if (USE_MOCK_DATA) {
    
    return await generateMockGigSuggestions(description);
  }

  try {
    const companyId = getCompanyId();
    const response = await fetch(`${API_BASE_URL}/ai/generate-gig-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description,
        companyId: companyId || undefined,
      })
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 402 || data?.error === 'insufficient_tokens') {
      throwInsufficientTokens(data, response.status);
    }

    if (!response.ok) {
      throw new Error(
        String(data?.message || data?.error || `Backend API error: ${response.statusText}`)
      );
    }

    applyBackendAiUsage(data?.usage, companyId);

    // Log the backend response for debugging
    

    // Transform the backend response to match our GigSuggestion type
    const timezoneId = data.availability?.time_zone;
    const originalTerritories = data.team?.territories || [];
    const cleanedTerritories = validateTerritories(originalTerritories, timezoneId);

    // Log if territories were cleaned
    if (originalTerritories.length !== cleanedTerritories.length) {
      
      
      
    }

    const transformedData = {
      jobTitles: data.jobTitles || [],
      jobDescription: data.jobDescription || '',
      category: data.category || '',
      destination_zone_meta: data.destination_zone_meta,
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
      highlights: asTextList(data.highlights, data.keyPoints, data.key_points, data.pointsCles),
      deliverables: asTextList(data.deliverables, data.livrables),
      requirements: { essential: [], preferred: [] },
      timeframes: [],
      benefits: [],
      activity: { options: [] },
      leads: { types: [], sources: [], distribution: { method: '', rules: [] }, qualificationCriteria: [] },
      documentation: { templates: {}, reference: {}, product: [], process: [], training: [] },
      selectedJobTitle: data.jobTitles?.[0] || '',
      sectors: asTextList(data.sectors, data.category),
      destination_zone: asZoneId(data.destination_zone) || asZoneId(data.destination_zone_meta) || '',
      destinationZones: asZoneList(
        data.destinationZones,
        data.destination_zones,
        data.destination_zone,
        data.destination_zone_meta
      ),

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

    
    return transformedData;
  } catch (error) {
    console.error('Error calling backend API:', error);
    throw error;
  }
}

// Convert GigData back to GigSuggestion format for the Suggestions component
export function mapGigDataToSuggestions(gigData: GigData): any {
  
  
  

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
    deliverables: gigData.deliverables || [],
    sectors: gigData.sectors || [],
    requirements: gigData.requirements || { essential: [], preferred: [] },
    benefits: gigData.benefits || [],
    callTypes: gigData.callTypes || [],
    selectedJobTitle: gigData.title || undefined,
    destination_zone: gigData.destination_zone || '',
    destination_zone_meta: gigData.destination_zone_meta,
  };
}

// Keep the mapGeneratedDataToGigData function for compatibility
export function mapGeneratedDataToGigData(generatedData: any): Partial<GigData> {
  const unwrapId = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'object' && val.$oid) return String(val.$oid);
    if (typeof val === 'object' && val._id) return String(val._id);
    return String(val);
  };

  // Prefer user-edited destinationZones chips over stale AI destination_zone.
  // Empty arrays must not hide destination_zone / destination_zone_meta.
  const zones = asZoneList(
    generatedData.destinationZones,
    generatedData.destination_zones,
    generatedData.destination_zone,
    generatedData.destination_zone_meta
  );
  const mappedDestinationZone =
    zones[0] || unwrapId(generatedData.destination_zone) || '';

  let destination_zone_meta = generatedData.destination_zone_meta;
  if (destination_zone_meta) {
    const metaId = unwrapId(destination_zone_meta._id || destination_zone_meta);
    if (!mappedDestinationZone || (metaId && metaId !== mappedDestinationZone)) {
      destination_zone_meta = undefined;
    }
  }

  const schedule = generatedData.schedule || {
    schedules: [],
    time_zone: '',
    timeZones: [],
    flexibility: [],
    minimumHours: {}
  };
  // Mirror edited schedule into availability so SectionContent / save never
  // rehydrate deleted plages from a stale availability.schedule.
  const mirroredScheduleEntries = Array.isArray(schedule.schedules)
    ? schedule.schedules.map((s: any) => ({
        day: s.day,
        hours: s.hours ? { start: s.hours.start, end: s.hours.end } : s.hours,
      }))
    : [];

  const commission = { ...(generatedData.commission || {}) } as any;
  const currencyId = unwrapId(commission.currency);
  if (currencyId) {
    commission.currency = currencyId;
  }
  if (commission.currency_meta) {
    const metaCurrencyId = unwrapId(commission.currency_meta._id || commission.currency_meta);
    if (!currencyId || (metaCurrencyId && metaCurrencyId !== currencyId)) {
      delete commission.currency_meta;
    }
  }

  // Industries / activities may arrive as names (AI) or IDs (Suggestions UI)
  const normalizeRefIds = (
    values: any[],
    getById: (id: string) => unknown,
    convertNames: (names: string[]) => string[]
  ): string[] => {
    if (!Array.isArray(values) || values.length === 0) return [];
    const raw = values.map(unwrapId).filter(Boolean);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of raw) {
      const id = getById(v) ? v : (convertNames([v])[0] || v);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  };

  return {
    title: generatedData.selectedJobTitle || generatedData.jobTitles?.[0] || '',
    description: generatedData.description || generatedData.jobDescription || '',
    category: generatedData.category || generatedData.sectors?.[0] || '',
    seniority: generatedData.seniority || { level: '', yearsExperience: 0 },
    activities: normalizeRefIds(
      generatedData.activities || [],
      getActivityById,
      convertActivityNamesToIds
    ),
    industries: normalizeRefIds(
      generatedData.industries || [],
      getIndustryById,
      convertIndustryNamesToIds
    ),
    highlights: asTextList(
      generatedData.highlights,
      generatedData.keyPoints,
      generatedData.key_points,
      generatedData.pointsCles
    ),
    deliverables: asTextList(generatedData.deliverables, generatedData.livrables),
    sectors: asTextList(generatedData.sectors, generatedData.category),
    skills: generatedData.skills || { languages: [], soft: [], professional: [], technical: [] } as any,
    availability: {
      ...(generatedData.availability || {}),
      schedule: mirroredScheduleEntries,
      time_zone: schedule.time_zone || generatedData.availability?.time_zone || '',
      timeZones: schedule.timeZones || generatedData.availability?.timeZones || [],
      flexibility: schedule.flexibility || generatedData.availability?.flexibility || [],
      minimumHours: schedule.minimumHours || generatedData.availability?.minimumHours || {},
    },
    schedule,
    commission,
    team: generatedData.team || { size: 1, structure: [], territories: [] },
    destination_zone: mappedDestinationZone,
    destination_zone_meta,
    destinationZones: zones.length
      ? zones
      : mappedDestinationZone
        ? [mappedDestinationZone]
        : [],
  };
}
