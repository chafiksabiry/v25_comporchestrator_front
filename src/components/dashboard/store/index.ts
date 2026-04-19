import { configureStore } from '@reduxjs/toolkit';
import dashboardReducer from './slices/dashboardSlice';
import gigsReducer from './slices/gigsSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
    gigs: gigsReducer,
    user: userReducer,
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
