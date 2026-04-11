import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';

interface TrainingDetailsFormProps {
  onComplete: (data: { trainingName: string; trainingDescription: string; estimatedDuration: string }) => void;
  onBack: () => void;
  gigData?: any;
}

export default function TrainingDetailsForm({ onComplete, onBack, gigData: _gigData }: TrainingDetailsFormProps) {
  const [trainingName, setTrainingName] = useState('');
  const [trainingDescription, setTrainingDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  const canProceed = trainingName.trim() && estimatedDuration;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSubmit = () => {
    onComplete({ trainingName, trainingDescription, estimatedDuration });
  };

  const durations = [
    { value: '120', label: 'Quick Start', desc: '1-2 hours' },
    { value: '240', label: 'Half Day', desc: '3-4 hours' },
    { value: '480', label: 'Full Day', desc: '6-8 hours' },
    { value: '2400', label: 'One Week', desc: 'Multi-session' },
    { value: '4800', label: 'Two Weeks', desc: 'Comprehensive' },
    { value: '9600', label: 'One Month', desc: 'Deep Learning' },
  ];

  return (
    <div className="mx-auto w-full max-w-lg space-y-5">
      {/* Program name */}
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-gray-800">
          Training program name <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={trainingName}
          onChange={(e) => setTrainingName(e.target.value)}
          placeholder="e.g., Customer Success Mastery Program"
          className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/15"
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-gray-800">
          Program description
        </label>
        <textarea
          value={trainingDescription}
          onChange={(e) => setTrainingDescription(e.target.value)}
          rows={3}
          placeholder="Describe the goals, outcomes, and key benefits of this training program..."
          className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/15"
        />
      </div>

      {/* Duration */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-gray-800">
          <Clock className="h-3.5 w-3.5 text-gray-400" />
          Expected duration <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {durations.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setEstimatedDuration(d.value)}
              className={`rounded-lg border px-3 py-2 text-left transition-all ${
                estimatedDuration === d.value
                  ? 'border-fuchsia-400 bg-fuchsia-50 ring-1 ring-fuchsia-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`text-xs font-semibold ${estimatedDuration === d.value ? 'text-fuchsia-700' : 'text-gray-800'}`}>
                {d.label}
              </div>
              <div className="text-[10px] text-gray-400">{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canProceed}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:from-fuchsia-700 hover:to-purple-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
