// New interfaces for API data
export interface Activity {
  _id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  __v: number;
  createdAt: string;
  updatedAt: string;
}

export interface Industry {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  __v: number;
  createdAt: string;
  updatedAt: string;
}

export interface Language {
  _id: string;
  code: string;
  name: string | { common: string; official: string; nativeName?: { [key: string]: { common: string; official: string } } };
  nativeName: string;
  __v: number;
  createdAt: string;
  lastUpdated: string;
  updatedAt: string;
}

export interface GigData {
  documentation: any;
  userId: string;
  companyId: string;
  title: string;
  description: string;
  category: string;
  destination_zone: string;
  destination_zone_ai_generated?: string;
  destinationZones?: string[];
  callTypes: string[];
  highlights: string[];
  industries: string[]; // Array of industry IDs
  activities: string[]; // Array of activity IDs
  status?: 'to_activate' | 'active' | 'inactive' | 'archived';
  time_zone?: string; // Timezone ID for ScheduleSection
  requirements: {
    essential: string[];
    preferred: string[];
  };
  benefits: {
    type: string;
    description: string;
  }[];
  availability: {
    schedule: Array<{
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }>;
    timeZones: string[];
    time_zone: string;
    flexibility: string[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  }
  schedule: {
    schedules: Array<{
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }>;
    timeZones: string[];
    time_zone?: string;
    flexibility: string[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
    shifts?: {
      name: string;
      hours: string;
      timezone: string;
    }[];
  };
  commission: {
    commission_per_call: number;
    bonusAmount: number | string;
    currency: string;
    minimumVolume: {
      amount: number | string;
      period: string;
      unit: string;
    };
    transactionCommission: number;
    kpis: {
      target: string;
      reward: string;
    }[];
    additionalDetails?: string;
  };
  leads: {
    types: Array<{
      type: 'hot' | 'warm' | 'cold';
      percentage: number;
      description: string;
      conversionRate?: number;
    }>;
    sources: string[];
    distribution: {
      method: string;
      rules: string[];
    };
    qualificationCriteria: string[];
  };
  skills: {
    languages: Array<{
      language: string; // Language ID
      proficiency: string;
      iso639_1: string;
    }>;
    soft: Array<{
      skill: string;
      level: number;
    }>;
    professional: Array<{
      skill: string;
      level: number;
    }>;
    technical: Array<{
      skill: string;
      level: number;
    }>;
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

  activity: {
    options: Array<{
      type: string;
      description: string;
      requirements: string[];
    }>;
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
    kpis: string[];
    targets: any;
    reporting: {
      frequency: string;
      metrics: string[];
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
  title: string;
  description: string;
  category: string;
  destination_zone?: string;
  highlights: string[];
  jobTitles: string[];
  deliverables: string[];
  selectedJobTitle?: string;
  sectors: string[];
  industries: string[];
  activities: string[];
  destinationZones: string[];
  timeframes: string[];
  availability: {
    schedule: Array<{
      days: string[];
      hours: {
        start: string;
        end: string;
      };
    }>;
    timeZones: string[];
    time_zone: string;
    flexibility: string[];
    minimumHours: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  schedule: {
    schedules: Array<{
      day: string;
      hours: {
        start: string;
        end: string;
      };
      _id?: { $oid: string };
    }>;
    timeZones: string[];
    time_zone?: string;
    flexibility: string[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
    shifts?: {
      name: string;
      hours: string;
      timezone: string;
    }[];
  };
  requirements: {
    essential: string[];
    preferred: string[];
  };
  benefits: {
    type: string;
    description: string;
  }[];
  skills: {
    languages: Array<{
      language: string;
      proficiency: string;
      iso639_1: string;
    }>;
    soft: Array<{
      skill: { $oid: string }; // MongoDB ObjectId format
      level: number;
    }>;
    professional: Array<{
      skill: { $oid: string }; // MongoDB ObjectId format
      level: number;
      details?: string;
    }>;
    technical: Array<{
      skill: { $oid: string }; // MongoDB ObjectId format
      level: number;
      details?: string;
    }>;
    certifications: Array<{
      name: string;
      required: boolean;
      provider?: string;
    }>;
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
  commission: {
    commission_per_call: number;
    bonusAmount: string;
    currency: { $oid: string };
    minimumVolume: {
      amount: string;
      period: string;
      unit: string;
    };
    transactionCommission: number;
    additionalDetails: string;
  };
  activity: {
    options: Array<{
      type: string;
      description: string;
      requirements: string[];
    }>;
  };
  leads: {
    types: Array<{
      type: 'hot' | 'warm' | 'cold';
      percentage: number;
      description: string;
      conversionRate?: number;
    }>;
    sources: string[];
    distribution: {
      method: string;
      rules: string[];
    };
    qualificationCriteria: string[];
  };
  documentation: {
    templates: any;
    reference: any;
    product: Array<{ name: string; url: string }>;
    process: Array<{ name: string; url: string }>;
    training: Array<{ name: string; url: string }>;
  };
}