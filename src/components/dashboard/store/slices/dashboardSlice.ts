import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardApi } from '../../services/api';

interface DashboardState {
  stats: {
    activeGigs: number;
    globalReps: number;
    successRate: number;
    revenue: number;
  };
  liveCalls: Array<{
    id: string;
    name: string;
    type: string;
    duration: string;
    status: 'active' | 'waiting';
  }>;
  topGigs: Array<{
    name: string;
    success: number;
    calls: number;
    revenue: string;
  }>;
  topReps: Array<{
    name: string;
    rating: number;
    calls: number;
    revenue: string;
  }>;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  stats: {
    activeGigs: 0,
    globalReps: 0,
    successRate: 0,
    revenue: 0
  },
  liveCalls: [],
  topGigs: [],
  topReps: [],
  loading: false,
  error: null
};

export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async ({ timeRange, region }: { timeRange: string; region: string }) => {
    const response = await dashboardApi.getStats(timeRange, region);
    return response;
  }
);

export const fetchLiveCalls = createAsyncThunk(
  'dashboard/fetchLiveCalls',
  async () => {
    const response = await dashboardApi.getLiveCalls();
    return response;
  }
);

export const fetchTopGigs = createAsyncThunk(
  'dashboard/fetchTopGigs',
  async () => {
    const response = await dashboardApi.getTopGigs();
    return response;
  }
);

export const fetchTopReps = createAsyncThunk(
  'dashboard/fetchTopReps',
  async () => {
    const response = await dashboardApi.getTopReps();
    return response;
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    updateLiveCall: (state, action) => {
      const index = state.liveCalls.findIndex(call => call.id === action.payload.id);
      if (index !== -1) {
        state.liveCalls[index] = action.payload;
      } else {
        state.liveCalls.push(action.payload);
      }
    },
    removeLiveCall: (state, action) => {
      state.liveCalls = state.liveCalls.filter(call => call.id !== action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch stats';
      })
      .addCase(fetchLiveCalls.fulfilled, (state, action) => {
        state.liveCalls = action.payload;
      })
      .addCase(fetchTopGigs.fulfilled, (state, action) => {
        state.topGigs = action.payload;
      })
      .addCase(fetchTopReps.fulfilled, (state, action) => {
        state.topReps = action.payload;
      });
  }
});

export const { updateLiveCall, removeLiveCall } = dashboardSlice.actions;
export default dashboardSlice.reducer;
