import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Lightbulb, BookOpen, Target, Zap } from 'lucide-react';
import { ChatMessage, AITutor as AITutorType } from '../../types';
import { useAITutor } from '../../hooks/useAITutor';

interface AITutorProps {
  tutor: AITutorType;
  currentModule?: string;
  onSuggestion?: (suggestion: string) => void;
}

export default function AITutor({ tutor, currentModule, onSuggestion }: AITutorProps) {
  const { tutor: activeTutor, isTyping, sendMessage, clearConversation } = useAITutor(tutor);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeTutor.conversationHistory]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    await sendMessage(inputMessage);
    setInputMessage('');
  };

  const quickActions = [
    { icon: Lightbulb, text: "Explain this concept", action: "explain" },
    { icon: BookOpen, text: "Show examples", action: "examples" },
    { icon: Target, text: "Practice quiz", action: "quiz" },
    { icon: Zap, text: "Quick summary", action: "summary" },
  ];

  const handleQuickAction = (action: string) => {
    const actionMessages = {
      explain: "Can you explain this concept in simpler terms?",
      examples: "Can you show me some practical examples?",
      quiz: "I'd like to take a quick quiz to test my understanding",
      summary: "Can you give me a quick summary of the key points?",
    };

    const message = actionMessages[action as keyof typeof actionMessages] || '';
    setInputMessage(message);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-96 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{activeTutor.name}</h3>
            <p className="text-sm text-gray-600">AI Learning Assistant • {activeTutor.specialty.join(', ')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTutor.conversationHistory.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.type === 'suggestion'
                  ? 'bg-amber-50 border border-amber-200 text-amber-800'
                  : message.type === 'resource'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.sender === 'ai' && (
                  <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                {message.sender === 'user' && (
                  <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm">{message.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-2 mb-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => handleQuickAction(action.action)}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors"
              >
                <Icon className="h-3 w-3" />
                <span>{action.text}</span>
              </button>
            );
          })}
          <button
            onClick={clearConversation}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-full text-xs transition-colors"
          >
            Clear Chat
          </button>
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask me anything about your training..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}