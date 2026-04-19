import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface ChatIntegrationContextProps {
  isChatConnected: boolean;
  setIsChatConnected: React.Dispatch<React.SetStateAction<boolean>>;
}

const ChatIntegrationContext = createContext<ChatIntegrationContextProps | undefined>(undefined);

export const ChatIntegrationProvider: React.FC<{ userId: string }> = ({ children, userId }) => {
  const [isChatConnected, setIsChatConnected] = useState(false);

  useEffect(() => {
    const fetchIntegrationStatus = async () => {
      try {
        const integrationEndpoints = [
          { id: "whatsapp", url: `http://localhost:5009/api/whatsapp/status?userId=${userId}` },
          { id: "telegram", url: `http://localhost:5009/api/telegram/status?userId=${userId}` }
        ];

        const responses = await Promise.all(
          integrationEndpoints.map(integration =>
            axios.get(integration.url).catch(err => ({ id: integration.id, error: err }))
          )
        );

        const chatIntegrations = ["telegram", "slack", "whatsapp"];
        const chatConnected = responses.some(response =>
          chatIntegrations.includes(response.id) && response.data && response.data.success && response.data.status === 'connected'
        );

        setIsChatConnected(chatConnected);
      } catch (err) {
        console.error("Error fetching integration status:", err);
      }
    };

    fetchIntegrationStatus();
  }, [userId]);

  return (
    <ChatIntegrationContext.Provider value={{ isChatConnected, setIsChatConnected }}>
      {children}
    </ChatIntegrationContext.Provider>
  );
};

export const useChatIntegration = () => {
  const context = useContext(ChatIntegrationContext);
  if (!context) {
    throw new Error('useChatIntegration must be used within a ChatIntegrationProvider');
  }
  return context;
};
