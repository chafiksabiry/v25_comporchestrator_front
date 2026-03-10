import React, { useState } from 'react';
import { FileDown, X } from 'lucide-react';
import { AIService } from '../../infrastructure/services/AIService';
import { mockCurriculumForPPT } from '../../data/mockCurriculum';

/**
 * Bouton flottant pour exporter rapidement en PPT
 * Peut être ajouté n'importe où dans l'application
 */
export default function QuickPPTExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const blob = await AIService.exportToPowerPoint(mockCurriculumForPPT as any);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Formation_${Date.now()}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('✅ PowerPoint exporté avec succès!');
    } catch (error: any) {
      console.error('Export failed:', error);
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all z-50 flex items-center space-x-2"
        title="Quick PPT Export"
      >
        <FileDown className="h-6 w-6" />
        <span className="hidden md:inline font-semibold">Export PPT</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 p-6 z-50 w-96">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Export PowerPoint</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm font-semibold text-blue-900 mb-2">
            📚 Curriculum Mock Chargé
          </div>
          <div className="text-xs text-blue-700">
            {mockCurriculumForPPT.title}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {mockCurriculumForPPT.modules.length} modules • {mockCurriculumForPPT.totalDuration} min
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {isExporting ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              <span>Export en cours...</span>
            </>
          ) : (
            <>
              <FileDown className="h-5 w-5" />
              <span>Exporter en PPT</span>
            </>
          )}
        </button>

        <div className="text-xs text-gray-500 text-center">
          Utilise les mock data de test
        </div>
      </div>
    </div>
  );
}


