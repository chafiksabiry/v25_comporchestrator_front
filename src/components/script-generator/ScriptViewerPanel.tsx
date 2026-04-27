import React from 'react';

interface ScriptViewerPanelProps {
  selectedScriptTitle: string;
  selectedScriptContent: React.ReactNode;
  onValidate?: () => void;
  validateDisabled?: boolean;
  validateLabel?: string;
}

const ScriptViewerPanel: React.FC<ScriptViewerPanelProps> = ({
  selectedScriptTitle,
  selectedScriptContent,
  onValidate,
  validateDisabled,
  validateLabel,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-700">{selectedScriptTitle}</p>
        {onValidate && (
          <button
            type="button"
            onClick={onValidate}
            disabled={Boolean(validateDisabled)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {validateLabel || 'Valider le script'}
          </button>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        {selectedScriptContent}
      </div>
    </div>
  );
};

export default ScriptViewerPanel;
