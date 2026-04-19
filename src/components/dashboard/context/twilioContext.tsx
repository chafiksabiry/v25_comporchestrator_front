import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";

type TwilioContextType = {
    twilioStatus: string;
    setTwilioStatus: (status: string) => void; // Add setTwilioStatus here
    fetchTwilioStatus: (userId: string) => void;
};

const TwilioContext = createContext<TwilioContextType | undefined>(undefined);

export const TwilioProvider = ({ children }: { children: ReactNode }) => {
    const [twilioStatus, setTwilioStatus] = useState<string>("disconnected");

    const fetchTwilioStatus = async (userId: string) => {
        try {
            const response = await axios.get(`/api/twilio-status?userId=${userId}`);
            setTwilioStatus(response.data.status); // ✅ Update status from API
        } catch (error) {
            console.error("Failed to fetch Twilio status:", error);
        }
    };

    return (
        <TwilioContext.Provider value={{ twilioStatus, setTwilioStatus, fetchTwilioStatus }}>
            {children}
        </TwilioContext.Provider>
    );
};

// Custom hook for easy access
export const useTwilio = () => {
    const context = useContext(TwilioContext);
    if (!context) {
        throw new Error("useTwilio must be used within a TwilioProvider");
    }
    return context;
};
