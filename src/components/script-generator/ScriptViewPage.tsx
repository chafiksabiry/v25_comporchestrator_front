import React from 'react';
import ScriptViewerPanel from './ScriptViewerPanel';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
        <p className="text-sm font-semibold text-gray-800">{t('scriptGenerator.viewPage.title')}</p>
        <button
          type="button"
          onClick={onBackToList}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
        >
          {t('scriptGenerator.viewPage.backToList')}
        </button>
      </div>

      <ScriptViewerPanel
        selectedScriptTitle={hasActiveScript ? t('scriptGenerator.viewPage.viewScript') : t('scriptGenerator.viewPage.viewScript')}
        selectedScriptContent={content}
        onValidate={onValidate}
        validateDisabled={validateDisabled}
        validateLabel={validateLabel}
      />
    </div>
  );
};

export default ScriptViewPage;
