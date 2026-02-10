export interface Rep {
    _id?: string;
    userId: string;
    status: string;
    completionSteps: {
        basicInfo: boolean;
        experience: boolean;
        skills: boolean;
        languages: boolean;
        assessment: boolean;
    };
    availability: {
        days: string[];
        timeZones: string[];
        flexibility: string[];
        hours: {
            start: string;
            end: string;
        };
    };
    personalInfo: {
        name: string;
        location: string;
        email: string;
        phone: string;
        languages: Array<{
            language: string;
            proficiency: string;
            _id: string;
        }>;
    };
    professionalSummary: {
        yearsOfExperience: string;
        currentRole: string;
        industries: string[];
        activities: string[]; // Ajout des activités
        keyExpertise: string[];
        notableCompanies: string[];
        profileDescription: string;
    };
    skills: {
        technical: Array<{
            skill: string;
            level: number;
            details: string;
            _id: string;
        }>;
        professional: Array<{
            skill: string;
            level: number;
            details: string;
            _id: string;
        }>;
        soft: Array<{
            skill: string;
            level: number;
            details: string;
            _id: string;
        }>;
        contactCenter: Array<{
            skill: string;
            level: number;
            details: string;
            _id: string;
        }>;
    };
    experience: Array<{
        title: string;
        company: string;
        startDate: string | Date;
        endDate: string | Date;
        responsibilities: string[];
        achievements: string[];
        _id: string;
    }>;
    achievements: string[];
    lastUpdated: Date;
    createdAt: Date;
    updatedAt: Date;
    __v: number;
}

export interface Gig {
    region: any;
    _id?: string;
    companyId: string;
    companyName: string;
    title: string;
    description: string;
    category: Industry;
    requiredSkills: Skill[];
    preferredLanguages: Language[];
    requiredExperience: number; // 1-10
    expectedConversionRate: number; // 0-1
    compensation: {
        base: number;
        commission: number;
    };
    duration: {
        startDate: string;
        endDate: string;
    };
    timezone: string;
    targetRegion: string;
    status?: 'open' | 'in-progress' | 'completed' | 'cancelled';
    // Nouveaux champs pour la structure API
    skills?: {
        technical?: Array<{ skill: string; level: number }>;
        professional?: Array<{ skill: string; level: number }>;
        soft?: Array<{ skill: string; level: number }>;
        languages?: Array<{ language: string; proficiency: string }>;
    };
    availability?: {
        hoursPerWeek: any;
        schedule?: Array<{ day: string; hours: { start: string; end: string } }>;
        time_zone?: string;
        timeZone?: string;
    };
    destination_zone?: string;
    industries?: string[]; // Ajout des industries
    activities?: string[]; // Ajout des activités
    seniority?: {
        yearsExperience: number;
    };
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface TimeSlot {
    start: string; // HH:MM format in 24-hour
    end: string; // HH:MM format in 24-hour
}

export interface DaySchedule {
    day: DayOfWeek;
    hours: TimeSlot;
}

export interface Availability {
    schedule: DaySchedule[];
    timeZone: string;
    flexibility: string[];
}

// Nouvelle interface pour la structure de réponse de l'API
export interface AgentInfo {
    availability: any;
    personalInfo: any;
    status: string;
    name: string;
    email: string;
    photo?: string | null;
    location: string;
    phone: string;
    languages: Array<{
        _id: string;
        language: string;
        languageName: string; // Ajout du nom de la langue
        proficiency: string;
        iso639_1: string;
    }>;
    professionalSummary?: {
        yearsOfExperience: number;
        industries?: Array<{
            id: string;
            name: string;
        }>;
        activities?: Array<{
            id: string;
            name: string;
        }>;
    };
    skills: {
        technical: Array<{
            _id: string;
            skill: string;
            level: number;
            name: string;
        }>;
        professional: Array<{
            _id: string;
            skill: string;
            level: number;
            name: string;
        }>;
        soft: Array<{
            _id: string;
            skill: string;
            level: number;
            name: string;
        }>;
        contactCenter: any[];
    };
    experience: any[];
    timezone?: {
        timezoneId: string;
        timezoneName: string;
        gmtOffset: number;
        gmtDisplay: string;
        countryCode: string;
        countryName: string;
    };
}

export interface LanguageMatch {
    matchedLanguages: boolean;
    score: number;
    details: {
        matchingLanguages: Array<{
            language: string;
            requiredLevel: string;
            agentLevel: string;
        }>;
        missingLanguages: string[];
        insufficientLanguages: Array<{
            language: string;
            requiredLevel: string;
            agentLevel: string;
        }>;
        matchStatus: 'perfect_match' | 'partial_match' | 'no_match';
    };
}

export interface SkillsMatch {
    matchedSkills: boolean;
    score: number;
    details: {
        matchingSkills: Array<{
            skill: string;
            skillName: string;
            requiredLevel: number;
            agentLevel: number;
            type: 'technical' | 'professional' | 'soft';
            agentSkillName: string;
        }>;
        missingSkills: Array<{
            skill: string;
            skillName: string;
            type: 'technical' | 'professional' | 'soft';
            requiredLevel: number;
        }>;
        insufficientSkills: any[];
        matchStatus: 'perfect_match' | 'partial_match' | 'no_match';
    };
}

export interface TimezoneMatch {
    score: number;
    details: {
        gigTimezone: string;
        agentTimezone: string;
        gigGmtOffset?: number;
        agentGmtOffset?: number;
        gmtOffsetDifference?: number;
        reason: string;
    };
    matchStatus: 'perfect_match' | 'partial_match' | 'no_match';
}

export interface RegionMatch {
    score: number;
    details: {
        gigDestinationZone: string;
        agentCountryCode: string;
        reason: string;
    };
    matchStatus: 'perfect_match' | 'partial_match' | 'no_match';
}

export interface AvailabilityMatch {
    score: number;
    details: {
        matchingDays: Array<{
            day: string;
            gigHours: { start: string; end: string };
            agentHours: { start: string; end: string };
        }>;
        missingDays: string[];
        insufficientHours: any[];
    };
    matchStatus: 'perfect_match' | 'partial_match' | 'no_match';
}



export interface Match {
    _id?: string;
    repId?: string;
    gigId?: string;
    agentId: string;
    agentInfo: AgentInfo;
    languageMatch: LanguageMatch;
    skillsMatch: SkillsMatch;
    industryMatch: IndustryMatch;
    activityMatch: ActivityMatch;
    experienceMatch: ExperienceMatch;
    timezoneMatch: TimezoneMatch;
    regionMatch: RegionMatch;
    availabilityMatch: AvailabilityMatch;
    matchStatus: 'perfect_match' | 'partial_match' | 'no_match';
    alreadyAssigned?: boolean;
    isInvited?: boolean;
    totalMatchingScore: number;
    alreadyEnrolled?: boolean;
    status?: string;
    isEnrolled?: boolean;
    enrollmentStatus?: string;
    agentResponse?: string;
}

export interface MatchResponse {
    preferedmatches: Match[];
    matches?: Match[];
    totalMatches: number;
    perfectMatches: number;
    partialMatches: number;
    noMatches: number;
    languageStats: {
        perfectMatches: number;
        partialMatches: number;
        noMatches: number;
        totalMatches: number;
    };
    skillsStats: {
        perfectMatches: number;
        partialMatches: number;
        noMatches: number;
        totalMatches: number;
    };
    industryStats: {
        perfectMatches: number;
        partialMatches: number;
        neutralMatches: number;
        noMatches: number;
        totalMatches: number;
    };
    activityStats: {
        perfectMatches: number;
        partialMatches: number;
        neutralMatches: number;
        noMatches: number;
        totalMatches: number;
    };
    experienceStats: {
        perfectMatches: number;
        partialMatches: number;
        noMatches: number;
        totalMatches: number;
    };
    timezoneStats: {
        perfectMatches: number;
        partialMatches: number;
        noMatches: number;
        totalMatches: number;
    };
    regionStats: {
        perfectMatches: number;
        partialMatches: number;
        noMatches: number;
        totalMatches: number;
    };
    availabilityStats: {
        perfectMatches: number;
        partialMatches: number;
        noMatches: number;
        totalMatches: number;
    };
}

export type Skill =
    | 'Cold Calling'
    | 'Lead Generation'
    | 'Sales Closing'
    | 'Customer Service'
    | 'Product Demonstration'
    | 'Negotiation'
    | 'Relationship Building'
    | 'Technical Support'
    | 'Market Research'
    | 'Social Media Marketing';

export type Industry =
    | 'Technology'
    | 'Healthcare'
    | 'Finance'
    | 'Retail'
    | 'Manufacturing'
    | 'Education'
    | 'Real Estate'
    | 'Hospitality'
    | 'Automotive'
    | 'Entertainment';

export type Language =
    | 'English'
    | 'Spanish'
    | 'French'
    | 'German'
    | 'Mandarin'
    | 'Japanese'
    | 'Portuguese'
    | 'Arabic'
    | 'Hindi'
    | 'Russian';

export interface MatchingWeights {
    experience: number;
    skills: number;
    industry: number;
    languages: number;
    availability: number;
    timezone: number;
    activities: number;
    region: number;
}

export interface IndustryMatch {
    matchedIndustries: boolean;
    score: number;
    details: {
        matchingIndustries: Array<{
            industry: string;
            industryName: string;
            agentIndustryName: string;
        }>;
        missingIndustries: Array<{
            industry: string;
            industryName: string;
        }>;
        matchStatus: 'perfect_match' | 'partial_match' | 'no_match' | 'neutral_match';
    };
}

export interface ActivityMatch {
    matchedActivities: boolean;
    score: number;
    details: {
        matchingActivities: Array<{
            activity: string;
            activityName: string;
            agentActivityName: string;
        }>;
        missingActivities: Array<{
            activity: string;
            activityName: string;
        }>;
        matchStatus: 'perfect_match' | 'partial_match' | 'no_match' | 'neutral_match';
    };
}

export interface ExperienceMatch {
    score: number;
    details: {
        gigRequiredExperience: number;
        agentExperience: number;
        difference: number;
        reason: string;
    };
    matchStatus: 'perfect_match' | 'partial_match' | 'no_match';
}

// Nouvelle interface pour GigAgent
export interface GigAgent {
    _id?: string;
    agentId: string;
    gigId: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
    matchScore: number;
    matchStatus: 'perfect_match' | 'partial_match' | 'no_match';
    matchDetails: {
        languageMatch: {
            score: number;
            details: {
                matchingLanguages: Array<{
                    language: string;
                    languageName: string;
                    requiredLevel: string;
                    agentLevel: string;
                }>;
                missingLanguages: Array<{
                    language: string;
                    languageName: string;
                    requiredLevel: string;
                }>;
                insufficientLanguages: Array<{
                    language: string;
                    languageName: string;
                    requiredLevel: string;
                    agentLevel: string;
                }>;
                matchStatus: 'perfect_match' | 'partial_match' | 'no_match';
            };
        };
        skillsMatch: {
            score: number;
            details: {
                matchingSkills: Array<{
                    skill: string;
                    skillName: string;
                    requiredLevel: number;
                    agentLevel: number;
                    type: 'technical' | 'professional' | 'soft' | 'contactCenter';
                }>;
                missingSkills: Array<{
                    skill: string;
                    skillName: string;
                    type: 'technical' | 'professional' | 'soft' | 'contactCenter';
                    requiredLevel: number;
                }>;
                insufficientSkills: Array<{
                    skill: string;
                    skillName: string;
                    requiredLevel: number;
                    agentLevel: number;
                    type: 'technical' | 'professional' | 'soft' | 'contactCenter';
                }>;
                matchStatus: 'perfect_match' | 'partial_match' | 'no_match';
            };
        };
        industryMatch: {
            score: number;
            details: {
                matchingIndustries: Array<{
                    industry: string;
                    industryName: string;
                    agentIndustryName: string;
                }>;
                missingIndustries: Array<{
                    industry: string;
                    industryName: string;
                }>;
                matchStatus: 'perfect_match' | 'partial_match' | 'no_match' | 'neutral_match';
            };
        };
        activityMatch: {
            score: number;
            details: {
                matchingActivities: Array<{
                    activity: string;
                    activityName: string;
                    agentActivityName: string;
                }>;
                missingActivities: Array<{
                    activity: string;
                    activityName: string;
                }>;
                matchStatus: 'perfect_match' | 'partial_match' | 'no_match' | 'neutral_match';
            };
        };
        experienceMatch: {
            score: number;
            details: {
                gigRequiredExperience: number;
                agentExperience: number;
                difference: number;
                reason: string;
            };
            matchStatus: 'perfect_match' | 'partial_match' | 'no_match';
        };
        timezoneMatch: {
            score: number;
            details: {
                gigTimezone: string;
                agentTimezone: string;
                gigGmtOffset?: number;
                agentGmtOffset?: number;
                gmtOffsetDifference?: number;
                reason: string;
            };
            matchStatus: 'perfect_match' | 'partial_match' | 'no_match';
        };
        regionMatch: {
            score: number;
            details: {
                gigDestinationZone: string;
                agentCountryCode: string;
                reason: string;
            };
            matchStatus: 'perfect_match' | 'partial_match' | 'no_match';
        };
        availabilityMatch: {
            score: number;
            details: {
                matchingDays: Array<{
                    day: string;
                    gigHours: { start: string; end: string };
                    agentHours: { start: string; end: string };
                }>;
                missingDays: string[];
                insufficientHours: Array<{
                    day: string;
                    gigHours: { start: string; end: string };
                    agentHours: { start: string; end: string };
                }>;
            };
            matchStatus: 'perfect_match' | 'partial_match' | 'no_match';
        };
    };
    emailSent: boolean;
    emailSentAt?: Date;
    agentResponse: 'accepted' | 'rejected' | 'pending';
    agentResponseAt?: Date;
    notes?: string;
    assignedBy?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    deadline?: Date;
    matchingWeights: {
        experience: number;
        skills: number;
        industry: number;
        languages: number;
        availability: number;
        timezone: number;
        activities: number;
        region: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

// Interface pour la création d'un GigAgent
export interface GigAgentRequest {
    agentId: string;
    gigId: string;
    matchDetails?: any;
    notes?: string;
    assignedBy?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    deadline?: Date;
    matchingWeights?: MatchingWeights;
}

// Interface pour la réponse de création d'un GigAgent
export interface GigAgentResponse {
    message: string;
    gigAgent: GigAgent;
    emailSent: boolean;
    matchScore: number;
}
