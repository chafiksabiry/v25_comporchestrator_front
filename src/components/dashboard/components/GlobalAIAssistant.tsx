import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

// Types
export interface AIAssistantMessage {
  role: 'assistant' | 'system';
  content: string;
  timestamp: Date;
  category: 'suggestion' | 'alert' | 'info' | 'action';
  priority: 'high' | 'medium' | 'low';
  isProcessed?: boolean;
}

// Stockage des messages et de l'état du panel en dehors du cycle React
const globalState = {
  messages: [] as AIAssistantMessage[],
  isVisible: true,
  isMinimized: false,
  selectedCategory: 'all' as 'all' | 'suggestion' | 'alert' | 'info' | 'action',
  callEnded: false,
  isSaving: false,
  currentCallSid: null as string | null,
  currentAgentId: null as string | null,
  currentUser: null as any,
  setMessages: (messages: AIAssistantMessage[]) => {
    globalState.messages = messages;
    globalState.notifySubscribers();
  },
  setVisible: (visible: boolean) => {
    globalState.isVisible = visible;
    globalState.notifySubscribers();
  },
  setMinimized: (minimized: boolean) => {
    globalState.isMinimized = minimized;
    globalState.notifySubscribers();
  },
  setSelectedCategory: (category: 'all' | 'suggestion' | 'alert' | 'info' | 'action') => {
    globalState.selectedCategory = category;
    globalState.notifySubscribers();
  },
  setCallEnded: (ended: boolean) => {
    globalState.callEnded = ended;
    globalState.notifySubscribers();
  },
  setCallDetails: (callSid: string, agentId: string) => {
    globalState.currentCallSid = callSid;
    globalState.currentAgentId = agentId;
    globalState.notifySubscribers();
  },
  saveCallToDB: async () => {
    if (globalState.isSaving || !globalState.currentCallSid) {
      
      return;
    }

    try {
      globalState.isSaving = true;
      

      // Get the current messages
      const currentMessages = [...globalState.messages];
      

      const result = await axios.post(`${import.meta.env.VITE_API_URL_CALL}/api/calls/call-details`, {
        callSid: globalState.currentCallSid,
        userId: "6807abfc2c1ca099fe2b13c5"
      });
      const call = result.data.data;
      
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let cloudinaryRecord = { data: { url: null } };
      if (call.recordingUrl) {
        cloudinaryRecord = await axios.post(`${import.meta.env.VITE_API_URL_CALL}/api/calls/fetch-recording`, {
          recordingUrl: call.recordingUrl,
          userId: "6807abfc2c1ca099fe2b13c5"
        });
      }
      
      const callInDB = await axios.post(`${import.meta.env.VITE_API_URL_CALL}/api/calls/store-call`, {
        CallSid: globalState.currentCallSid,
        agentId: globalState.currentAgentId,
        leadId: globalState.currentAgentId,
        call,
        cloudinaryrecord: cloudinaryRecord.data.url,
        userId: "6807abfc2c1ca099fe2b13c5"
      });
      
      

      if (currentMessages.length > 0) {
        
        const resultStock = await axios.post(`${import.meta.env.VITE_API_URL_AI_MESSAGES}/messages/batch`, 
          currentMessages.map(msg => ({
            callId: callInDB.data._id,
            role: msg.role,
            content: msg.content,
            category: msg.category,
            priority: msg.priority,
            timestamp: msg.timestamp,
            isProcessed: msg.isProcessed,
          }))
        );
        
      } else {
        console.warn('⚠️ No AI messages to store');
      }

      return callInDB;
    } catch (error) {
      console.error("❌ Error saving call:", error);
      throw error;
    } finally {
      globalState.isSaving = false;
      globalState.notifySubscribers();
    }
  },
  subscribers: [] as Function[],
  subscribe: (callback: Function) => {
    globalState.subscribers.push(callback);
    return () => {
      globalState.subscribers = globalState.subscribers.filter(cb => cb !== callback);
    };
  },
  notifySubscribers: () => {
    globalState.subscribers.forEach(callback => callback());
  }
};

// Expose functions globally
if (typeof window !== 'undefined') {
  (window as any).AIAssistant = {
    addMessage: (message: AIAssistantMessage) => {
      globalState.setMessages([...globalState.messages, message]);
    },
    setMessages: (messages: AIAssistantMessage[]) => {
      globalState.setMessages(messages);
    },
    hidePanel: () => {
      globalState.setVisible(false);
    },
    showPanel: () => {
      globalState.setVisible(true);
    },
    minimizePanel: () => {
      globalState.setMinimized(true);
    },
    maximizePanel: () => {
      globalState.setMinimized(false);
    },
    setCallEnded: (ended: boolean) => {
      globalState.setCallEnded(ended);
    },
    setCallDetails: (callSid: string, agentId: string) => {
      globalState.setCallDetails(callSid, agentId);
    },
    saveCallToDB: async () => {
      return await globalState.saveCallToDB();
    }
  };
}

// Composant React
const GlobalAIAssistant: React.FC = () => {
  const [, forceUpdate] = useState({});
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();
  
  useEffect(() => {
    // Make currentUser available to globalState
    globalState.currentUser = currentUser;
    
    // Souscrire aux changements d'état global
    const unsubscribe = globalState.subscribe(() => {
      forceUpdate({});
    });
    
    return () => {
      unsubscribe();
    };
  }, [currentUser]);
  
  useEffect(() => {
    // Auto scroll to bottom when messages change
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTo({
        top: messageContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [globalState.messages]);
  
  const handleClose = () => {
    // Vider les messages lors de la fermeture
    globalState.setMessages([]);
    globalState.setVisible(false);
  };

  const handleMinimize = () => {
    // Conserver les messages lors de la minimisation
    globalState.setMinimized(true);
  };
  
  if (!globalState.isVisible) {
    return null;
  }
  
  if (globalState.isMinimized) {
    return (
      <button
        onClick={() => globalState.setMinimized(false)}
        className="fixed bottom-4 right-4 p-4 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors z-50"
      >
        <MessageSquare className="w-6 h-6" />
        {globalState.messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {globalState.messages.length}
          </span>
        )}
      </button>
    );
  }
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'suggestion': return '💡';
      case 'alert': return '⚠️';
      case 'action': return '✅';
      default: return 'ℹ️';
    }
  };
  
  const getCategoryStyle = (category: string, priority: string) => {
    const baseStyle = "p-3 rounded-lg mt-1 shadow-sm border";
    switch (category) {
      case 'suggestion':
        return `${baseStyle} bg-rose-50 border-rose-100`;
      case 'alert':
        return `${baseStyle} ${priority === 'high' ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100'}`;
      case 'action':
        return `${baseStyle} bg-green-50 border-green-100`;
      default:
        return `${baseStyle} bg-white border-gray-100`;
    }
  };
  
  const categories: { id: 'all' | 'suggestion' | 'alert' | 'info' | 'action'; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: '📝' },
    { id: 'suggestion', label: 'Suggestions', icon: '💡' },
    { id: 'alert', label: 'Alerts', icon: '⚠️' },
    { id: 'action', label: 'Actions', icon: '✅' },
    { id: 'info', label: 'Info', icon: 'ℹ️' },
  ];
  
  const filteredMessages = globalState.messages.filter(
    message => globalState.selectedCategory === 'all' || message.category === globalState.selectedCategory
  );
  
  // Group messages by date
  const groupedMessages = filteredMessages.reduce((groups, message) => {
    const date = message.timestamp.toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, AIAssistantMessage[]>);
  
  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl z-50">
      <div className="p-4 border-b flex justify-between items-center bg-rose-500 text-white rounded-t-lg">
        <h3 className="font-semibold">AI Assistant</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleMinimize}
            className="text-white hover:bg-rose-600 rounded-lg p-1"
          >
            <span className="sr-only">Minimize</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
            </svg>
          </button>
          {globalState.callEnded && (
            <button 
              onClick={handleClose}
              className="text-white hover:bg-rose-600 rounded-lg p-1"
              title="Close AI Assistant"
            >
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    
      {/* Category Menu */}
      <div className="p-2 bg-gray-50 border-b flex gap-1 overflow-x-auto">
        {categories.map(category => {
          const count = category.id === 'all' 
            ? globalState.messages.length 
            : globalState.messages.filter(m => m.category === category.id).length;
          
          return (
            <button
              key={category.id}
              onClick={() => globalState.setSelectedCategory(category.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                globalState.selectedCategory === category.id
                  ? 'bg-rose-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.label}</span>
              {count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  globalState.selectedCategory === category.id
                    ? 'bg-white text-rose-500'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    
      {/* Messages Container */}
      <div ref={messageContainerRef} className="p-4 h-80 overflow-y-auto bg-gray-50 scroll-smooth">
        {filteredMessages.length > 0 ? (
          Object.entries(groupedMessages).map(([date, messages]) => (
            <div key={date} className="mb-6 relative">
              <div className="sticky top-0 bg-gray-50 py-2 z-10 border-b mb-3 text-xs text-gray-500">
                {date}
              </div>
              {messages.map((message, index) => (
                <div key={`${date}-${index}`} className="mb-4 animate-fade-in">
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    <span className="px-2 py-0.5 rounded text-xs" 
                          style={{
                            backgroundColor: message.priority === 'high' ? '#FEE2E2' : 
                                          message.priority === 'medium' ? '#FEF3C7' : '#E0F2FE',
                            color: message.priority === 'high' ? '#991B1B' : 
                                  message.priority === 'medium' ? '#92400E' : '#075985'
                          }}>
                      {message.priority}
                    </span>
                  </div>
                  <div className={getCategoryStyle(message.category, message.priority)}>
                    <div className="flex items-start gap-2">
                      <span className="text-xl" role="img" aria-label={message.category}>
                        {getCategoryIcon(message.category)}
                      </span>
                      <div className="flex-1 whitespace-pre-wrap">{message.content}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="text-gray-500 text-center p-4">
            {globalState.selectedCategory === 'all' ? (
              <>
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                AI assistant is listening and will provide suggestions during the call...
              </>
            ) : (
              <>
                <span className="text-2xl mb-2 block">{getCategoryIcon(globalState.selectedCategory)}</span>
                No {globalState.selectedCategory} messages yet
              </>
            )}
          </div>
        )}
      </div>
      
      {globalState.callEnded && (
        <div className="p-2 text-center text-sm text-gray-500 bg-gray-50 border-t">
          L'appel est terminé. Vous pouvez fermer l'assistant IA en cliquant sur "X".
        </div>
      )}
    </div>
  );
};

// Exporter le composant GlobalAIAssistant directement
export { GlobalAIAssistant };

// Exporter les fonctions d'API
export const AIAssistantAPI = {
  addMessage: (message: AIAssistantMessage) => {
    globalState.setMessages([...globalState.messages, message]);
  },
  setMessages: (messages: AIAssistantMessage[]) => {
    globalState.setMessages(messages);
  },
  hidePanel: () => {
    // Vider les messages lors de la fermeture
    globalState.setMessages([]);
    globalState.setVisible(false);
  },
  showPanel: () => {
    globalState.setVisible(true);
  },
  minimizePanel: () => {
    // Ne pas vider les messages lors de la minimisation
    globalState.setMinimized(true);
  },
  maximizePanel: () => {
    globalState.setMinimized(false);
  },
  setCallEnded: (ended: boolean) => {
    globalState.setCallEnded(ended);
  },
  setCallDetails: (callSid: string, agentId: string) => {
    globalState.setCallDetails(callSid, agentId);
  },
  saveCallToDB: async () => {
    return await globalState.saveCallToDB();
  },
  clearMessages: () => {
    globalState.setMessages([]);
  }
};
