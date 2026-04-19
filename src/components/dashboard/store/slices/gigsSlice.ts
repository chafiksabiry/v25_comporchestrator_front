import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

interface Gig {
  id: string;
  name: string;
  category: string;
  description: string;
  activeReps: number;
  totalCalls: number;
  revenue: string;
  successRate: number;
  status: 'active' | 'pending' | 'completed';
  startDate: string;
  endDate?: string;
}

interface GigsState {
  gigs: Gig[];
  loading: boolean;
  error: string | null;
}

const initialState: GigsState = {
  gigs: [],
  loading: false,
  error: null
};

export const fetchGigs = createAsyncThunk(
  'gigs/fetchGigs',
  async () => {
    const response = await api.get('/gigs');
    return response.data;
  }
);

export const createGig = createAsyncThunk(
  'gigs/createGig',
  async (gigData: Partial<Gig>) => {
    const response = await api.post('/gigs', gigData);
    return response.data;
  }
);

export const updateGig = createAsyncThunk(
  'gigs/updateGig',
  async ({ id, data }: { id: string; data: Partial<Gig> }) => {
    const response = await api.put(`/gigs/${id}`, data);
    return response.data;
  }
);

const gigsSlice = createSlice({
  name: 'gigs',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGigs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGigs.fulfilled, (state, action) => {
        state.loading = false;
        state.gigs = action.payload;
      })
      .addCase(fetchGigs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch gigs';
      })
      .addCase(createGig.fulfilled, (state, action) => {
        state.gigs.push(action.payload);
      })
      .addCase(updateGig.fulfilled, (state, action) => {
        const index = state.gigs.findIndex(gig => gig.id === action.payload.id);
        if (index !== -1) {
          state.gigs[index] = action.payload;
        }
      });
  }
});

export default gigsSlice.reducer;
