import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ArrowRight, Award, Clock, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { ManualQuiz } from '../../types/manualTraining';

// Détection automatique de l'environnement
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:5010' : 'https://v25platformtrainingbackend-production.up.railway.app';
};

const API_BASE = getApiBaseUrl();

interface QuizTakerProps {
  moduleId: string;
  trainingId: string;
  onQuizComplete?: (completed: boolean) => void;
}

export const QuizTaker: React.FC<QuizTakerProps> = ({ moduleId, trainingId, onQuizComplete }) => {
  const [quizzes, setQuizzes] = useState<ManualQuiz[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizzes();
    // Reset quiz state when module changes
    setAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setScore(0);
    if (onQuizComplete) {
      onQuizComplete(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      // If moduleId is 'final-exam', load final exam from training quizzes
      if (moduleId === 'final-exam') {
        const response = await axios.get(`${API_BASE}/manual-trainings/${trainingId}/quizzes`);
        if (response.data.success && response.data.data.length > 0) {
          // Find final exam (quiz without moduleId or with special moduleId)
          const exam = response.data.data.find((quiz: any) =>
            !quiz.moduleId || quiz.moduleId === 'FINAL_EXAM' || quiz.moduleId === 'final-exam'
          );
          if (exam) {
            setQuizzes([exam]);
          }
        }
      } else {
        // Load regular module quizzes
        const response = await axios.get(`${API_BASE}/manual-trainings/modules/${moduleId}/quizzes`);
        if (response.data.success && response.data.data.length > 0) {
          setQuizzes(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentQuiz = quizzes[currentQuizIndex];
  const currentQuestion = currentQuiz?.questions?.[currentQuestionIndex];

  // Helper function to get question options (with defaults for True/False)
  const getQuestionOptions = (question: any) => {
    if (!question) return [];

    // If question has options, use them
    if (question.options && question.options.length > 0) {
      return question.options;
    }

    // If question is True/False type, provide default options
    if (question.type === 'truefalse' ||
      (question.question && question.question.toLowerCase().includes('true or false'))) {
      return ['True', 'False'];
    }

    return [];
  };

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers({
      ...answers,
      [questionId]: answer,
    });
  };

  const handleNextQuestion = () => {
    if (!currentQuiz) return;

    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Calculate score
      let correct = 0;
      currentQuiz.questions.forEach((q) => {
        const userAnswer = answers[q.id!];
        if (JSON.stringify(userAnswer) === JSON.stringify(q.correctAnswer)) {
          correct++;
        }
      });
      setScore((correct / currentQuiz.questions.length) * 100);
      setShowResults(true);
      // Notify parent that quiz is completed
      if (onQuizComplete) {
        onQuizComplete(true);
      }
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setScore(0);
    // Notify parent that quiz is reset
    if (onQuizComplete) {
      onQuizComplete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!quizzes.length) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 text-center">
        <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
        <p className="text-yellow-800 font-medium text-sm">No quiz available for this module</p>
      </div>
    );
  }

  if (!currentQuiz) return null;

  if (showResults) {
    const passed = score >= (currentQuiz.passingScore || 70);

    return (
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className={`text-center mb-3 p-4 rounded-lg ${passed ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'
          }`}>
          {passed ? (
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
          ) : (
            <XCircle className="w-12 h-12 text-red-600 mx-auto mb-2" />
          )}

          <h3 className="text-2xl font-bold mb-1">
            {passed ? '✨ Congratulations!' : '😔 Not passed yet'}
          </h3>

          <div className="text-4xl font-bold my-2" style={{ color: passed ? '#16a34a' : '#dc2626' }}>
            {score.toFixed(0)}%
          </div>

          <p className="text-base text-gray-700">
            {currentQuiz.questions.filter(q => JSON.stringify(answers[q.id!]) === JSON.stringify(q.correctAnswer)).length} / {currentQuiz.questions.length} correct answers
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleRetry}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-md hover:shadow-lg font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion || !currentQuiz || !currentQuiz.questions) return null;

  const progress = currentQuiz.questions.length > 0
    ? ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100
    : 0;

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="bg-gray-300 rounded-full h-4 overflow-hidden shadow-inner">
        <div
          className="bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 h-full transition-all duration-500 flex items-center justify-end pr-1"
          style={{ width: `${progress}%` }}
        >
          <span className="text-white text-xs font-bold">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg p-4 border-2 border-purple-200">
        <div className="flex items-center justify-between mb-3">
          <span className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-full font-bold text-sm shadow-md">
            Question {currentQuestionIndex + 1} / {currentQuiz.questions.length}
          </span>

          {currentQuiz.timeLimit && (
            <span className="flex items-center px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-semibold text-sm">
              <Clock className="w-4 h-4 mr-1" />
              {currentQuiz.timeLimit} min
            </span>
          )}
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
          {currentQuestion.question}
        </h3>

        {/* Options */}
        <div className="space-y-2">
          {(() => {
            const options = getQuestionOptions(currentQuestion);
            return options && options.length > 0 ? (
              options.map((option, index) => {
                const isSelected = currentQuestion.type === 'multiple'
                  ? (answers[currentQuestion.id!] || []).includes(option)
                  : answers[currentQuestion.id!] === option;

                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (currentQuestion.type === 'multiple') {
                        const currentAnswers = answers[currentQuestion.id!] || [];
                        const newAnswers = currentAnswers.includes(option)
                          ? currentAnswers.filter((a: string) => a !== option)
                          : [...currentAnswers, option];
                        handleAnswer(currentQuestion.id!, newAnswers);
                      } else {
                        handleAnswer(currentQuestion.id!, option);
                      }
                    }}
                    className={`w-full p-3 rounded-lg text-left transition-all border-2 transform hover:scale-[1.01] ${isSelected
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 border-purple-700 shadow-lg text-white'
                        : 'bg-white border-gray-300 hover:border-purple-400 hover:bg-purple-50 text-gray-900 shadow-sm hover:shadow-md'
                      }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center flex-shrink-0 ${isSelected
                          ? 'bg-white border-white'
                          : 'border-gray-400 bg-white'
                        }`}>
                        {isSelected ? (
                          <div className="w-3 h-3 bg-purple-600 rounded-full" />
                        ) : (
                          <div className="w-3 h-3 bg-gray-300 rounded-full" />
                        )}
                      </div>
                      <span className={`text-base font-semibold ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                        {option}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg text-center">
                <p className="text-yellow-800 font-medium">No options available for this question</p>
              </div>
            );
          })()}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNextQuestion}
          disabled={!answers[currentQuestion.id!]}
          className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 text-white rounded-lg hover:from-purple-700 hover:via-purple-800 hover:to-purple-900 transition-all shadow-lg hover:shadow-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transform hover:scale-105 active:scale-95"
        >
          <span>{currentQuestionIndex < currentQuiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

