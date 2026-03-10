import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { TrainingModule, Quiz } from '../../types';
import DocumentViewer from '../DocumentViewer/DocumentViewer';
import { ApiClient } from '../../lib/api';

interface InteractiveModuleProps {
  module: TrainingModule;
  onProgress: (progress: number) => void;
  onComplete: () => void;
  onBack?: () => void;
}

export default function InteractiveModule({ module, onProgress, onComplete, onBack }: InteractiveModuleProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());
  const [showQuizzes, setShowQuizzes] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | number[] | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  // Get sections from module.content or module.sections
  const moduleAny = module as any;
  const sections = (moduleAny.sections && Array.isArray(moduleAny.sections) && moduleAny.sections.length > 0)
    ? moduleAny.sections
    : (moduleAny.content && Array.isArray(moduleAny.content) && moduleAny.content.length > 0)
      ? moduleAny.content
      : [];

  // Get current section data
  const currentSectionData = sections[currentSection] || null;

  // Calculate real progress percentage based on completed sections
  const realProgress = sections.length > 0
    ? Math.round((completedSections.size / sections.length) * 100)
    : module.progress || 0;

  // Reset quiz state when module changes
  useEffect(() => {
    setShowQuizzes(false);
    setCurrentQuizIndex(0);
    setCurrentQuestionIndex(0);
    setCurrentQuiz(null);
    setQuizAnswer(null);
    setShowQuizResult(false);
    setCurrentSection(0);
    setCompletedSections(new Set());
  }, [module.id]);

  // Load quizzes from embedded structure (module.assessments or module.quizzes)
  useEffect(() => {
    console.log('[InteractiveModule] Loading quizzes for module:', module.title);
    console.log('[InteractiveModule] Module data:', {
      hasAssessments: !!(moduleAny.assessments && Array.isArray(moduleAny.assessments) && moduleAny.assessments.length > 0),
      hasQuizzes: !!(moduleAny.quizzes && Array.isArray(moduleAny.quizzes) && moduleAny.quizzes.length > 0),
      assessments: moduleAny.assessments,
      quizzes: moduleAny.quizzes
    });

    setLoadingQuizzes(true);

    // Convert quiz/assessment questions to Quiz format (flatten all questions)
    const convertQuestionsToQuizzes = (quizOrAssessment: any): Quiz[] => {
      const questions = quizOrAssessment.questions || [];
      return questions.map((q: any, index: number) => ({
        id: q.id || `q-${Date.now()}-${index}`,
        question: q.question || q.text || '',
        type: q.type || 'multiple-choice',
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        difficulty: q.points || 10,
        aiGenerated: false
      }));
    };

    // Check module.quizzes first (new structure), then module.assessments (old structure)
    const moduleQuizzes = moduleAny.quizzes;
    const moduleAssessments = moduleAny.assessments;

    let allQuestions: Quiz[] = [];

    if (moduleQuizzes && Array.isArray(moduleQuizzes) && moduleQuizzes.length > 0) {
      // Flatten all questions from all quizzes
      moduleQuizzes.forEach((quiz: any) => {
        const questions = convertQuestionsToQuizzes(quiz);
        allQuestions = [...allQuestions, ...questions];
      });
      console.log('[InteractiveModule] Using', allQuestions.length, 'questions from', moduleQuizzes.length, 'quizzes in module.quizzes');
      console.log('[InteractiveModule] First question:', allQuestions[0]);
    } else if (moduleAssessments && Array.isArray(moduleAssessments) && moduleAssessments.length > 0) {
      // Flatten all questions from all assessments (fallback for old structure)
      moduleAssessments.forEach((assessment: any) => {
        const questions = convertQuestionsToQuizzes(assessment);
        allQuestions = [...allQuestions, ...questions];
      });
      console.log('[InteractiveModule] Using', allQuestions.length, 'questions from', moduleAssessments.length, 'assessments in module.assessments');
    } else {
      console.log('[InteractiveModule] No quizzes found in module.quizzes or module.assessments');
    }

    console.log('[InteractiveModule] Total questions loaded:', allQuestions.length);
    if (allQuestions.length > 0) {
      console.log('[InteractiveModule] First question options:', allQuestions[0].options);
    }

    setQuizzes(allQuestions);

    setLoadingQuizzes(false);
  }, [module]);

  // Debug log
  useEffect(() => {
    const quizIds = (module as any).quizIds;
    console.log('[InteractiveModule] Module state:', {
      moduleTitle: module.title,
      sectionsCount: sections.length,
      currentSection: currentSection,
      currentSectionData: currentSectionData,
      hasFile: !!currentSectionData?.content?.file?.url,
      fileUrl: currentSectionData?.content?.file?.url,
      moduleContent: moduleAny.content?.length || 0,
      moduleSections: moduleAny.sections?.length || 0,
      showQuizzes: showQuizzes,
      quizzesCount: quizzes.length,
      currentQuiz: currentQuiz,
      realProgress: realProgress,
      completedSections: Array.from(completedSections),
      quizIds: quizIds,
      hasQuizIds: !!quizIds && Array.isArray(quizIds) && quizIds.length > 0,
      loadingQuizzes: loadingQuizzes
    });
  }, [sections, currentSection, currentSectionData, moduleAny.content, moduleAny.sections, showQuizzes, quizzes, currentQuiz, realProgress, completedSections, loadingQuizzes]);

  // Don't scroll automatically - let the container handle it

  // Update progress when sections are completed (this is now handled in handleNext, but keep for initial state)
  useEffect(() => {
    if (sections.length > 0 && completedSections.size > 0) {
      const progress = (completedSections.size / sections.length) * 100;
      onProgress(progress);
    }
  }, [completedSections, sections.length, onProgress]);


  const handleNext = () => {
    if (showQuizzes) {
      // If showing quizzes, move to next question
      if (currentQuestionIndex < quizzes.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        // All questions completed for this module, finish module and move to next
        console.log('[InteractiveModule] All questions completed, finishing module and moving to next');
        // Mark all sections as completed for final progress update
        if (sections.length > 0) {
          const allSectionsCompleted = new Set(Array.from({ length: sections.length }, (_, i) => i));
          setCompletedSections(allSectionsCompleted);
          onProgress(100);
        }
        // Reset quiz state for next module
        setShowQuizzes(false);
        setCurrentQuestionIndex(0);
        setCurrentQuizIndex(0);
        setCurrentQuiz(null);
        setQuizAnswer(null);
        setShowQuizResult(false);
        // Complete this module and move to next
        onComplete();
      }
    } else {
      // If no sections but quizzes available, start quizzes
      if (sections.length === 0 && quizzes.length > 0) {
        setShowQuizzes(true);
        setCurrentQuestionIndex(0);
        setCurrentQuiz(quizzes[0]);
        return;
      }

      // Mark current section as completed
      if (sections.length > 0) {
        const newCompletedSections = new Set([...completedSections, currentSection]);
        setCompletedSections(newCompletedSections);
        // Update progress immediately
        const newProgress = (newCompletedSections.size / sections.length) * 100;
        onProgress(newProgress);
      }

      // Check if this is the last section
      if (currentSection < sections.length - 1) {
        setCurrentSection(prev => prev + 1);
      } else {
        // Last section completed, show quizzes for this module
        console.log('[InteractiveModule] Last section completed, checking for quizzes...', {
          quizzesCount: quizzes.length,
          loadingQuizzes: loadingQuizzes,
          quizIds: (module as any).quizIds
        });

        if (quizzes.length > 0) {
          console.log('[InteractiveModule] Showing quizzes after module completion');
          setShowQuizzes(true);
          setCurrentQuestionIndex(0);
          setCurrentQuiz(quizzes[0]);
        } else if (loadingQuizzes) {
          // Still loading quizzes, wait a bit
          console.log('[InteractiveModule] Quizzes still loading, waiting...');
          setTimeout(() => {
            if (quizzes.length > 0) {
              setShowQuizzes(true);
              setCurrentQuestionIndex(0);
              setCurrentQuiz(quizzes[0]);
            } else {
              console.log('[InteractiveModule] No quizzes found after loading, completing module');
              if (sections.length > 0) {
                onProgress(100);
              }
              onComplete();
            }
          }, 1000);
        } else {
          // No quizzes available, complete module and move to next
          console.log('[InteractiveModule] No quizzes available, completing module');
          if (sections.length > 0) {
            onProgress(100);
          }
          onComplete();
        }
      }
    }
  };

  const handlePrevious = () => {
    if (showQuizzes) {
      // If showing quizzes, go back to previous question
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(prev => prev - 1);
      } else {
        // Go back to last section
        setShowQuizzes(false);
        setCurrentSection(sections.length - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      // Go to previous section or back to modules list if on first section
      if (currentSection > 0) {
        setCurrentSection(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (onBack) {
        // On first section, go back to modules list
        onBack();
      }
    }
  };

  // Update current quiz when question index changes
  useEffect(() => {
    if (showQuizzes && quizzes.length > 0 && currentQuestionIndex < quizzes.length) {
      setCurrentQuiz(quizzes[currentQuestionIndex]);
      setQuizAnswer(null);
      setShowQuizResult(false);
    }
  }, [showQuizzes, currentQuestionIndex, quizzes]);

  const submitQuizAnswer = () => {
    if (quizAnswer !== null && currentQuiz) {
      setShowQuizResult(true);
    }
  };

  const getModuleTypeIcon = () => {
    return <FileText className="h-5 w-5" />;
  };

  return (
    <div className="bg-white flex flex-col w-full h-full" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Content Area - Only Document */}
      <div className="flex-1 flex flex-col w-full min-h-0 overflow-hidden" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Show Quizzes or Sections */}
        {showQuizzes && currentQuiz ? (
          <div className="p-6 flex-1 overflow-y-auto" style={{ overflowY: 'auto', height: '100%' }}>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Module Quiz: {module.title}
                  </h2>
                  <h3 className="text-lg font-semibold text-gray-700">
                    Question {currentQuestionIndex + 1} of {quizzes.length}
                  </h3>
                </div>
              </div>

              {/* Quiz Content */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <p className="text-gray-700 mb-6 text-lg font-medium">{currentQuiz.question}</p>

                {currentQuiz && currentQuiz.options && currentQuiz.options.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    {currentQuiz.options.map((option, index) => {
                      // Determine question type from currentQuiz or default to multiple-choice
                      const questionType = (currentQuiz as any).type || 'multiple-choice';
                      const isMultipleCorrect = questionType === 'multiple-correct';
                      const isTrueFalse = questionType === 'true-false';
                      const isChecked = Array.isArray(quizAnswer)
                        ? quizAnswer.includes(index)
                        : quizAnswer === index;

                      return (
                        <button
                          key={index}
                          onClick={() => {
                            if (isMultipleCorrect) {
                              setQuizAnswer(prev => {
                                const prevArray = Array.isArray(prev) ? prev : [];
                                if (prevArray.includes(index)) {
                                  return prevArray.filter(i => i !== index);
                                } else {
                                  return [...prevArray, index];
                                }
                              });
                            } else {
                              setQuizAnswer(index);
                            }
                          }}
                          className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${isChecked
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type={isMultipleCorrect ? 'checkbox' : 'radio'}
                              checked={isChecked}
                              onChange={() => { }}
                              className="h-4 w-4"
                            />
                            <span className="text-gray-700">{option}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800">No options available for this quiz</p>
                  </div>
                )}

                {showQuizResult && currentQuiz && (
                  <div className={`p-4 rounded-lg mb-4 ${(() => {
                      const correctAnswer = currentQuiz.correctAnswer;
                      if (Array.isArray(quizAnswer) && Array.isArray(correctAnswer)) {
                        return JSON.stringify([...quizAnswer].sort()) === JSON.stringify([...correctAnswer].sort());
                      } else if (Array.isArray(quizAnswer)) {
                        return quizAnswer.length === 1 && quizAnswer[0] === correctAnswer;
                      } else {
                        return quizAnswer === correctAnswer;
                      }
                    })()
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                    }`}>
                    <p className={`font-medium ${(() => {
                        const correctAnswer = currentQuiz.correctAnswer;
                        if (Array.isArray(quizAnswer) && Array.isArray(correctAnswer)) {
                          return JSON.stringify([...quizAnswer].sort()) === JSON.stringify([...correctAnswer].sort());
                        } else if (Array.isArray(quizAnswer)) {
                          return quizAnswer.length === 1 && quizAnswer[0] === correctAnswer;
                        } else {
                          return quizAnswer === correctAnswer;
                        }
                      })()
                        ? 'text-green-800'
                        : 'text-red-800'
                      }`}>
                      {(() => {
                        const correctAnswer = currentQuiz.correctAnswer;
                        if (Array.isArray(quizAnswer) && Array.isArray(correctAnswer)) {
                          return JSON.stringify([...quizAnswer].sort()) === JSON.stringify([...correctAnswer].sort());
                        } else if (Array.isArray(quizAnswer)) {
                          return quizAnswer.length === 1 && quizAnswer[0] === correctAnswer;
                        } else {
                          return quizAnswer === correctAnswer;
                        }
                      })()
                        ? 'Correct!'
                        : 'Incorrect'}
                    </p>
                    {currentQuiz.explanation && (
                      <p className="text-sm text-gray-700 mt-2">{currentQuiz.explanation}</p>
                    )}
                  </div>
                )}

                {!showQuizResult && (
                  <button
                    onClick={submitQuizAnswer}
                    disabled={quizAnswer === null}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Submit Answer
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Current Section - Only Document */
          sections.length > 0 && currentSectionData ? (
            // Check for file URL in multiple possible locations
            (() => {
              const fileUrl = currentSectionData.content?.file?.url
                || currentSectionData.file?.url
                || currentSectionData.url
                || (currentSectionData.content && typeof currentSectionData.content === 'string' && currentSectionData.content.startsWith('http') ? currentSectionData.content : null);

              const fileName = currentSectionData.content?.file?.name
                || currentSectionData.file?.name
                || currentSectionData.name
                || 'Document';

              const mimeType = currentSectionData.content?.file?.mimeType
                || currentSectionData.file?.mimeType
                || currentSectionData.mimeType
                || 'application/pdf';

              const textContent = currentSectionData.content?.text
                || currentSectionData.text
                || (typeof currentSectionData.content === 'string' && !currentSectionData.content.startsWith('http') ? currentSectionData.content : null);

              console.log('[InteractiveModule] Rendering section:', {
                hasFileUrl: !!fileUrl,
                fileUrl,
                hasTextContent: !!textContent,
                textContent: textContent?.substring(0, 100),
                currentSectionData
              });

              if (fileUrl) {
                return (
                  <div className="flex-1 w-full min-h-0 overflow-hidden" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <DocumentViewer
                      fileUrl={fileUrl}
                      fileName={fileName}
                      mimeType={mimeType}
                    />
                  </div>
                );
              } else if (textContent) {
                return (
                  <div className="p-6 flex-1 overflow-y-auto" style={{ overflowY: 'auto', height: '100%' }}>
                    <div className="prose max-w-none">
                      {textContent.split('\n\n').map((paragraph: string, idx: number) => (
                        <p key={idx} className="text-gray-700 text-base leading-relaxed mb-4">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">No content available for this section</p>
                      <details className="mt-4 text-left max-w-md mx-auto">
                        <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600">Debug Info</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                          {JSON.stringify(currentSectionData, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                );
              }
            })()
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No sections available in this module</p>
                {quizzes.length > 0 && (
                  <button
                    onClick={() => {
                      setShowQuizzes(true);
                      setCurrentQuestionIndex(0);
                      setCurrentQuiz(quizzes[0]);
                    }}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Start Quizzes ({quizzes.length})
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Navigation Buttons - Always visible at bottom */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white flex-shrink-0 z-10" style={{ flexShrink: 0, position: 'relative' }}>
        <button
          onClick={handlePrevious}
          disabled={!showQuizzes && currentSection === 0 && !onBack}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${(!showQuizzes && currentSection === 0 && !onBack)
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
        >
          <ChevronLeft className="h-5 w-5" />
          <span>{!showQuizzes && currentSection === 0 && onBack ? 'Back to Training Modules' : 'Previous'}</span>
        </button>
        <span className="text-sm text-gray-600">
          {showQuizzes
            ? (quizzes.length > 0 ? `Question ${currentQuestionIndex + 1} of ${quizzes.length}` : 'No questions')
            : sections.length > 0
              ? `Section ${currentSection + 1} of ${sections.length}`
              : 'No sections'
          }
        </span>
        <button
          onClick={handleNext}
          disabled={!showQuizzes && sections.length === 0 && quizzes.length === 0}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${(!showQuizzes && sections.length === 0 && quizzes.length === 0)
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
          <span>
            {showQuizzes && currentQuestionIndex === quizzes.length - 1
              ? 'Complete Module'
              : (!showQuizzes && sections.length === 0 && quizzes.length > 0)
                ? 'Start Quizzes'
                : 'Next'
            }
          </span>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}