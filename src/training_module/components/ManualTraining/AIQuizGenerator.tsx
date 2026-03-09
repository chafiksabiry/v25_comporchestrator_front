import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { ManualTrainingModule, ManualQuiz, QuizQuestion } from '../../types/manualTraining';
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

interface AIQuizGeneratorProps {
  module: ManualTrainingModule;
  trainingId: string;
  onQuizGenerated: (quiz: ManualQuiz) => void;
  onClose: () => void;
}

export const AIQuizGenerator: React.FC<AIQuizGeneratorProps> = ({
  module,
  trainingId,
  onQuizGenerated,
  onClose,
}) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'generating' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [generatedQuiz, setGeneratedQuiz] = useState<ManualQuiz | null>(null);

  // Quiz generation settings
  const [settings, setSettings] = useState({
    numberOfQuestions: 5,
    difficulty: 'medium',
    questionTypes: {
      multipleChoice: true,
      trueFalse: true,
      shortAnswer: false,
    },
    passingScore: 70,
    timeLimit: 15,
  });

  const generateQuiz = async () => {
    setGenerating(true);
    setStatus('analyzing');
    setProgress(0);
    setError(null);

    try {
      // Step 1: Analyze module content
      setProgress(20);
      setStatus('analyzing');

      // Collect module content
      const moduleContent = {
        title: module.title,
        description: module.description,
        sections: module.sections?.map(section => ({
          title: section.title,
          type: section.type,
          content: section.content,
        })) || [],
      };

      setProgress(40);
      setStatus('generating');

      // Step 2: Call AI to generate quiz
      const response = await axios.post(`${API_BASE}/manual-trainings/ai/generate-quiz`, {
        moduleContent,
        numberOfQuestions: settings.numberOfQuestions,
        difficulty: settings.difficulty,
        questionTypes: settings.questionTypes,
        moduleId: module.id,
        trainingId: trainingId,
      });

      setProgress(80);

      if (response.data.success) {
        const generatedData = response.data.data;

        // Create the quiz
        const quizData: Partial<ManualQuiz> = {
          title: `${module.title} - Quiz`,
          description: `Quiz auto-généré pour le module: ${module.title}`,
          moduleId: module.id,
          trainingId: trainingId,
          passingScore: settings.passingScore,
          timeLimit: settings.timeLimit,
          maxAttempts: 3,
          questions: generatedData.questions,
          settings: {
            shuffleQuestions: true,
            shuffleOptions: true,
            showCorrectAnswers: true,
            allowReview: true,
            showExplanations: true,
          },
        };

        // Save the quiz
        const createResponse = await axios.post(
          `${API_BASE}/manual-trainings/modules/${module.id}/quizzes`,
          quizData
        );

        setProgress(100);

        if (createResponse.data.success) {
          setGeneratedQuiz(createResponse.data.data);
          setStatus('success');
          setTimeout(() => {
            onQuizGenerated(createResponse.data.data);
          }, 1500);
        }
      }
    } catch (err: any) {
      console.error('Error generating quiz:', err);
      setError(err.response?.data?.message || 'Erreur lors de la génération du quiz');
      setStatus('error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Génération de Quiz par IA</h2>
              <p className="text-purple-100">Module: {module.title}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === 'idle' && (
            <>
              {/* Settings */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de questions
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="20"
                    value={settings.numberOfQuestions}
                    onChange={(e) => setSettings({ ...settings, numberOfQuestions: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulté
                  </label>
                  <select
                    value={settings.difficulty}
                    onChange={(e) => setSettings({ ...settings, difficulty: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="easy">Facile</option>
                    <option value="medium">Moyen</option>
                    <option value="hard">Difficile</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Types de questions
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.questionTypes.multipleChoice}
                        onChange={(e) => setSettings({
                          ...settings,
                          questionTypes: { ...settings.questionTypes, multipleChoice: e.target.checked }
                        })}
                        className="w-4 h-4"
                      />
                      <span>Choix multiples</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.questionTypes.trueFalse}
                        onChange={(e) => setSettings({
                          ...settings,
                          questionTypes: { ...settings.questionTypes, trueFalse: e.target.checked }
                        })}
                        className="w-4 h-4"
                      />
                      <span>Vrai/Faux</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.questionTypes.shortAnswer}
                        onChange={(e) => setSettings({
                          ...settings,
                          questionTypes: { ...settings.questionTypes, shortAnswer: e.target.checked }
                        })}
                        className="w-4 h-4"
                      />
                      <span>Réponse courte</span>
                    </label>
                  </div>
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temps limite (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={settings.timeLimit}
                      onChange={(e) => setSettings({ ...settings, timeLimit: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Comment ça marche ?</p>
                      <p>L'IA analysera le contenu de votre module (titre, description, sections) et générera automatiquement des questions pertinentes avec leurs réponses et explications.</p>
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
                <Loader2 className="w-16 h-16 text-purple-600 animate-spin" />
              </div>

              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>
                    {status === 'analyzing' ? '📚 Analyse du contenu...' : '✨ Génération des questions...'}
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <p className="text-center text-gray-600">
                Veuillez patienter pendant que l'IA génère vos questions...
              </p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && generatedQuiz && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Quiz généré avec succès !</h3>
                <p className="text-gray-600 mb-4">
                  {generatedQuiz.questions?.length || 0} questions ont été créées
                </p>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <h4 className="font-medium mb-3">Aperçu des questions :</h4>
                <div className="space-y-2">
                  {generatedQuiz.questions?.slice(0, 3).map((q, idx) => (
                    <div key={idx} className="text-sm bg-white p-3 rounded border border-gray-200">
                      <span className="font-medium">Q{idx + 1}:</span> {q.question}
                    </div>
                  ))}
                  {(generatedQuiz.questions?.length || 0) > 3 && (
                    <p className="text-xs text-gray-500 text-center">
                      ... et {(generatedQuiz.questions?.length || 0) - 3} autres questions
                    </p>
                  )}
                </div>
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
                onClick={generateQuiz}
                disabled={generating}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Générer le Quiz</span>
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
                onClick={generateQuiz}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors flex items-center space-x-2"
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

