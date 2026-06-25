import { Match } from '../../../types/matching';

export type ScoreColor = {
    main: string;
    soft: string;
    border: string;
    track: string;
};

export const getScoreColor = (score: number): ScoreColor => {
    const clamped = Math.max(0, Math.min(100, score));
    const hue = (clamped / 100) * 140;
    const sat = 55 + (clamped / 100) * 15;
    const light = 38 + (clamped / 100) * 7;
    return {
        main: `hsl(${hue}, ${sat}%, ${light}%)`,
        soft: `hsl(${hue}, ${sat}%, 96%)`,
        border: `hsl(${hue}, ${sat}%, 86%)`,
        track: `hsl(${hue}, ${sat}%, 92%)`,
    };
};

const resolveAgentId = (record: any): string | null => {
    if (!record) return null;
    if (typeof record === 'string') return record;
    if (record.agentId) {
        return typeof record.agentId === 'object'
            ? String(record.agentId._id || record.agentId.id || '')
            : String(record.agentId);
    }
    if (record.agentInfo?._id) return String(record.agentInfo._id);
    if (record._id && (record.personalInfo || record.professionalSummary)) {
        return String(record._id);
    }
    return null;
};

const extractAgentProfile = (record: any): any | null => {
    if (!record) return null;
    if (record.agentInfo?.personalInfo || record.agentInfo?.professionalSummary) {
        return record.agentInfo;
    }
    if (record.agentId && typeof record.agentId === 'object' && (record.agentId.personalInfo || record.agentId.professionalSummary)) {
        return record.agentId;
    }
    if (record.personalInfo || record.professionalSummary) {
        return record;
    }
    return null;
};

const resolveGigId = (record: any): string | null => {
    if (!record?.gigId) return record?.gig?._id ? String(record.gig._id) : null;
    return typeof record.gigId === 'object' ? String(record.gigId._id || record.gigId.id || '') : String(record.gigId);
};

const scoreFromMatchDetails = (details: any): number | null => {
    if (!details) return null;

    const languageScore = details.languageMatch?.score ?? 0;
    const skillsScore = details.skillsMatch?.score ?? 0;
    const industryScore = details.industryMatch?.score ?? 0;
    const activityScore = details.activityMatch?.score ?? 0;
    const experienceScore = details.experienceMatch?.score ?? 0;
    const timezoneScore = details.timezoneMatch?.score ?? 0;
    const regionScore = details.regionMatch?.score ?? 0;
    const availabilityScore = details.availabilityMatch?.score ?? 0;

    const weights = {
        language: 0.15,
        skills: 0.20,
        industry: 0.20,
        activity: 0.05,
        experience: 0.20,
        timezone: 0.10,
        region: 0.05,
        availability: 0.05,
    };

    const hasAnyScore = [
        details.languageMatch?.score,
        details.skillsMatch?.score,
        details.industryMatch?.score,
        details.activityMatch?.score,
        details.experienceMatch?.score,
        details.timezoneMatch?.score,
        details.regionMatch?.score,
        details.availabilityMatch?.score,
    ].some((score) => typeof score === 'number');

    if (!hasAnyScore) return null;

    return (
        languageScore * weights.language +
        skillsScore * weights.skills +
        industryScore * weights.industry +
        activityScore * weights.activity +
        experienceScore * weights.experience +
        timezoneScore * weights.timezone +
        regionScore * weights.region +
        availabilityScore * weights.availability
    );
};

const findCachedMatch = (record: any, cachedMatches: Match[] = []): Match | undefined => {
    const agentId = resolveAgentId(record);
    const gigId = resolveGigId(record);
    if (!agentId) return undefined;

    const exact = cachedMatches.find((match) => {
        const sameAgent = String(match.agentId) === String(agentId);
        const sameGig = !gigId || String(match.gigId || '') === String(gigId);
        return sameAgent && sameGig;
    });
    if (exact) return exact;

    if (!gigId) {
        const agentMatches = cachedMatches.filter((match) => String(match.agentId) === String(agentId));
        if (agentMatches.length) {
            return agentMatches.reduce((bestMatch, current) =>
                (current.totalMatchingScore || 0) > (bestMatch.totalMatchingScore || 0) ? current : bestMatch
            );
        }
    }

    return undefined;
};

export const getMatchScorePercent = (record: any, cachedMatches: Match[] = []): number => {
    const cached = findCachedMatch(record, cachedMatches);
    if (cached?.totalMatchingScore != null) {
        return Math.round(Number(cached.totalMatchingScore) * 100);
    }

    if (record?.totalMatchingScore != null) {
        return Math.round(Number(record.totalMatchingScore) * 100);
    }
    if (record?.matchScore != null) {
        return Math.round(Number(record.matchScore) * 100);
    }

    const detailsScore = scoreFromMatchDetails(record?.matchDetails);
    if (detailsScore != null) {
        return Math.round(detailsScore * 100);
    }

    return 0;
};

export const normalizeRecordToMatch = (record: any, cachedMatches: Match[] = []): Match => {
    const agentProfile = extractAgentProfile(record);
    const agentId = resolveAgentId(record) || '';
    const gigId = resolveGigId(record) || undefined;

    const cached = findCachedMatch(record, cachedMatches);
    if (cached) {
        return cached;
    }

    if (record?.agentInfo && record?.totalMatchingScore != null) {
        return record as Match;
    }

    const details = record?.matchDetails || {};

    const totalMatchingScore =
        record?.totalMatchingScore ??
        record?.matchScore ??
        scoreFromMatchDetails(details) ??
        0;

    const agentInfo = agentProfile
        ? {
            ...agentProfile,
            name: agentProfile.personalInfo?.name || agentProfile.name || '',
        }
        : {
            name: '',
            personalInfo: {},
            professionalSummary: {},
            skills: { technical: [], professional: [], soft: [], contactCenter: [] },
            experience: [],
            availability: {},
            status: '',
        };

    return {
        agentId,
        gigId,
        agentInfo,
        totalMatchingScore,
        skillsMatch: details.skillsMatch,
        languageMatch: details.languageMatch,
        industryMatch: details.industryMatch,
        activityMatch: details.activityMatch,
        experienceMatch: details.experienceMatch,
        timezoneMatch: details.timezoneMatch,
        regionMatch: details.regionMatch,
        availabilityMatch: details.availabilityMatch,
        matchStatus: record?.matchStatus || 'partial_match',
    } as Match;
};

export const getRecordExpandKey = (record: any): string => {
    const agentId = resolveAgentId(record) || 'unknown';
    const gigId = resolveGigId(record) || record?._id || 'record';
    return `${agentId}-${gigId}`;
};

export const getAgentDisplayName = (record: any, fallback = ''): string => {
    const profile = extractAgentProfile(record);
    return profile?.personalInfo?.name || profile?.name || fallback;
};

export const getGigTitle = (record: any): string | undefined =>
    record?.gigId?.title || record?.gig?.title;

export const recordMatchesSearch = (record: any, searchTerm: string): boolean => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;

    const profile = extractAgentProfile(record);
    const name = (profile?.personalInfo?.name || profile?.name || '').toLowerCase();
    const email = (profile?.personalInfo?.email || profile?.email || '').toLowerCase();
    const gigTitle = (getGigTitle(record) || '').toLowerCase();

    return name.includes(query) || email.includes(query) || gigTitle.includes(query);
};

export const sortRecordsByMatchScore = (records: any[], cachedMatches: Match[] = []): any[] =>
    [...records].sort(
        (a, b) => getMatchScorePercent(b, cachedMatches) - getMatchScorePercent(a, cachedMatches)
    );

export const mergeMatchCaches = (...caches: Match[][]): Match[] => {
    const merged = new Map<string, Match>();
    caches.flat().forEach((match) => {
        if (!match?.agentId) return;
        merged.set(`${match.agentId}-${match.gigId || ''}`, match);
    });
    return Array.from(merged.values());
};

export const collectUniqueGigIds = (records: any[]): string[] => {
    const gigIds = new Set<string>();
    records.forEach((record) => {
        const gigId = resolveGigId(record);
        if (gigId) gigIds.add(gigId);
    });
    return Array.from(gigIds);
};
