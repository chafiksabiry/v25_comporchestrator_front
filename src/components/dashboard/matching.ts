import { Rep, Gig, Match, MatchResponse, MatchingWeights, GigAgentRequest } from '../types/matching';

// URLs des APIs - utilise les mêmes que le projet matching
const MATCHING_API_URL = import.meta.env.VITE_MATCHING_API_URL || 'http://localhost:5011/api';
const GIGS_API_URL = import.meta.env.VITE_API_URL_GIGS || 'http://localhost:5012/api';

// ===== REPS API =====
export const getReps = async (): Promise<Rep[]> => {
  console.log('getReps called');
  try {
    const response = await fetch(`${MATCHING_API_URL}/reps`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch reps');
    }

    const data = await response.json();
    console.log('Parsed getReps response:', data);
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format: expected an array of reps');
    }
    
    return data;
  } catch (error) {
    console.error('Error in getReps:', error);
    throw error;
  }
};

// ===== GIGS API =====
export const getGigs = async (): Promise<Gig[]> => {
  console.log('getGigs called');
  try {
    const response = await fetch(`${MATCHING_API_URL}/gigs`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch gigs');
    }
    
    const data = await response.json();
    console.log('Parsed getGigs response:', data);
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format: expected an array of gigs');
    }
    
    return data;
  } catch (error) {
    console.error('Error in getGigs:', error);
    throw error;
  }
};

export const getGigsByCompanyId = async (companyId: string): Promise<Gig[]> => {
  console.log('getGigsByCompanyId called with:', companyId);
  try {
    const response = await fetch(`${GIGS_API_URL}/gigs/company/${companyId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch gigs by company');
    }
    
    const result = await response.json();
    console.log('Parsed getGigsByCompanyId response:', result);
    
    return result.data || [];
  } catch (error) {
    console.error('Error in getGigsByCompanyId:', error);
    throw error;
  }
};

// ===== MATCHING API =====
export const findMatchesForGig = async (gigId: string, weights: MatchingWeights): Promise<MatchResponse> => {
  console.log('findMatchesForGig called with:', { gigId, weights });
  try {
    const response = await fetch(`${MATCHING_API_URL}/matches/gig/${gigId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ weights }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to find matches for gig');
    }
    
    const data = await response.json();
    console.log('Parsed findMatchesForGig response:', data);
    
    // Vérifier la structure de la réponse
    if (data.preferedmatches) {
      return data as MatchResponse;
    } else {
      // Fallback pour l'ancienne structure
      return {
        totalMatches: data.matches?.length || 0,
        perfectMatches: 0,
        partialMatches: 0,
        noMatches: 0,
        preferedmatches: data.matches || [],
        matches: data.matches || []
      } as MatchResponse;
    }
  } catch (error) {
    console.error('Error in findMatchesForGig:', error);
    throw error;
  }
};

export const findGigsForRep = async (agentId: string, weights: MatchingWeights): Promise<{ matches: Match[] }> => {
  console.log('findGigsForRep called with:', { agentId, weights });
  try {
    const response = await fetch(`${MATCHING_API_URL}/matches/agent/${agentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ weights }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to find gigs for rep');
    }
    
    const data = await response.json();
    console.log('Parsed findGigsForRep response:', data);
    
    return {
      matches: data.matches || []
    };
  } catch (error) {
    console.error('Error in findGigsForRep:', error);
    throw error;
  }
};

export const generateOptimalMatches = async (weights: MatchingWeights): Promise<{ matches: Match[] }> => {
  console.log('generateOptimalMatches called with weights:', weights);
  try {
    const response = await fetch(`${MATCHING_API_URL}/matches/optimal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ weights }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate optimal matches');
    }
    
    const data = await response.json();
    console.log('Parsed generateOptimalMatches response:', data);
    
    return {
      matches: data.matches || []
    };
  } catch (error) {
    console.error('Error in generateOptimalMatches:', error);
    throw error;
  }
};

// ===== GIG-AGENT API =====
export const createGigAgent = async (request: GigAgentRequest) => {
  console.log('createGigAgent called with:', request);
  try {
    const response = await fetch(`${MATCHING_API_URL}/gig-agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create gig-agent');
    }
    
    const data = await response.json();
    console.log('Parsed createGigAgent response:', data);
    
    return data;
  } catch (error) {
    console.error('Error in createGigAgent:', error);
    throw error;
  }
};

export const getGigAgentsForGig = async (gigId: string): Promise<any[]> => {
  console.log('getGigAgentsForGig called with:', gigId);
  try {
    const response = await fetch(`${MATCHING_API_URL}/gig-agents/gig/${gigId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch gig agents');
    }
    
    const data = await response.json();
    console.log('Parsed getGigAgentsForGig response:', data);
    
    return data || [];
  } catch (error) {
    console.error('Error in getGigAgentsForGig:', error);
    throw error;
  }
};

export const getInvitedAgentsForCompany = async (companyId: string): Promise<any[]> => {
  try {
    const response = await fetch(`${MATCHING_API_URL}/gig-agents/invited/company/${companyId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📧 Invited agents for company:', data);
    return data;
  } catch (error) {
    console.error('Error fetching invited agents for company:', error);
    throw error;
  }
};

export const getActiveAgentsForCompany = async (companyId: string): Promise<any[]> => {
  try {
    const response = await fetch(`${MATCHING_API_URL}/gig-agents/active-agents/company/${companyId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Active agents for company:', data);
    return data;
  } catch (error) {
    console.error('Error fetching active agents for company:', error);
    throw error;
  }
};

// Accept enrollment request
export const acceptEnrollmentRequest = async (gigAgentId: string, notes?: string): Promise<any> => {
  try {
    const response = await fetch(`${MATCHING_API_URL}/gig-agents/enrollment-requests/${gigAgentId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Enrollment request accepted:', data);
    return data;
  } catch (error) {
    console.error('Error accepting enrollment request:', error);
    throw error;
  }
};

// Reject enrollment request
export const rejectEnrollmentRequest = async (gigAgentId: string, notes?: string): Promise<any> => {
  try {
    const response = await fetch(`${MATCHING_API_URL}/gig-agents/enrollment-requests/${gigAgentId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('❌ Enrollment request rejected:', data);
    return data;
  } catch (error) {
    console.error('Error rejecting enrollment request:', error);
    throw error;
  }
};

export const getEnrollmentRequestsForCompany = async (companyId: string): Promise<any[]> => {
  try {
    const response = await fetch(`${MATCHING_API_URL}/gig-agents/enrollment-requests/company/${companyId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📋 Enrollment requests for company:', data);
    return data;
  } catch (error) {
    console.error('Error fetching enrollment requests for company:', error);
    throw error;
  }
};

// ===== SKILLS & LANGUAGES API =====
export interface Skill {
  _id: string;
  name: string;
  category?: string;
}

export interface Language {
  _id: string;
  name: string;
  code: string;
}

export const getAllSkills = async (): Promise<{
  professional: Skill[];
  technical: Skill[];
  soft: Skill[];
}> => {
  console.log('getAllSkills called');
  
  // Return mock data for now since the API endpoint doesn't exist
  const mockSkills = {
    professional: [
      { _id: '1', name: 'Sales Management', category: 'professional' },
      { _id: '2', name: 'Customer Service', category: 'professional' },
      { _id: '3', name: 'Project Management', category: 'professional' },
    ],
    technical: [
      { _id: '4', name: 'CRM Software', category: 'technical' },
      { _id: '5', name: 'Data Analysis', category: 'technical' },
      { _id: '6', name: 'Excel Advanced', category: 'technical' },
    ],
    soft: [
      { _id: '7', name: 'Communication', category: 'soft' },
      { _id: '8', name: 'Leadership', category: 'soft' },
      { _id: '9', name: 'Problem Solving', category: 'soft' },
    ]
  };
  
  console.log('Using mock skills data:', mockSkills);
  return mockSkills;
  
  /* Commented out until API endpoint is available
  try {
    const response = await fetch(`${MATCHING_API_URL}/skills`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch skills');
    }
    
    const data = await response.json();
    console.log('Parsed getAllSkills response:', data);
    
    return {
      professional: data.professional || [],
      technical: data.technical || [],
      soft: data.soft || []
    };
  } catch (error) {
    console.error('Error in getAllSkills:', error);
    return mockSkills;
  }
  */
};

export const getLanguages = async (): Promise<Language[]> => {
  console.log('getLanguages called');
  
  // Return mock data for now since the API endpoint doesn't exist
  const mockLanguages = [
    { _id: '1', name: 'English', code: 'en' },
    { _id: '2', name: 'French', code: 'fr' },
    { _id: '3', name: 'Spanish', code: 'es' },
    { _id: '4', name: 'German', code: 'de' },
    { _id: '5', name: 'Italian', code: 'it' },
    { _id: '6', name: 'Portuguese', code: 'pt' },
    { _id: '7', name: 'Dutch', code: 'nl' },
    { _id: '8', name: 'Arabic', code: 'ar' },
    { _id: '9', name: 'Chinese', code: 'zh' },
    { _id: '10', name: 'Japanese', code: 'ja' },
  ];
  
  console.log('Using mock languages data:', mockLanguages);
  return mockLanguages;
  
  /* Commented out until API endpoint is available
  try {
    const response = await fetch(`${MATCHING_API_URL}/languages`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch languages');
    }
    
    const data = await response.json();
    console.log('Parsed getLanguages response:', data);
    
    return data || [];
  } catch (error) {
    console.error('Error in getLanguages:', error);
    return mockLanguages;
  }
  */
};

// ===== GIG WEIGHTS API =====
export interface GigWeights {
  _id?: string;
  gigId: string;
  matchingWeights: MatchingWeights;
  createdAt?: Date;
  updatedAt?: Date;
}

// Save matching weights for a gig
export const saveGigWeights = async (gigId: string, matchingWeights: MatchingWeights): Promise<GigWeights> => {
  console.log('🚨 SAVE GIG WEIGHTS CALLED:', { gigId, matchingWeights });
  try {
    const response = await fetch(`${MATCHING_API_URL}/gig-matching-weights/${gigId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matchingWeights
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save gig weights');
    }
    
    const data = await response.json();
    console.log('✅ SAVE GIG WEIGHTS SUCCESS:', data);
    return data.data || data;
  } catch (error) {
    console.error('❌ Error saving gig weights:', error);
    throw error;
  }
};

// Get matching weights for a gig
export const getGigWeights = async (gigId: string): Promise<GigWeights> => {
  console.log('🔄 GET GIG WEIGHTS CALLED:', gigId);
  try {
    const response = await fetch(`${MATCHING_API_URL}/gig-matching-weights/${gigId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No saved weights found for this gig');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get gig weights');
    }
    
    const data = await response.json();
    console.log('✅ GET GIG WEIGHTS SUCCESS:', data);
    return data.data || data;
  } catch (error) {
    console.error('❌ Error getting gig weights:', error);
    throw error;
  }
};

// Reset weights to defaults for a gig
export const resetGigWeights = async (gigId: string): Promise<void> => {
  console.log('🔄 RESET GIG WEIGHTS CALLED:', gigId);
  try {
    const response = await fetch(`${MATCHING_API_URL}/gig-matching-weights/${gigId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to reset gig weights');
    }
    
    console.log('✅ RESET GIG WEIGHTS SUCCESS');
  } catch (error) {
    console.error('❌ Error resetting gig weights:', error);
    throw error;
  }
};
