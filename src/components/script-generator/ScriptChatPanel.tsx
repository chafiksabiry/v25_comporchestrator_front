import React from 'react';
import { Loader2, Send } from 'lucide-react';

interface ScriptChatPanelProps {
  input: string;
  isSending: boolean;
  selectedGigId?: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const ScriptChatPanel: React.FC<ScriptChatPanelProps> = ({
  input,
  isSending,
  selectedGigId,
  onInputChange,
  onSubmit,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className="border border-gray-100 bg-white rounded-2xl shadow-lg"
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Ask for a script line, opening, objection answer..."
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            disabled={!selectedGigId || isSending}
          />
          <button
            type="submit"
            disabled={!selectedGigId || !input.trim() || isSending}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
      </div>
    </form>
  );
};

export default ScriptChatPanel;
