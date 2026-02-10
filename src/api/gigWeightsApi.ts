import axios from 'axios';
import { MatchingWeights, Availability } from '../types/matching';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5011/api';

export interface GigWeights {
    _id?: string;
    gigId: string;
    matchingWeights: MatchingWeights;
}

// Save matching weights for a gig
export const saveGigWeights = async (gigId: string, matchingWeights: MatchingWeights): Promise<GigWeights> => {
    console.log('🚨 SAVE GIG WEIGHTS CALLED:', { gigId, matchingWeights });
    try {
        const response = await axios.post(`${API_BASE_URL}/gig-matching-weights/${gigId}`, {
            matchingWeights
        });
        console.log('✅ SAVE GIG WEIGHTS SUCCESS:', response.data);
        return response.data.data;
    } catch (error) {
        console.error('❌ Error saving gig weights:', error);
        throw error;
    }
};

// Save availability (schedule) for a gig
export const saveGigAvailability = async (gigId: string, availability: Availability): Promise<any> => {
    try {
        const response = await axios.post(`${API_BASE_URL}/gigs/${gigId}/availability`, {
            availability
        });
        return response.data.data;
    } catch (error) {
        console.error('Error saving gig availability:', error);
        throw error;
    }
};

// Get availability (schedule) for a gig
export const getGigAvailability = async (gigId: string): Promise<Availability> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/gigs/${gigId}/availability`);
        return response.data.data;
    } catch (error) {
        console.error('Error getting gig availability:', error);
        throw error;
    }
};

// Update availability (schedule) for a gig
export const updateGigAvailability = async (gigId: string, availability: Availability): Promise<any> => {
    try {
        const response = await axios.put(`${API_BASE_URL}/gigs/${gigId}/availability`, {
            availability
        });
        return response.data.data;
    } catch (error) {
        console.error('Error updating gig availability:', error);
        throw error;
    }
};

// Get matching weights for a gig
export const getGigWeights = async (gigId: string): Promise<GigWeights> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/gig-matching-weights/${gigId}`);
        return response.data.data;
    } catch (error) {
        console.error('Error getting gig weights:', error);
        throw error;
    }
};

// Reset weights to defaults for a gig
export const resetGigWeights = async (gigId: string): Promise<GigWeights> => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/gig-matching-weights/${gigId}`);
        return response.data.data;
    } catch (error) {
        console.error('Error resetting gig weights:', error);
        throw error;
    }
}; 
