import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle, XCircle, AlertCircle, Award } from 'lucide-react';
import { ManualTraining, ManualQuiz } from '../../types/manualTraining';
import axios from 'axios';

// Détection automatique de l'environnement
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:5010' : 'https://v25platformtrainingbackend-production.up.railway.app';
};

const API_BASE = getApiBaseUrl();

interface FinalExamGeneratorProps {
  training: ManualTraining;
  onExamGenerated: (exam: ManualQuiz) => void;
  onClose: () => void;
}

export const FinalExamGenerator: React.FC<FinalExamGeneratorProps> = ({
  training,
  onExamGenerated,
  onClose,
}) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'generating' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [generatedExam, setGeneratedExam] = useState<ManualQuiz | null>(null);

  // Exam generation settings
  const [settings, setSettings] = useState({
    numberOfQuestions: 20, // Final exam: 20 questions
    passingScore: 80,
    timeLimit: 45,
  });

  const generateFinalExam = async () => {
    setGenerating(true);
    setStatus('analyzing');
    setProgress(0);
    setError(null);

    try {
      // Step 1: Analyze all modules
      setProgress(20);
      setStatus('analyzing');

      setProgress(40);
      setStatus('generating');

      // Step 2: Call AI to generate final exam
      const response = await axios.post(`${API_BASE}/manual-trainings/ai/generate-final-exam`, {
        trainingId: training.id,
        numberOfQuestions: settings.numberOfQuestions,
      });

      setProgress(80);

      if (response.data.success) {
        const generatedData = response.data.data;

        // Create the final exam quiz
        const examData: Partial<ManualQuiz> = {
          title: `Examen Final - ${training.title}`,
          description: `Examen final complet couvrant tous les modules du training "${training.title}". Cet examen teste votre compréhension globale du contenu.`,
          moduleId: null, // No specific module - it's a final exam
          trainingId: training.id,
          passingScore: settings.passingScore,
          timeLimit: settings.timeLimit,
          maxAttempts: 2, // Only 2 attempts for final exam
          questions: generatedData.questions,
          settings: {
            shuffleQuestions: true,
            shuffleOptions: true,
            showCorrectAnswers: false, // Don't show answers immediately for final exam
            allowReview: true,
            showExplanations: false, // Only after passing
          },
        };

        // Create the final exam quiz
        // We use a special moduleId of "final-exam" to identify it as a final exam
        const createResponse = await axios.post(
          `${API_BASE}/manual-trainings/modules/final-exam/quizzes`,
          {
            ...examData,
            moduleId: 'FINAL_EXAM', // Special identifier for final exam
          }
        );

        setProgress(100);

        if (createResponse.data.success) {
          setGeneratedExam(createResponse.data.data);
          setStatus('success');
          setTimeout(() => {
            onExamGenerated(createResponse.data.data);
          }, 1500);
        }
      }
    } catch (err: any) {
      console.error('Error generating final exam:', err);
      setError(err.response?.data?.message || 'Erreur lors de la génération de l\'examen final');
      setStatus('error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 text-white">
          <div className="flex items-center space-x-3">
            <Award className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Générer l'Examen Final</h2>
              <p className="text-amber-100">Training: {training.title}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === 'idle' && (
            <>
              {/* Info Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Award className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <p className="font-bold mb-2">📋 À propos de l'Examen Final</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Couvre TOUS les modules du training</li>
                      <li>Questions de tous les niveaux (facile, moyen, difficile)</li>
                      <li>Test complet de compréhension</li>
                      <li>Distribution équilibrée entre les modules</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de questions
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="50"
                    value={settings.numberOfQuestions}
                    onChange={(e) => setSettings({ ...settings, numberOfQuestions: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommandé: 15-25 questions</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Score de passage (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.passingScore}
                      onChange={(e) => setSettings({ ...settings, passingScore: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Recommandé: 75-85%</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temps limite (minutes)
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="180"
                      value={settings.timeLimit}
                      onChange={(e) => setSettings({ ...settings, timeLimit: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Recommandé: 45-90 min</p>
                  </div>
                </div>

                {/* Preview Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Caractéristiques de l'examen :</p>
                      <ul className="space-y-1 text-xs">
                        <li>• {settings.numberOfQuestions} questions couvrant tous les modules</li>
                        <li>• Score minimum: {settings.passingScore}%</li>
                        <li>• Durée: {settings.timeLimit} minutes</li>
                        <li>• Maximum 2 tentatives</li>
                        <li>• Questions mélangées aléatoirement</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Generating Status */}
          {(status === 'analyzing' || status === 'generating') && (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <Loader2 className="w-16 h-16 text-amber-600 animate-spin" />
              </div>

              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>
                    {status === 'analyzing' ? '📚 Analyse de tous les modules...' : '✨ Génération de l\'examen final...'}
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-amber-600 to-orange-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <p className="text-center text-gray-600">
                L'IA analyse le contenu complet du training et crée un examen final complet...
              </p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && generatedExam && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Examen Final Créé !</h3>
                <p className="text-gray-600 mb-4">
                  {generatedExam.questions?.length || 0} questions ont été créées
                </p>
              </div>

              {/* Exam Summary */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-6 border-2 border-amber-300">
                <div className="flex items-center space-x-3 mb-4">
                  <Award className="w-8 h-8 text-amber-600" />
                  <h4 className="text-lg font-bold text-gray-900">Résumé de l'Examen</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Questions:</span>
                    <span className="ml-2 font-bold">{generatedExam.questions?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Score minimal:</span>
                    <span className="ml-2 font-bold">{settings.passingScore}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Durée:</span>
                    <span className="ml-2 font-bold">{settings.timeLimit} min</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tentatives:</span>
                    <span className="ml-2 font-bold">2 maximum</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  ✅ L'examen final est maintenant disponible pour tous les apprenants ayant terminé tous les modules.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <XCircle className="w-16 h-16 text-red-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Erreur</h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end space-x-3">
          {status === 'idle' && (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={generateFinalExam}
                disabled={generating}
                className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Générer l'Examen Final</span>
              </button>
            </>
          )}
          {status === 'error' && (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={generateFinalExam}
                className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-colors flex items-center space-x-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Réessayer</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

