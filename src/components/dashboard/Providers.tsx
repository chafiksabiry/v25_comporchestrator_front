import React from "react";
import { Provider } from "react-redux"; // Redux Provider
import { store } from "./store"; // Redux store
import { TwilioProvider } from "./context/twilioContext";
import { UserProvider } from "./context/userContext";
import { AuthProvider } from "./contexts/AuthContext";
//import { ChatIntegrationProvider } from "./context/ChatIntegrationContext";
//import { AnotherProvider } from "./context/AnotherContext"; // Example for another app

const Providers = ({ children }: { children: React.ReactNode }) => {
    return (
        <Provider store={store}>
            <AuthProvider>
                <UserProvider>
                    <TwilioProvider>
                        {children}
                    </TwilioProvider>
                </UserProvider>
            </AuthProvider>
        </Provider>
    );
};

export default Providers;
