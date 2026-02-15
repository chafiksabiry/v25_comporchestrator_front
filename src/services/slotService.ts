import axios from 'axios';

const MATCHING_API_URL = import.meta.env.VITE_MATCHING_API_URL || 'https://v25matchingbackend-production.up.railway.app/api';

export interface Slot {
    _id?: string;
    gigId: string;
    date: string; // yyyy-MM-dd
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    duration: number; // hours
    capacity: number;
    reservedCount: number;
    status: 'available' | 'full' | 'cancelled';
    notes?: string;
}

export interface SlotGenerationParams {
    gigId: string;
    startDate: string; // yyyy-MM-dd
    endDate: string; // yyyy-MM-dd
    slotDuration: number; // hours (e.g., 0.5 for 30min, 1 for 1h)
    capacity: number;
    startHour?: number; // default 9
    endHour?: number; // default 18
    notes?: string;
}

export interface Reservation {
    _id?: string;
    agentId: string;
    slotId: string;
    gigId: string;
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    status: 'reserved' | 'cancelled';
    notes?: string;
}

export const slotApi = {
    /**
     * Generate slots automatically for a Gig
     */
    generateSlots: async (params: SlotGenerationParams): Promise<{ message: string; slots: Slot[] }> => {
        try {
            const response = await axios.post(`${MATCHING_API_URL}/slots/generate`, params);
            return response.data as any;
        } catch (error: any) {
            console.error('Error generating slots:', error);
            throw error;
        }
    },

    /**
     * Get all slots for a gig, optionally filtered by date
     */
    getSlots: async (gigId?: string, date?: string): Promise<Slot[]> => {
        try {
            const params: any = {};
            if (gigId) params.gigId = gigId;
            if (date) params.date = date;

            const response = await axios.get(`${MATCHING_API_URL}/slots`, { params });
            return response.data as any;
        } catch (error) {
            console.error('Error fetching slots:', error);
            throw error;
        }
    },

    /**
     * Reserve a slot
     */
    reserveSlot: async (slotId: string, agentId: string, notes?: string): Promise<{ message: string; reservation: Reservation }> => {
        try {
            const response = await axios.post(`${MATCHING_API_URL}/slots/${slotId}/reserve`, {
                agentId,
                notes
            });
            return response.data as any;
        } catch (error: any) {
            console.error('Error reserving slot:', error);
            throw error;
        }
    },

    /**
     * Cancel a reservation
     */
    cancelReservation: async (reservationId: string): Promise<{ message: string; reservation: Reservation }> => {
        try {
            const response = await axios.delete(`${MATCHING_API_URL}/slots/reservations/${reservationId}`);
            return response.data as any;
        } catch (error) {
            console.error('Error cancelling reservation:', error);
            throw error;
        }
    },

    /**
     * Get reservations for an agent
     */
    getReservations: async (agentId?: string, gigId?: string): Promise<Reservation[]> => {
        try {
            const params: any = {};
            if (agentId) params.agentId = agentId;
            if (gigId) params.gigId = gigId;

            const response = await axios.get(`${MATCHING_API_URL}/slots/reservations`, { params });
            return response.data as any;
        } catch (error) {
            console.error('Error fetching reservations:', error);
            throw error;
        }
    }
};
