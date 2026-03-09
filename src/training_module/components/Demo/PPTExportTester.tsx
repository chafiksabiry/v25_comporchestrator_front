import React, { useState } from 'react';
import { FileDown, RefreshCw, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { AIService } from '../../infrastructure/services/AIService';
import { mockCurriculumForPPT, mockSimpleCurriculum, generateRandomCurriculum } from '../../data/mockCurriculum';

/**
 * Composant de test pour l'export PowerPoint
 * Permet de tester l'export avec différents mock curricula
 */
export default function PPTExportTester() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [selectedCurriculum, setSelectedCurriculum] = useState<'full' | 'simple' | 'random'>('full');
  const [message, setMessage] = useState('');

  const getCurriculum = () => {
    switch (selectedCurriculum) {
      case 'full':
        return mockCurriculumForPPT;
      case 'simple':
        return mockSimpleCurriculum;
      case 'random':
        return generateRandomCurriculum(6);
      default:
        return mockCurriculumForPPT;
    }
  };

  const handleExportToPPT = async () => {
    setIsExporting(true);
    setExportStatus('idle');
    setMessage('');

    try {
      console.log('📊 Exporting curriculum to PowerPoint...');
      const curriculum = getCurriculum();

      console.log('Curriculum data:', curriculum);

      // Appel à l'API pour générer le PPT
      const blob = await AIService.exportToPowerPoint(curriculum as any);

      // Téléchargement automatique
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Formation_Test_${Date.now()}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus('success');
      setMessage('✅ PowerPoint exporté avec succès! Le fichier a été téléchargé.');

      console.log('✅ Export completed successfully!');
    } catch (error: any) {
      console.error('❌ Export failed:', error);
      setExportStatus('error');
      setMessage(`❌ Erreur: ${error.message || 'Export échoué'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <FileDown className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">PowerPoint Export Tester</h1>
          </div>
          <p className="text-gray-600">
            Testez l'export PowerPoint avec différents curricula mock.
            Sélectionnez un curriculum et cliquez sur "Export PPT".
          </p>
        </div>

        {/* Curriculum Selection */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Sélectionner un Curriculum de Test
          </h2>

          <div className="space-y-3">
            <label className="flex items-start space-x-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-purple-50 transition-colors">
              <input
                type="radio"
                name="curriculum"
                value="full"
                checked={selectedCurriculum === 'full'}
                onChange={(e) => setSelectedCurriculum(e.target.value as any)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">
                  📚 Curriculum Complet (Customer Success)
                </div>
                <div className="text-sm text-gray-600">
                  Formation complète avec 6 modules détaillés, objectifs d'apprentissage riches
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  480 minutes • 6 modules • Débutant à Avancé
                </div>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="radio"
                name="curriculum"
                value="simple"
                checked={selectedCurriculum === 'simple'}
                onChange={(e) => setSelectedCurriculum(e.target.value as any)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">
                  ⚡ Curriculum Simplifié
                </div>
                <div className="text-sm text-gray-600">
                  Version simplifiée pour tests rapides avec contenu minimal
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  240 minutes • 6 modules • Format léger
                </div>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-green-50 transition-colors">
              <input
                type="radio"
                name="curriculum"
                value="random"
                checked={selectedCurriculum === 'random'}
                onChange={(e) => setSelectedCurriculum(e.target.value as any)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900 flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4" />
                  <span>Curriculum Aléatoire</span>
                </div>
                <div className="text-sm text-gray-600">
                  Génère un curriculum avec données aléatoires à chaque export
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Variable • 6 modules • Contenu généré
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Preview Selected Curriculum */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Aperçu du Curriculum Sélectionné
          </h2>

          {(() => {
            const curr = getCurriculum();
            return (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Titre</div>
                  <div className="font-semibold text-gray-900">{curr.title}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Description</div>
                  <div className="text-gray-700">{curr.description}</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Durée Totale</div>
                    <div className="font-semibold text-gray-900">{curr.totalDuration} min</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Nombre de Modules</div>
                    <div className="font-semibold text-gray-900">{curr.modules.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Méthodologie</div>
                    <div className="font-semibold text-gray-900">{curr.methodology}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-2">Modules</div>
                  <div className="space-y-2">
                    {curr.modules.map((module, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{module.title}</div>
                            <div className="text-xs text-gray-500">
                              {module.duration} min • {module.difficulty}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {module.contentItems} contenus • {module.assessments} éval.
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Export Button */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-6">
          <button
            onClick={handleExportToPPT}
            disabled={isExporting}
            className="w-full flex items-center justify-center space-x-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
          >
            {isExporting ? (
              <>
                <div className="animate-spin h-6 w-6 border-3 border-white border-t-transparent rounded-full" />
                <span>Export en cours...</span>
              </>
            ) : (
              <>
                <FileDown className="h-6 w-6" />
                <span>Exporter en PowerPoint (.pptx)</span>
              </>
            )}
          </button>

          {/* Status Message */}
          {message && (
            <div className={`mt-4 p-4 rounded-xl flex items-start space-x-3 ${exportStatus === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
              }`}>
              {exportStatus === 'success' ? (
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className={`font-semibold ${exportStatus === 'success' ? 'text-green-900' : 'text-red-900'
                  }`}>
                  {exportStatus === 'success' ? 'Succès!' : 'Erreur'}
                </div>
                <div className={exportStatus === 'success' ? 'text-green-700' : 'text-red-700'}>
                  {message}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-8">
          <div className="flex items-center space-x-3 mb-4">
            <Zap className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Comment utiliser</h2>
          </div>
          <ol className="space-y-2 text-gray-700">
            <li className="flex items-start space-x-2">
              <span className="font-bold text-blue-600">1.</span>
              <span>Sélectionnez un curriculum de test ci-dessus</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="font-bold text-blue-600">2.</span>
              <span>Vérifiez l'aperçu du curriculum</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="font-bold text-blue-600">3.</span>
              <span>Cliquez sur "Exporter en PowerPoint"</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="font-bold text-blue-600">4.</span>
              <span>Le fichier .pptx sera téléchargé automatiquement</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="font-bold text-blue-600">5.</span>
              <span>Ouvrez le fichier avec PowerPoint, Keynote ou Google Slides</span>
            </li>
          </ol>

          <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
            <div className="text-sm font-semibold text-gray-900 mb-2">
              ⚠️ Prérequis
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Le backend doit être lancé sur <code className="bg-gray-100 px-2 py-1 rounded">https://v25platformtrainingbackend-production.up.railway.app</code></li>
              <li>• Le service PPTExportService doit être actif</li>
              <li>• Les dépendances Apache POI doivent être installées</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

