import React from 'react';

type SavedScript = {
  _id: string;
  isActive?: boolean;
};

interface ScriptListPanelProps {
  selectedGigId?: string;
  isSending: boolean;
  isLoadingSavedScripts: boolean;
  savedScripts: SavedScript[];
  onGenerate: () => void;
  onView: (scriptId: string) => void;
  onEdit: (scriptId: string) => void;
}

const ScriptListPanel: React.FC<ScriptListPanelProps> = ({
  selectedGigId,
  isSending,
  isLoadingSavedScripts,
  savedScripts,
  onGenerate,
  onView,
  onEdit,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-700">Liste des scripts</p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!selectedGigId || isSending}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generer un script
        </button>
      </div>

      {isLoadingSavedScripts ? (
        <p className="text-sm text-gray-500">Loading scripts...</p>
      ) : savedScripts.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun script pour ce gig.</p>
      ) : (
        <div className="space-y-2">
          {savedScripts.map((item, idx) => (
            <div key={item._id} className="rounded-lg border border-gray-200 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800">Script {savedScripts.length - idx}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    item?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {item?.isActive ? 'Valide' : 'Brouillon'}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onView(item._id)}
                  className="px-2 py-1 text-xs rounded-md border border-blue-200 text-blue-700 bg-white hover:bg-blue-50"
                >
                  View script
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(item._id)}
                  className="px-2 py-1 text-xs rounded-md border border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScriptListPanel;
