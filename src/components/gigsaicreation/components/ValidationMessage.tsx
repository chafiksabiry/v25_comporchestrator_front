import { AlertCircle, CheckCircle } from 'lucide-react';

interface ValidationMessageProps {
  type: 'error' | 'success';
  message: string;
}

export function ValidationMessage({ type, message }: ValidationMessageProps) {
  return (
    <div className={`p-3 rounded-md flex items-start gap-2 ${
      type === 'error' ? 'bg-red-50 text-red-700' : 'bg-harx-50 text-harx-700'
    }`}>
      {type === 'error' ? (
        <AlertCircle className="w-5 h-5 mt-0.5" />
      ) : (
        <CheckCircle className="w-5 h-5 mt-0.5" />
      )}
      <p className="text-sm">{message}</p>
    </div>
  );
}