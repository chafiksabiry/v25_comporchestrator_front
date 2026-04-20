export interface Profile {
  userId: string;
  companyId: string;
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  title: string | null;
  bio: string | null;
  skills: {
    professional: { skill: string; level: number }[];
    technical: { skill: string; level: number }[];
    soft: { skill: string; level: number }[];
    languages: Language[];
  };
  rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

export interface Language {
  language: string;
  proficiency: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  iso639_1: string;
}

export interface ParsedGig {
  title: string;
  quantity: number;
  timeline: string;
  type: string;
  description: string;
  status?: 'to_activate' | 'active' | 'inactive' | 'archived';
  destination_zone?: string;
  seniority?: {
    level: string;
    yearsExperience: number;
  };
  availability?: {
    schedule?: {
      schedules?: {
        day?: string;
        hours?: {
          start?: string;
          end?: string;
        };
      }[];
    };
    timeZones?: string[];
    flexibility?: string[];
    minimumHours?: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  };
  schedule?: {
    schedules: {
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }[];
    timeZones: string[];
    timeZone?: string;
    flexibility: string[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  };
  commission?: {
    commission_per_call: number;
    bonusAmount: number;
    currency: string | { $oid: string };
    minimumVolume: {
      amount: number;
      period: string;
      unit: string;
    };
    transactionCommission: number;
    additionalDetails?: string;
  };
  leads?: {
    types: Array<{
      type: 'hot' | 'warm' | 'cold';
      percentage: number;
      description: string;
      conversionRate?: number;
    }>;
    sources: string[];
  };
  team?: {
    size: number;
    structure: Array<{
      roleId: string;
      count: number;
      seniority: {
        level: string;
        yearsExperience: number;
      };
    }>;
    territories: string[];
  };

}

export interface Gig {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  type: string;
  quantity: number;
  timeline: string;
  requirements: any[];
  skills_required: string[];
  languages_required: Language[];
  kpis: any[];
  compensation: {
    type: string;
    amount: string;
    currency: string;
    frequency?: string;
  };
  status: 'to_activate' | 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface GigHistory {
  id: string;
  gig_id: string;
  changed_by: string;
  old_status: string;
  new_status: string;
  changes: any;
  created_at: string;
}

export interface JobDescription {
  title: string;
  description: string;
  responsibilities: string[];
  qualifications: string[];
  languages: {
    required: string[];
    preferred: string[];
  };
}

export interface GigMetadata {
  suggestedNames: string[];
  industries: string[];
  schedules: {
    name: string;
    description: string;
    hours: {
      day: string;
      start: string;
      end: string;
    }[];
  }[];
}

export interface GigData {
  userId: string;
  companyId: string;
  title: string;
  description: string;
  category: string;
  destination_zone: string;
  callTypes: string[];
  highlights: string[];
  industries: string[];
  requirements: {
    essential: string[];
    preferred: string[];
  };
  benefits: string[];
  availability: {
    schedule: {
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }[];
    timeZones: string[];
    timeZone?: string;
    flexibility: string[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  }
  schedule: {
    schedules: {
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }[];
    timeZones: string[];
    flexibility: string[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  };
  commission: {
    commission_per_call: number;
    bonusAmount: number;
    currency: string | { $oid: string };
    minimumVolume: {
      amount: number;
      period: string;
      unit: string;
    };
    transactionCommission: number;
    additionalDetails?: string;
    kpis: any[];
  };
  leads: {
    types: Array<{
      type: 'hot' | 'warm' | 'cold';
      percentage: number;
      description: string;
    }>;
    sources: string[];
    distribution: {
      method: string;
      rules: any[];
    };
    qualificationCriteria: any[];
  };
  skills: {
    languages: Array<{ name: string; level: string; }>;
    soft: Array<{ skill: string; level: number }>;
    professional: Array<{ skill: string; level: number }>;
    technical: Array<{ skill: string; level: number }>;
    certifications: string[];
  };
  seniority: {
    level: string;
    yearsExperience: number;
  };
  team: {
    size: number;
    structure: Array<{
      roleId: string;
      count: number;
      seniority: {
        level: string;
        yearsExperience: number;
      };
    }>;
    territories: string[];
    reporting: {
      to: string;
      frequency: string;
    };
    collaboration: string[];
  };
  tools: {
    provided: string[];
    required: string[];
  };
  training: {
    initial: {
      duration: string;
      format: string;
      topics: string[];
    };
    ongoing: {
      frequency: string;
      format: string;
      topics: string[];
    };
    support: string[];
  };
  metrics: {
    kpis: any[];
    targets: Record<string, any>;
    reporting: {
      frequency: string;
      metrics: any[];
    };
  };

  compliance: {
    requirements: string[];
    certifications: string[];
    policies: string[];
  };
  equipment: {
    required: string[];
    provided: string[];
  };
}

export interface GigSuggestion {
  jobTitles: string[];
  deliverables: string[];
  compensation: string[];
  skills: {
    professional: { skill: string; level: number }[];
    technical: { skill: string; level: number }[];
    soft: { skill: string; level: number }[];
    languages: Language[];
  };
  kpis: string[];
  timeframes: string[];
  requirements: string[];
  languages: string[];
  seniority: {
    level: string;
    yearsExperience: number;
  };
  availability: {
    schedule: {
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }[];
    timeZones: string[];
    flexibility: string[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  };
  schedule: {
    schedules: {
      day: string;
      hours: {
        start: string;
        end: string;
      };
      _id: {
        $oid: string;
      };
    }[];
    timeZones: string[];
    flexibility: string[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  };
  commission: {
    commission_per_call: number;
    bonusAmount: number;
    currency: string | { $oid: string };
    minimumVolume: {
      amount: number;
      period: string;
      unit: string;
    };
    transactionCommission: number;
    additionalDetails?: string;
  };
  sectors: string[];
  industries: string[];
  activity: {
    options: Array<{
      type: string;
      description: string;
      requirements: string[];
    }>;
  };
  destinationZones: string[];
}
