import React from 'react';
import { ArrowRight } from 'lucide-react';
import { TrainingModule, Rep } from '../../types';

interface ModuleQuizProps {
  module: TrainingModule;
  getQuizQuestions: () => any[];
  currentQuizIndex: number;
  showQuizResult: boolean;
  currentQuiz: any;
  handleInteraction: () => void;
  setQuizAnswer: (index: number | null) => void;
  quizAnswer: number | null;
  submitQuizAnswer: () => void;
  handleNextQuiz: () => void;
  calculateQuizScore: () => { score: number; totalPoints: number; percentage: number; passed: boolean; passingScore: number; passingScoreIsPercentage: boolean };
  quizAnswers: Record<number, number>;
  allQuizzesPassed: boolean;
  onNextModule?: () => void;
  moduleIndex?: number;
  totalModules?: number;
  onComplete: () => void;
  journeyId?: string | null;
  trainee: Rep;
  extractObjectId: (id: string | any) => string | null;
  ProgressService: any;
  currentTime: number;
  engagementScore: number;
  setShowQuizResult: (show: boolean) => void;
  setCurrentQuizIndex: (index: number) => void;
  setAllQuizzesPassed: (passed: boolean) => void;
  setCurrentQuiz: (quiz: any) => void;
  setQuizAnswers: (answers: Record<number, number>) => void;
}

export const ModuleQuiz: React.FC<ModuleQuizProps> = ({
  module,
  getQuizQuestions,
  currentQuizIndex,
  showQuizResult,
  currentQuiz,
  handleInteraction,
  setQuizAnswer,
  quizAnswer,
  submitQuizAnswer,
  handleNextQuiz,
  calculateQuizScore,
  quizAnswers,
  allQuizzesPassed,
  onNextModule,
  moduleIndex,
  totalModules,
  onComplete,
  journeyId,
  trainee,
  extractObjectId,
  ProgressService,
  currentTime,
  engagementScore,
  setShowQuizResult,
  setCurrentQuizIndex,
  setAllQuizzesPassed,
  setCurrentQuiz,
  setQuizAnswers
}) => {
  const quizQuestions = getQuizQuestions();

  return (
    <div id="quiz-section" className="bg-white rounded-2xl shadow-xl border border-gray-200 mt-6 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Module Quiz - {module.title}</h3>
            {quizQuestions.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                Question {currentQuizIndex + 1} of {quizQuestions.length}
              </p>
            )}
          </div>
          <div className="text-right">
            {quizQuestions.length > 0 && (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(((currentQuizIndex + (showQuizResult ? 1 : 0)) / quizQuestions.length) * 100)}%
                </div>
                <div className="text-xs text-gray-600">Progress</div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {currentQuiz && currentQuiz.question && (
          <>
            <p className="text-gray-700 mb-4 text-lg font-medium">{currentQuiz.question}</p>

            <div className="space-y-3 mb-6">
              {currentQuiz.options && Array.isArray(currentQuiz.options) && currentQuiz.options.map((option: string, index: number) => (
                <button
                  key={index}
                  onClick={() => {
                    handleInteraction();
                    setQuizAnswer(index);
                  }}
                  disabled={showQuizResult}
                  className={`w-full text-left p-4 border-2 rounded-xl transition-all ${quizAnswer === index
                    ? showQuizResult && quizAnswer === currentQuiz.correctAnswer
                      ? 'border-green-500 bg-green-50 shadow-sm'
                      : showQuizResult && quizAnswer !== currentQuiz.correctAnswer
                        ? 'border-red-500 bg-red-50 shadow-sm'
                        : 'border-[var(--primary-color,#3b82f6)] bg-blue-50 shadow-sm'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    } ${showQuizResult ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option}</span>
                    {showQuizResult && quizAnswer === index && quizAnswer !== currentQuiz.correctAnswer && (
                      <span className="text-red-600 font-bold flex items-center gap-1">
                        <span className="text-lg">✗</span> Incorrect
                      </span>
                    )}
                    {showQuizResult && quizAnswer === index && quizAnswer === currentQuiz.correctAnswer && (
                      <span className="text-green-600 font-bold flex items-center gap-1">
                        <span className="text-lg">✓</span> Correct
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {showQuizResult && currentQuiz && (
          <div className={`p-5 rounded-xl mb-6 animate-in slide-in-from-bottom-2 duration-300 ${quizAnswer === currentQuiz.correctAnswer
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
            }`}>
            <p className={`font-bold text-lg mb-1 ${quizAnswer === currentQuiz.correctAnswer ? 'text-green-800' : 'text-red-800'
              }`}>
              {quizAnswer === currentQuiz.correctAnswer ? 'Correct! 🎉' : 'Incorrect 😔'}
            </p>
            {currentQuiz.explanation && (
              <p className="text-sm text-gray-700 leading-relaxed">{currentQuiz.explanation}</p>
            )}
          </div>
        )}

        <div className="flex space-x-3">
          {!showQuizResult ? (
            <button
              onClick={submitQuizAnswer}
              disabled={quizAnswer === null}
              className="flex-1 py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--primary-color, #2563eb)' }}
            >
              Submit Answer
            </button>
          ) : (
            <>
              {quizQuestions.length > 0 &&
                currentQuizIndex < (quizQuestions.length - 1) ? (
                <button
                  onClick={handleNextQuiz}
                  className="flex-1 bg-green-600 text-white py-4 px-6 rounded-xl hover:bg-green-700 transition-all font-bold text-lg flex items-center justify-center space-x-2 shadow-lg shadow-green-100 active:scale-95"
                >
                  <span>Next Question</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              ) : (() => {
                const results = calculateQuizScore();
                const allAnswered = quizQuestions.every((_, idx) => quizAnswers[idx] !== undefined);

                return (
                  <div className="flex-1 flex flex-col w-full">
                    {/* Quiz Summary - Show when all questions are answered */}
                    {allAnswered && (
                      <div className={`mb-6 p-6 rounded-2xl border-2 transition-all duration-500 animate-in zoom-in-95 ${results.passed
                        ? 'bg-green-50 border-green-300 shadow-lg shadow-green-50'
                        : 'bg-red-50 border-red-300 shadow-lg shadow-red-50'
                        }`}>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className={`text-2xl font-black ${results.passed ? 'text-green-800' : 'text-red-800'
                            }`}>
                            {results.passed ? '✅ Quiz Réussi!' : '❌ Quiz Échoué'}
                          </h4>
                          <div className={`text-3xl font-black ${results.passed ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {results.percentage}%
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 bg-white/50 p-4 rounded-xl border border-current/10">
                          <div>
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-1">Score obtenu</span>
                            <span className="font-black text-lg text-gray-900">
                              {results.score} / {results.totalPoints} points
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-1">Passage</span>
                            <span className="font-black text-lg text-gray-900">
                              {results.passingScoreIsPercentage
                                ? `${results.passingScore}%`
                                : `${results.passingScore} pts`}
                            </span>
                          </div>
                        </div>
                        {!results.passed && (
                          <div className="mt-4 flex items-center gap-2 p-3 bg-white/40 rounded-lg text-red-700 text-sm font-medium">
                            <span>⚠️ Un score de {results.passingScoreIsPercentage ? `${results.passingScore}%` : `${results.passingScore}pts`} est requis.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {allQuizzesPassed && onNextModule && moduleIndex !== undefined && totalModules && moduleIndex < totalModules - 1 ? (
                      <button
                        onClick={() => {
                          if (journeyId && trainee.id) {
                            const moduleId = extractObjectId((module as any)._id) || extractObjectId(module.id);
                            if (moduleId && /^[0-9a-fA-F]{24}$/.test(moduleId)) {
                              const timeSpentMinutes = Math.floor(currentTime / 60);
                              ProgressService.updateProgress({
                                repId: trainee.id,
                                journeyId: journeyId,
                                moduleId: moduleId,
                                progress: 100,
                                status: 'completed',
                                timeSpent: timeSpentMinutes,
                                engagementScore: engagementScore
                              }).catch((err: any) => console.error('Error saving progress:', err));
                            }
                          }
                          onNextModule();
                        }}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all font-bold text-lg flex items-center justify-center space-x-2 shadow-xl shadow-purple-100 active:scale-95"
                      >
                        <span>Next Module</span>
                        <ArrowRight className="h-5 w-5" />
                      </button>
                    ) : allQuizzesPassed ? (
                      <button
                        onClick={onComplete}
                        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-bold text-lg flex items-center justify-center space-x-2 shadow-xl shadow-green-100 active:scale-95"
                      >
                        <span>Complete Module</span>
                        <ArrowRight className="h-5 w-5" />
                      </button>
                    ) : (
                      <div className="w-full">
                        <p className="text-sm font-bold text-red-600 mb-3 text-center">
                          ⚠️ Veuillez réessayer pour obtenir le score requis.
                        </p>
                        <button
                          onClick={() => {
                            setShowQuizResult(false);
                            setCurrentQuizIndex(0);
                            setQuizAnswer(null);
                            setAllQuizzesPassed(false);
                            const questions = getQuizQuestions();
                            if (questions && questions.length > 0 && questions[0]) {
                              const q = questions[0];
                              setCurrentQuiz({
                                id: q._id ? `quiz-${q._id}` : `quiz-0`,
                                question: q.question || q.text || '',
                                options: q.options || [],
                                correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : (q.correctAnswer !== undefined ? q.correctAnswer : 0),
                                explanation: q.explanation || 'Please retry the quiz.',
                                difficulty: q.difficulty === 'easy' ? 3 : q.difficulty === 'medium' ? 5 : 8,
                                aiGenerated: true
                              });
                            }
                            setQuizAnswers({});
                          }}
                          className="w-full py-4 bg-white border-2 border-orange-500 text-orange-600 rounded-xl hover:bg-orange-50 transition-all font-bold text-lg active:scale-95"
                        >
                          Retry Quiz
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
