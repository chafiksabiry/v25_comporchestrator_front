import { Sparkles } from 'lucide-react';
import { aiPrompts } from '../lib/guidance';

interface AIAssistantProps {
  section: keyof typeof aiPrompts;
  onGenerate: () => void;
}

export function AIAssistant({ section, onGenerate }: AIAssistantProps) {
  const prompt = aiPrompts[section];

  return (
    <div className="bg-gradient-to-r from-harx-50 to-harx-alt-50 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-harx-100 rounded-full">
          <Sparkles className="w-6 h-6 text-harx-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-harx-900">{prompt.title}</h3>
          <p className="text-sm text-harx-700">{prompt.description}</p>
        </div>
      </div>

      <button
        onClick={onGenerate}
        className="w-full bg-harx-500 text-white py-3 px-4 rounded-lg hover:bg-harx-600 transition-colors flex items-center justify-center gap-2"
      >
        <Sparkles className="w-5 h-5" />
        <span>Generate AI Suggestions</span>
      </button>
    </div>
  );
}