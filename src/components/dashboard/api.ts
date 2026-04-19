const API_BASE_URL = import.meta.env.MATCHING_API_URL 

// Fonction pour récupérer tous les reps
export const getReps = async () => {
  console.log('getReps called');
  try {
    const response = await fetch(`${API_BASE_URL}/reps`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erreur lors de la récupération des reps');
    }

    const data = await response.json();
    console.log('Parsed getReps response:', data);
    
    return data; // Retourne directement les données de l'API
  } catch (error) {
    console.error('Error in getReps:', error);
    throw error;
  }
};

// Fonction pour récupérer tous les gigs
export const getGigs = async () => {
  console.log('getGigs called');
  try {
    const response = await fetch(`${API_BASE_URL}/gigs`);
    console.log('Raw getGigs response:', response);
    const data = await response.json();
    console.log('Parsed getGigs response:', data);
    return data;
  } catch (error) {
    console.error('Error in getGigs:', error);
    throw error;
  }
};

// Fonction pour trouver les matches pour un gig
export const findMatchesForGig = async (gigId: string, weights: any) => {
  console.log('findMatchesForGig called with:', { gigId, weights });
  try {
    const response = await fetch(`${API_BASE_URL}/matches/gig/${gigId}/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ weights }),
    });
    console.log('Raw API response:', response);
    const data = await response.json();
    console.log('Parsed API response:', data);
    return data;
  } catch (error) {
    console.error('Error in findMatchesForGig:', error);
    throw error;
  }
};

// Fonction pour trouver les gigs pour un rep
export const findGigsForRep = async (repId: string, weights: any) => {
  console.log('findGigsForRep called with:', { repId, weights });
  try {
    const response = await fetch(`${API_BASE_URL}/matches/rep/${repId}/gigs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ weights }),
    });
    console.log('Raw API response:', response);
    const data = await response.json();
    console.log('Parsed API response:', data);
    return data;
  } catch (error) {
    console.error('Error in findGigsForRep:', error);
    throw error;
  }
};

// Fonction pour générer les matches optimaux
export const generateOptimalMatches = async (weights: any) => {
  console.log('generateOptimalMatches called with weights:', weights);
  try {
    const response = await fetch(`${API_BASE_URL}/matches/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ weights }),
    });
    console.log('Raw API response:', response);
    const data = await response.json();
    console.log('Parsed API response:', data);
    return data;
  } catch (error) {
    console.error('Error in generateOptimalMatches:', error);
    throw error;
  }
}; 
