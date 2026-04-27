import React from 'react';
import ScriptViewerPanel from './ScriptViewerPanel';

interface ScriptViewPageProps {
  hasActiveScript: boolean;
  content: React.ReactNode;
  onBackToList: () => void;
  onValidate?: () => void;
  validateDisabled?: boolean;
  validateLabel?: string;
}

const ScriptViewPage: React.FC<ScriptViewPageProps> = ({
  hasActiveScript,
  content,
  onBackToList,
  onValidate,
  validateDisabled,
  validateLabel,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
        <p className="text-sm font-semibold text-gray-800">Script viewer</p>
        <button
          type="button"
          onClick={onBackToList}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
        >
          Retour a la liste
        </button>
      </div>

      <ScriptViewerPanel
        selectedScriptTitle={hasActiveScript ? 'View script' : 'View script'}
        selectedScriptContent={content}
        onValidate={onValidate}
        validateDisabled={validateDisabled}
        validateLabel={validateLabel}
      />
    </div>
  );
};

export default ScriptViewPage;
