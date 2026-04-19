import { io } from 'socket.io-client';
import { store } from '../store';
import { updateLiveCall, removeLiveCall } from '../store/slices/dashboardSlice';

const socket = io(`${import.meta.env.VITE_COMPANY_API_URL}`, {
  autoConnect: false
});

socket.on('call:update', (call) => {
  store.dispatch(updateLiveCall(call));
});

socket.on('call:end', (callId) => {
  store.dispatch(removeLiveCall(callId));
});

export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (token) {
    socket.auth = { token };
    socket.connect();
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export default socket;
