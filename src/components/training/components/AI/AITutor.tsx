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
    <div className="flex h-96 flex-col rounded-xl border border-harx-200 bg-white shadow-sm ring-1 ring-harx-100/60">
      <div className="border-b border-harx-100 bg-gradient-to-r from-harx-50 via-white to-harx-alt-50 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-harx-500 to-harx-alt-500 shadow-md shadow-harx-500/25">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-harx-900">{activeTutor.name}</h3>
            <p className="text-sm text-harx-700/80">Assistant HARX • {activeTutor.specialty.join(', ')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-harx-50/20 p-4">
        {activeTutor.conversationHistory.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs rounded-xl px-4 py-2 lg:max-w-md ${
                message.sender === 'user'
                  ? 'border border-harx-alt-300/50 bg-gradient-to-br from-harx-500 to-harx-alt-500 text-white shadow-sm'
                  : message.type === 'suggestion'
                  ? 'border border-harx-alt-200 bg-harx-alt-50 text-harx-900'
                  : message.type === 'resource'
                  ? 'border border-harx-200 bg-harx-50 text-harx-900'
                  : 'border border-harx-100 bg-white text-harx-900 shadow-sm'
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
            <div className="max-w-xs rounded-xl border border-harx-200 bg-white px-4 py-2 text-harx-800 shadow-sm lg:max-w-md">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4 text-harx-500" />
                <div className="flex space-x-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-harx-400"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-harx-alt-400" style={{ animationDelay: '0.1s' }}></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-harx-400" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-harx-100 bg-white/95 p-4 backdrop-blur-sm">
        <div className="mb-3 flex flex-wrap gap-2">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => handleQuickAction(action.action)}
                className="flex items-center space-x-1 rounded-full border border-harx-100 bg-harx-50/80 px-3 py-1 text-xs font-medium text-harx-800 transition-colors hover:border-harx-200 hover:bg-harx-100"
              >
                <Icon className="h-3 w-3 text-harx-600" />
                <span>{action.text}</span>
              </button>
            );
          })}
          <button
            onClick={clearConversation}
            className="rounded-full border border-harx-200 bg-white px-3 py-1 text-xs font-medium text-harx-700 transition-colors hover:bg-harx-50"
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
            className="flex-1 rounded-xl border border-harx-200 bg-harx-50/30 px-3 py-2 text-sm text-harx-900 placeholder:text-harx-500/70 focus:border-harx-400 focus:outline-none focus:ring-2 focus:ring-harx-400/30"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="rounded-xl bg-gradient-to-r from-harx-500 to-harx-alt-500 px-4 py-2 text-white shadow-md shadow-harx-500/20 transition hover:from-harx-600 hover:to-harx-alt-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}