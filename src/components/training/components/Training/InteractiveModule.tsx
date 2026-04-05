import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, FileText, Sparkles, CheckCircle, Image as ImageIcon } from 'lucide-react';
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
                type: currentSectionData.type,
                textContent: textContent?.substring(0, 100),
                currentSectionData
              });

              if (currentSectionData.type === 'presentation' && currentSectionData.content?.slideData) {
                const slide = currentSectionData.content.slideData;
                const isCover = slide.type?.toLowerCase() === 'cover';
                const isConclusion = slide.type?.toLowerCase() === 'conclusion';
                let bgClasses = 'bg-slate-50 text-slate-800';
                if (isCover) bgClasses = 'bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white';
                if (isConclusion) bgClasses = 'bg-gradient-to-br from-emerald-600 to-teal-900 text-white';

                return (
                  <div className="flex-1 w-full min-h-0 overflow-hidden bg-[#f1f5f9] p-4 md:p-8 flex items-center justify-center">
                    <div className="w-full max-w-5xl shadow-2xl rounded-2xl overflow-hidden border-8 border-white bg-white relative group">
                      <div className={`w-full min-h-[600px] md:aspect-[16/9] ${bgClasses} transition-all duration-500 relative flex flex-col`}>
                        
                        {/* Ambient Background Effects for Cover */}
                        {isCover && (
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse"></div>
                            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>
                            <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse" style={{ animationDelay: '4s' }}></div>
                          </div>
                        )}
                        
                        {/* Ambient Background Effects for Conclusion */}
                        {isConclusion && (
                          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                             <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIyIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KPC9zdmc+')]"></div>
                          </div>
                        )}

                        <div className="relative z-10 w-full h-full p-8 md:p-12 flex flex-col overflow-y-auto">
                          
                          {/* Cover Slide Content */}
                          {isCover && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                              <div className="mb-8 p-6 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl">
                                <Sparkles className="h-20 w-20 text-pink-300 drop-shadow-lg" />
                              </div>
                              <h1 className="text-6xl font-extrabold mb-8 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-pink-200 drop-shadow-sm">
                                {slide.title}
                              </h1>
                              <p className="text-2xl text-purple-100 max-w-3xl mb-12 font-medium leading-relaxed drop-shadow-md">
                                {slide.subtitle || slide.highlight}
                              </p>
                            </div>
                          )}
                          
                          {/* Conclusion Slide Content */}
                          {isConclusion && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                              <div className="mx-auto h-32 w-32 rounded-full bg-white/20 shadow-[0_0_40px_rgba(255,255,255,0.3)] backdrop-blur-md flex items-center justify-center mb-10 border border-white/30">
                                <CheckCircle className="h-16 w-16 text-white drop-shadow-lg" />
                              </div>
                              <h1 className="text-7xl font-black mb-8 drop-shadow-lg">{slide.title}</h1>
                              <p className="text-3xl text-emerald-50 font-medium whitespace-pre-line leading-relaxed max-w-4xl mx-auto drop-shadow-md">
                                {slide.content || slide.subtitle}
                              </p>
                            </div>
                          )}

                          {/* Standard / Content Slides Content */}
                          {!isCover && !isConclusion && (
                            <div className="h-full flex relative">
                              <div className="absolute left-[-4rem] top-[-4rem] bottom-[-4rem] w-16 bg-gradient-to-b from-purple-600 to-rose-500 opacity-90 rounded-r-3xl shadow-lg"></div>
                              
                              <div className="h-full flex flex-col pl-4 w-full">
                                <div className="flex justify-between items-start mb-6">
                                  <h2 className="text-3xl md:text-4xl font-bold flex items-center w-full text-slate-800">
                                    <span className="mr-4 p-2 bg-purple-100 rounded-xl text-purple-600 shadow-inner">
                                      <span className="text-2xl md:text-3xl">{slide.icon || '📄'}</span>
                                    </span> 
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
                                      {slide.title}
                                    </span>
                                  </h2>
                                  {slide.highlight && (
                                    <div className="ml-4 px-4 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 text-amber-800 rounded-xl text-base md:text-lg font-bold border border-yellow-200 shadow-sm flex-shrink-0 flex items-center">
                                      <span className="mr-2 text-xl md:text-2xl">💡</span> {slide.highlight}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex-1 flex gap-8">
                                  <div className="flex-1 flex flex-col">
                                    {slide.content && (
                                      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6 border-l-4 border-l-purple-400">
                                        <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
                                          {slide.content}
                                        </p>
                                      </div>
                                    )}

                                    <div className="flex-1 space-y-3">
                                      {slide.bullets?.map((item: string, i: number) => (
                                        <div key={i} className="flex items-start bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-50 hover:shadow-md transition-shadow hover:scale-[1.01]">
                                          <div className="bg-gradient-to-br from-purple-500 to-rose-400 h-6 w-6 md:h-8 md:w-8 rounded-full flex flex-shrink-0 items-center justify-center text-white font-bold text-sm mr-3 shadow-sm">
                                            {i + 1}
                                          </div>
                                          <span className="text-base md:text-lg text-slate-700 leading-relaxed pt-0.5">{item}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* Multimedia Placeholder / AI Image */}
                                  <div className="hidden lg:flex w-1/3 flex-col justify-center items-center opacity-90 p-2">
                                    {slide.imageUrl ? (
                                       <div className="w-full aspect-[4/3] rounded-2xl bg-slate-100 flex items-center justify-center flex-col shadow-inner overflow-hidden relative border-4 border-white">
                                          <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover animate-in fade-in duration-700" />
                                       </div>
                                    ) : (
                                       <div className="w-full aspect-[4/3] rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center flex-col shadow-inner overflow-hidden relative">
                                          <div className="absolute inset-0 bg-white/40"></div>
                                          <div className="relative z-10 flex flex-col items-center">
                                             <ImageIcon className="h-12 w-12 text-slate-400 mb-2 drop-shadow-sm" />
                                             <span className="text-slate-500 font-medium text-base">Espace Média AI</span>
                                             <span className="text-slate-400 text-xs mt-1 text-center px-4">Image sera générée ici</span>
                                          </div>
                                       </div>
                                    )}
                                  </div>
                                </div>
                                
                                {slide.note && (
                                  <div className="mt-8 p-5 bg-slate-50/80 rounded-xl border border-slate-200 text-slate-600 font-medium flex items-start shadow-sm mix-blend-multiply">
                                    <div className="bg-white p-2 rounded-lg mr-4 shadow-sm border border-slate-100">
                                      <span className="text-xl">🎤</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-800 block mb-1 uppercase tracking-wider text-xs">Notes Orateur</span> 
                                      {slide.note}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

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