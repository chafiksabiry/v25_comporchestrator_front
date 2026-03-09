import { useState, useCallback } from 'react';
import { ChatMessage, AITutor } from '../types';

export const useAITutor = (initialTutor: AITutor) => {
  const [tutor, setTutor] = useState<AITutor>(initialTutor);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(async (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message,
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    setTutor(prev => ({
      ...prev,
      conversationHistory: [...prev.conversationHistory, userMessage],
    }));

    setIsTyping(true);

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const aiResponse = generateAIResponse(message, tutor.specialty);
    
    setTutor(prev => ({
      ...prev,
      conversationHistory: [...prev.conversationHistory, aiResponse],
    }));

    setIsTyping(false);
  }, [tutor.specialty]);

  const generateAIResponse = (userMessage: string, specialty: string[]): ChatMessage => {
    const responses = {
      help: [
        "I'm here to help! What specific topic would you like to explore?",
        "Let me break this down into manageable steps for you.",
        "That's a great question! Here's how I'd approach it...",
      ],
      explain: [
        "Let me explain this concept in a different way that might be clearer.",
        "Think of it this way - imagine you're...",
        "The key principle here is...",
      ],
      practice: [
        "Great idea! Let's practice with a scenario.",
        "I'll create a custom exercise for you based on your learning style.",
        "Practice makes perfect! Here's what we can do...",
      ],
      assessment: [
        "Based on your progress, I think you're ready for the next challenge.",
        "Let me create a quick knowledge check for you.",
        "Your performance suggests we should focus on...",
      ],
    };

    let responseType = 'help';
    if (userMessage.toLowerCase().includes('explain') || userMessage.toLowerCase().includes('understand')) {
      responseType = 'explain';
    } else if (userMessage.toLowerCase().includes('practice') || userMessage.toLowerCase().includes('exercise')) {
      responseType = 'practice';
    } else if (userMessage.toLowerCase().includes('test') || userMessage.toLowerCase().includes('quiz')) {
      responseType = 'assessment';
    }

    const responseOptions = responses[responseType as keyof typeof responses];
    const selectedResponse = responseOptions[Math.floor(Math.random() * responseOptions.length)];

    return {
      id: Date.now().toString(),
      sender: 'ai',
      message: selectedResponse,
      timestamp: new Date().toISOString(),
      type: responseType === 'practice' ? 'suggestion' : responseType === 'assessment' ? 'assessment' : 'text',
    };
  };

  const clearConversation = useCallback(() => {
    setTutor(prev => ({
      ...prev,
      conversationHistory: [],
    }));
  }, []);

  return {
    tutor,
    isTyping,
    sendMessage,
    clearConversation,
  };
};