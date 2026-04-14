import React from 'react';
import { Info } from 'lucide-react';
import { Dialog } from './Dialog';

interface GuidanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: string[];
  tips: string[];
}

export function GuidanceDialog({ isOpen, onClose, title, steps, tips }: GuidanceDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Follow these steps:</h3>
              <ol className="mt-2 space-y-2 text-blue-800">
                {steps.map((step, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="font-medium">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium text-gray-900 mb-2">💡 Helpful Tips</h3>
          <ul className="space-y-2 text-gray-600">
            {tips.map((tip, index) => (
              <li key={index} className="flex gap-2">
                <span>•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Got it
          </button>
        </div>
      </div>
    </Dialog>
  );
}