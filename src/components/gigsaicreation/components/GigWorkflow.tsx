import React from 'react';
import { AlertCircle, CheckCircle2, Clock, Edit3, Send } from 'lucide-react';
import type { Gig } from '../lib/types';
import { submitForReview, publishGig } from '../lib/api';

interface GigWorkflowProps {
  gig: Gig;
  onUpdate: (gig: Gig) => void;
}

export function GigWorkflow({ gig, onUpdate }: GigWorkflowProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmitForReview = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedGig = await submitForReview(gig.id);
      onUpdate(updatedGig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit for review');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedGig = await publishGig(gig.id);
      if (updatedGig) {
        onUpdate(updatedGig);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish gig');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Gig Status</h3>
      
      <div className="space-y-4">
        {/* Status indicator */}
        <div className="flex items-center space-x-2">
          {gig.status === 'draft' && (
            <Edit3 className="w-5 h-5 text-gray-500" />
          )}
          {gig.status === 'pending_review' && (
            <Clock className="w-5 h-5 text-yellow-500" />
          )}
          {gig.status === 'published' && (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          )}
          <span className="capitalize">{gig.status.replace('_', ' ')}</span>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {gig.status === 'draft' && (
            <button
              onClick={handleSubmitForReview}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>Submit for Review</span>
            </button>
          )}

          {gig.status === 'pending_review' && (
            <button
              onClick={handlePublish}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Publish Gig</span>
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center space-x-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}