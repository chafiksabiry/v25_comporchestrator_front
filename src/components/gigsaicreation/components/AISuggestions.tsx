import React from 'react';
import { Brain } from 'lucide-react';
import { aiPrompts } from '../lib/guidance';

interface AISuggestionsProps {
  section: keyof typeof aiPrompts;
  onSuggest: () => void;
}

export function AISuggestions({ section, onSuggest }: AISuggestionsProps) {
  const prompt = aiPrompts[section];

  return (
    <div className="bg-harx-50/50 rounded-2xl p-6 mb-8 border border-harx-100">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-xl font-black bg-gradient-harx bg-clip-text text-transparent italic uppercase tracking-tight">{prompt.title}</h3>
      </div>
      
      <p className="text-gray-700 mb-6 font-medium italic">{prompt.description}</p>
      
      <div className="space-y-3 mb-8">
        {prompt.suggestions.map((suggestion, index) => (
          <div key={index} className="flex items-center gap-3 text-gray-600 bg-white/50 p-2 rounded-lg border border-harx-50">
            <span className="w-2 h-2 bg-gradient-harx rounded-full" />
            <span className="text-sm font-medium">{suggestion}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onSuggest}
        className="w-full bg-gradient-harx text-white py-4 px-6 rounded-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 font-black italic uppercase tracking-widest shadow-lg shadow-harx-500/20"
      >
        <span>Generate Suggestions</span>
      </button>
    </div>
  );
}