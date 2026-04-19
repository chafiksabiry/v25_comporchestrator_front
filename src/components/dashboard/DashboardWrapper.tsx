import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './index.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const DashboardWrapper: React.FC = () => {
    return (
        <AuthProvider>
            <Provider store={store}>
                <App />
                <ToastContainer />
            </Provider>
        </AuthProvider>
    );
};

export default DashboardWrapper;
