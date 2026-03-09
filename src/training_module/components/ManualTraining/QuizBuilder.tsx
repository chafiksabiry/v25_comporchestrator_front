import React, { useState, useEffect } from 'react';
import { Plus, ArrowLeft, Save, Trash2, X, Edit2, HelpCircle, Sparkles } from 'lucide-react';
import { ManualTraining, ManualTrainingModule, ManualQuiz, QuizQuestion, QuizSettings } from '../../types/manualTraining';
import axios from 'axios';
import { AIQuizGenerator } from './AIQuizGenerator';

// Détection automatique de l'environnement
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:5010' : 'https://v25platformtrainingbackend-production.up.railway.app';
};

const API_BASE = getApiBaseUrl();

interface QuizBuilderProps {
  module: ManualTrainingModule;
  training: ManualTraining;
  onBack: () => void;
}

export const QuizBuilder: React.FC<QuizBuilderProps> = ({ module, training, onBack }) => {
  const [quizzes, setQuizzes] = useState<ManualQuiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<ManualQuiz | null>(null);
  const [editingQuiz, setEditingQuiz] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  // Quiz Form
  const [quizForm, setQuizForm] = useState<Partial<ManualQuiz>>({
    title: '',
    description: '',
    passingScore: 70,
    timeLimit: undefined,
    maxAttempts: 3,
    settings: {
      shuffleQuestions: false,
      shuffleOptions: false,
      showCorrectAnswers: true,
      allowReview: true,
      showExplanations: true,
    },
  });

  // Question Form
  const [questionForm, setQuestionForm] = useState<Partial<QuizQuestion>>({
    question: '',
    type: 'multiple-choice',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    points: 1,
  });

  useEffect(() => {
    loadQuizzes();
  }, [module.id]);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/manual-trainings/modules/${module.id}/quizzes`);
      if (response.data.success) {
        setQuizzes(response.data.data);
      }
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = async (selectQuiz: boolean = false) => {
    if (!quizForm.title) {
      alert('Please enter a quiz title');
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE}/manual-trainings/modules/${module.id}/quizzes`,
        {
          ...quizForm,
          moduleId: module.id,
          trainingId: training.id,
          questions: [],
        }
      );

      if (response.data.success) {
        await loadQuizzes();
        setEditingQuiz(false);

        if (selectQuiz) {
          // ✨ Automatically select quiz to add questions
          const newQuiz = response.data.data;
          setSelectedQuiz(newQuiz);
        } else {
          resetQuizForm();
        }
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('Error creating quiz');
    }
  };

  const handleUpdateQuiz = async () => {
    if (!selectedQuiz?.id) return;

    try {
      const response = await axios.put(
        `${API_BASE}/manual-trainings/quizzes/${selectedQuiz.id}`,
        quizForm
      );

      if (response.data.success) {
        await loadQuizzes();
        setEditingQuiz(false);
      }
    } catch (error) {
      console.error('Error updating quiz:', error);
      alert('Error updating quiz');
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/manual-trainings/quizzes/${quizId}`);
      await loadQuizzes();
      if (selectedQuiz?.id === quizId) {
        setSelectedQuiz(null);
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert('Error deleting quiz');
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedQuiz?.id || !questionForm.question) {
      alert('Please fill in required fields');
      return;
    }

    // Validate options for multiple-choice
    if (questionForm.type === 'multiple-choice' && questionForm.options) {
      const validOptions = questionForm.options.filter(opt => opt.trim() !== '');
      if (validOptions.length < 2) {
        alert('Please provide at least 2 options');
        return;
      }
    }

    try {
      const response = await axios.post(
        `${API_BASE}/manual-trainings/quizzes/${selectedQuiz.id}/questions`,
        questionForm
      );

      if (response.data.success) {
        setSelectedQuiz(response.data.data);
        await loadQuizzes();
        resetQuestionForm();
      }
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Error adding question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedQuiz?.id || !confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_BASE}/manual-trainings/quizzes/${selectedQuiz.id}/questions/${questionId}`
      );

      if (response.data.success) {
        setSelectedQuiz(response.data.data);
        await loadQuizzes();
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Error deleting question');
    }
  };

  const resetQuizForm = () => {
    setQuizForm({
      title: '',
      description: '',
      passingScore: 70,
      timeLimit: undefined,
      maxAttempts: 3,
      settings: {
        shuffleQuestions: false,
        shuffleOptions: false,
        showCorrectAnswers: true,
        allowReview: true,
        showExplanations: true,
      },
    });
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      points: 1,
    });
  };

  const handleEditQuiz = (quiz: ManualQuiz) => {
    setSelectedQuiz(quiz);
    setQuizForm(quiz);
    setEditingQuiz(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Quiz Management</h1>
              <p className="text-gray-600">{module.title} - {training.title}</p>
            </div>
          </div>
          {/* AI Generate Button */}
          <button
            onClick={() => setShowAIGenerator(true)}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 shadow-lg transition-all transform hover:scale-105"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Générer avec l'IA
          </button>
        </div>
      </div>

      {/* Content with padding-top to account for fixed header */}
      <div className="pt-32 pb-6">
        {/* Quizzes List - Fixed Left Column */}
        <div className="fixed left-6 top-32 bottom-6 w-80 z-40">
          <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-xl font-bold">Quizzes</h2>
              <button
                onClick={() => {
                  resetQuizForm();
                  setEditingQuiz(true);
                  setSelectedQuiz(null);
                }}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Create/Edit Quiz Form */}
            {editingQuiz && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Quiz title"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <textarea
                  placeholder="Quiz description"
                  value={quizForm.description}
                  onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600">Passing Score (%)</label>
                    <input
                      type="number"
                      value={quizForm.passingScore}
                      onChange={(e) => setQuizForm({ ...quizForm, passingScore: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Max Attempts</label>
                    <input
                      type="number"
                      value={quizForm.maxAttempts}
                      onChange={(e) => setQuizForm({ ...quizForm, maxAttempts: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Time Limit (minutes, optional)</label>
                  <input
                    type="number"
                    placeholder="Leave empty for no limit"
                    value={quizForm.timeLimit || ''}
                    onChange={(e) => setQuizForm({ ...quizForm, timeLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  {!selectedQuiz && (
                    <button
                      onClick={() => handleCreateQuiz(true)}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center justify-center"
                    >
                      Save & Add Questions
                      <HelpCircle className="w-4 h-4 ml-2" />
                    </button>
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => selectedQuiz ? handleUpdateQuiz() : handleCreateQuiz(false)}
                      className="flex-1 px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm"
                    >
                      <Save className="w-4 h-4 inline mr-1" />
                      {selectedQuiz ? 'Update' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingQuiz(false);
                        if (selectedQuiz) {
                          setQuizForm(selectedQuiz);
                        }
                      }}
                      className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quizzes List - Scrollable */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  onClick={() => {
                    setSelectedQuiz(quiz);
                    setEditingQuiz(false);
                  }}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${selectedQuiz?.id === quiz.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{quiz.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{quiz.description}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-2">
                        <span>{quiz.questions?.length || 0} questions</span>
                        <span>•</span>
                        <span>{quiz.passingScore}% to pass</span>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditQuiz(quiz);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuiz(quiz.id!);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {quizzes.length === 0 && !editingQuiz && (
                <p className="text-center text-gray-500 py-8">No quizzes yet</p>
              )}
            </div>

            {/* Add Another Quiz Button */}
            {!editingQuiz && quizzes.length > 0 && (
              <button
                onClick={() => {
                  setEditingQuiz(true);
                  setSelectedQuiz(null);
                  resetQuizForm();
                }}
                className="w-full mt-4 px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50 transition-all flex items-center justify-center flex-shrink-0"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Another Quiz
              </button>
            )}
          </div>
        </div>

        {/* Quiz Questions - Right Column with margin for fixed left column */}
        <div className="ml-96 px-6">
          <div className="max-w-5xl">
            {selectedQuiz && !editingQuiz ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">{selectedQuiz.title}</h2>
                <p className="text-gray-600 mb-6">{selectedQuiz.description}</p>

                {/* Quiz Settings Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Quiz Settings</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Passing Score:</span>
                      <span className="ml-2 font-medium">{selectedQuiz.passingScore}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Max Attempts:</span>
                      <span className="ml-2 font-medium">{selectedQuiz.maxAttempts}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Time Limit:</span>
                      <span className="ml-2 font-medium">{selectedQuiz.timeLimit ? `${selectedQuiz.timeLimit} min` : 'Unlimited'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Questions:</span>
                      <span className="ml-2 font-medium">{selectedQuiz.questions?.length || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Add Question Form */}
                <div className="mb-6 p-6 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-4 flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Add New Question
                  </h3>

                  <div className="space-y-4">
                    <textarea
                      placeholder="Enter your question"
                      value={questionForm.question}
                      onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <select
                        value={questionForm.type}
                        onChange={(e) => setQuestionForm({
                          ...questionForm,
                          type: e.target.value as any,
                          options: e.target.value === 'true-false' ? ['True', 'False'] : ['', '', '', ''],
                          correctAnswer: 0,
                        })}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="multiple-choice">Multiple Choice</option>
                        <option value="true-false">True/False</option>
                        <option value="short-answer">Short Answer</option>
                      </select>

                      <input
                        type="number"
                        placeholder="Points"
                        value={questionForm.points}
                        onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    {/* Options for multiple-choice */}
                    {questionForm.type === 'multiple-choice' && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Answer Options</label>
                        {questionForm.options?.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={questionForm.correctAnswer === index}
                              onChange={() => setQuestionForm({ ...questionForm, correctAnswer: index })}
                              className="w-4 h-4"
                            />
                            <input
                              type="text"
                              placeholder={`Option ${index + 1}`}
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(questionForm.options || [])];
                                newOptions[index] = e.target.value;
                                setQuestionForm({ ...questionForm, options: newOptions });
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* True/False */}
                    {questionForm.type === 'true-false' && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                        <div className="flex space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              checked={questionForm.correctAnswer === 0}
                              onChange={() => setQuestionForm({ ...questionForm, correctAnswer: 0 })}
                              className="w-4 h-4"
                            />
                            <span>True</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              checked={questionForm.correctAnswer === 1}
                              onChange={() => setQuestionForm({ ...questionForm, correctAnswer: 1 })}
                              className="w-4 h-4"
                            />
                            <span>False</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Short Answer */}
                    {questionForm.type === 'short-answer' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Expected Answer</label>
                        <input
                          type="text"
                          placeholder="Enter the correct answer"
                          value={questionForm.correctAnswer as string || ''}
                          onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    )}

                    <textarea
                      placeholder="Explanation (optional)"
                      value={questionForm.explanation}
                      onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />

                    <button
                      onClick={handleAddQuestion}
                      disabled={!questionForm.question}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Add Question
                    </button>
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center">
                    <HelpCircle className="w-5 h-5 mr-2" />
                    Questions ({selectedQuiz.questions?.length || 0})
                  </h3>

                  {selectedQuiz.questions && selectedQuiz.questions.length > 0 ? (
                    selectedQuiz.questions.map((question, index) => (
                      <div key={question.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                Q{index + 1}
                              </span>
                              <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                                {question.type}
                              </span>
                              <span className="text-xs text-gray-500">{question.points} point(s)</span>
                            </div>

                            <p className="font-medium text-gray-900 mb-2">{question.question}</p>

                            {question.type === 'multiple-choice' && question.options && (
                              <div className="space-y-1 text-sm">
                                {question.options.map((option, optIdx) => (
                                  <div key={optIdx} className={`flex items-center space-x-2 ${question.correctAnswer === optIdx ? 'text-green-700 font-medium' : 'text-gray-600'
                                    }`}>
                                    <span>{optIdx === question.correctAnswer ? '✓' : '○'}</span>
                                    <span>{option}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {question.type === 'true-false' && (
                              <p className="text-sm text-green-700 font-medium">
                                Correct Answer: {question.correctAnswer === 0 ? 'True' : 'False'}
                              </p>
                            )}

                            {question.explanation && (
                              <p className="text-sm text-gray-600 mt-2 italic">
                                Explanation: {question.explanation}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteQuestion(question.id!)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No questions yet. Add your first question above.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <HelpCircle className="w-16 h-16 mx-auto" />
                </div>
                <p className="text-xl text-gray-600">
                  {editingQuiz ? 'Fill in the quiz details' : 'Select a quiz to manage questions'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Quiz Generator Modal */}
      {showAIGenerator && (
        <AIQuizGenerator
          module={module}
          trainingId={training.id!}
          onQuizGenerated={(quiz) => {
            setShowAIGenerator(false);
            loadQuizzes();
            setSelectedQuiz(quiz);
          }}
          onClose={() => setShowAIGenerator(false)}
        />
      )}
    </div>
  );
};

