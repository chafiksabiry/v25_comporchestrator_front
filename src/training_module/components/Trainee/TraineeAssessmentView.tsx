import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  Award, 
  Target, 
  Brain,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  TrendingUp,
  Eye,
  RefreshCw,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { Assessment, Rep } from '../../types';

interface TraineeAssessmentViewProps {
  assessment: Assessment;
  trainee: Rep;
  onComplete: (score: number) => void;
  onBack: () => void;
}

export default function TraineeAssessmentView({ 
  assessment, 
  trainee, 
  onComplete, 
  onBack 
}: TraineeAssessmentViewProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(assessment.questions).fill(null));
  const [timeRemaining, setTimeRemaining] = useState(assessment.timeLimit ? assessment.timeLimit * 60 : 0);
  const [isActive, setIsActive] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [showReview, setShowReview] = useState(false);

  // Mock questions for demonstration
  const mockQuestions = [
    {
      id: '1',
      text: 'What is the primary goal of customer success in a health insurance brokerage?',
      options: [
        'Maximize sales revenue',
        'Ensure client satisfaction and retention through value delivery',
        'Minimize customer service costs',
        'Increase policy premiums'
      ],
      correctAnswer: 1,
      explanation: 'Customer success focuses on ensuring clients achieve their health coverage goals, leading to satisfaction and long-term retention.',
      category: 'Customer Success Fundamentals'
    },
    {
      id: '2',
      text: 'Which regulation is most critical for health insurance brokers to understand?',
      options: [
        'GDPR (General Data Protection Regulation)',
        'ACA (Affordable Care Act)',
        'HIPAA (Health Insurance Portability and Accountability Act)',
        'All of the above'
      ],
      correctAnswer: 3,
      explanation: 'Health insurance brokers must comply with multiple regulations including ACA for marketplace requirements, HIPAA for privacy, and GDPR for EU clients.',
      category: 'Regulatory Compliance'
    },
    {
      id: '3',
      text: 'In a contact centre environment, what is the most important metric for customer satisfaction?',
      options: [
        'Average call duration',
        'First call resolution rate',
        'Number of calls handled per hour',
        'Hold time percentage'
      ],
      correctAnswer: 1,
      explanation: 'First call resolution directly impacts customer satisfaction as it shows efficiency and competence in addressing client needs.',
      category: 'Contact Centre Excellence'
    }
  ];

  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitAssessment();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isActive, timeRemaining]);

  const startAssessment = () => {
    setIsActive(true);
    setCurrentQuestion(0);
    setAnswers(new Array(assessment.questions).fill(null));
  };

  const answerQuestion = (questionIndex: number, answer: number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answer;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestion < assessment.questions - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmitAssessment = () => {
    setIsActive(false);
    
    // Calculate score
    const correctAnswers = answers.filter((answer, index) => {
      const question = mockQuestions[index];
      return answer === question?.correctAnswer;
    }).length;
    
    const score = Math.round((correctAnswers / assessment.questions) * 100);
    const confidenceLevel = Math.max(60, score - Math.random() * 20);
    
    setFinalScore(score);
    setConfidence(Math.round(confidenceLevel));
    setShowResults(true);
  };

  const handleRetakeAssessment = () => {
    setShowResults(false);
    setCurrentQuestion(0);
    setAnswers(new Array(assessment.questions).fill(null));
    setTimeRemaining(assessment.timeLimit ? assessment.timeLimit * 60 : 0);
    setIsActive(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentMockQuestion = mockQuestions[currentQuestion];
  const progressPercentage = ((currentQuestion + 1) / assessment.questions) * 100;

  if (showResults) {
    const passed = finalScore >= assessment.passingScore;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                passed ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {passed ? (
                  <CheckCircle className="h-12 w-12 text-white" />
                ) : (
                  <XCircle className="h-12 w-12 text-white" />
                )}
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {passed ? 'Congratulations! 🎉' : 'Assessment Complete'}
              </h1>
              <p className="text-lg text-gray-600">
                {passed 
                  ? 'You have successfully passed this assessment!'
                  : 'You can review your answers and retake the assessment.'
                }
              </p>
            </div>

            {/* Results Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8 shadow-lg">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Assessment Results</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
                  <Award className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-blue-600 mb-1">{finalScore}%</div>
                  <div className="text-sm text-gray-600">Your Score</div>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                  <Target className="h-10 w-10 text-green-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-green-600 mb-1">{assessment.passingScore}%</div>
                  <div className="text-sm text-gray-600">Passing Score</div>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl">
                  <Brain className="h-10 w-10 text-purple-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-purple-600 mb-1">{confidence}%</div>
                  <div className="text-sm text-gray-600">Confidence</div>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                  <Clock className="h-10 w-10 text-amber-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-amber-600 mb-1">
                    {assessment.attempts + 1}
                  </div>
                  <div className="text-sm text-gray-600">Attempt</div>
                </div>
              </div>

              {/* Performance Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Performance Breakdown</h3>
                  <div className="space-y-3">
                    {['Customer Success Fundamentals', 'Regulatory Compliance', 'Contact Centre Excellence'].map((category, index) => {
                      const categoryScore = Math.floor(Math.random() * 30) + 70;
                      return (
                        <div key={category}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700">{category}</span>
                            <span className="font-medium">{categoryScore}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                categoryScore >= 80 ? 'bg-green-500' :
                                categoryScore >= 70 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${categoryScore}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">AI Recommendations</h3>
                  <div className="space-y-3">
                    {passed ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-900">Excellent Performance</span>
                        </div>
                        <p className="text-green-700 text-sm">
                          You demonstrated strong understanding across all areas. Ready for advanced modules.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-amber-600" />
                          <span className="font-medium text-amber-900">Areas for Improvement</span>
                        </div>
                        <p className="text-amber-700 text-sm">
                          Focus on regulatory compliance concepts before retaking. Review modules 2-3.
                        </p>
                      </div>
                    )}
                    
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Brain className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">Learning Style</span>
                      </div>
                      <p className="text-blue-700 text-sm">
                        Your responses indicate strong analytical thinking. Consider advanced scenario-based training.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 mt-8">
              <button
                onClick={() => setShowReview(true)}
                className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>Review Answers</span>
              </button>
              
              {!passed && assessment.attempts < assessment.maxAttempts && (
                <button
                  onClick={handleRetakeAssessment}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Retake Assessment</span>
                </button>
              )}
              
              <button
                onClick={() => onComplete(finalScore)}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Continue Learning</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-8">
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{assessment.title}</h1>
                <p className="text-gray-600">{assessment.description}</p>
              </div>
            </div>

            {/* Assessment Overview */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Ready to Begin Assessment?</h2>
                <p className="text-gray-600">
                  This assessment will test your understanding of the training material.
                </p>
              </div>

              {/* Assessment Details */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="text-center p-6 bg-blue-50 rounded-xl">
                  <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600 mb-1">{assessment.questions}</div>
                  <div className="text-sm text-gray-600">Questions</div>
                </div>
                
                <div className="text-center p-6 bg-green-50 rounded-xl">
                  <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600 mb-1">{assessment.passingScore}%</div>
                  <div className="text-sm text-gray-600">Passing Score</div>
                </div>
                
                <div className="text-center p-6 bg-purple-50 rounded-xl">
                  <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600 mb-1">{assessment.timeLimit}</div>
                  <div className="text-sm text-gray-600">Minutes</div>
                </div>
                
                <div className="text-center p-6 bg-amber-50 rounded-xl">
                  <RefreshCw className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-amber-600 mb-1">{assessment.maxAttempts}</div>
                  <div className="text-sm text-gray-600">Max Attempts</div>
                </div>
              </div>

              {/* Previous Attempts */}
              {assessment.attempts > 0 && (
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Previous Attempts</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Attempt {assessment.attempts}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold ${
                        (assessment.score || 0) >= assessment.passingScore ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {assessment.score}%
                      </span>
                      <span className="text-gray-500">
                        ({(assessment.score || 0) >= assessment.passingScore ? 'Passed' : 'Failed'})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Assessment Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Assessment Features</h3>
                  <div className="space-y-2">
                    {assessment.aiProctoring && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Eye className="h-4 w-4 text-blue-500" />
                        <span>AI-powered proctoring enabled</span>
                      </div>
                    )}
                    {assessment.adaptiveQuestions && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Brain className="h-4 w-4 text-purple-500" />
                        <span>Adaptive question difficulty</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span>Timed assessment with progress saving</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <BarChart3 className="h-4 w-4 text-green-500" />
                      <span>Detailed performance analytics</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Tips for Success</h3>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2 text-sm text-gray-600">
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <span>Read each question carefully before answering</span>
                    </div>
                    <div className="flex items-start space-x-2 text-sm text-gray-600">
                      <Target className="h-4 w-4 text-blue-500 mt-0.5" />
                      <span>Use the process of elimination for difficult questions</span>
                    </div>
                    <div className="flex items-start space-x-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4 text-purple-500 mt-0.5" />
                      <span>Manage your time - about {Math.round(assessment.timeLimit! / assessment.questions)} minutes per question</span>
                    </div>
                    <div className="flex items-start space-x-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Review your answers before submitting</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={startAssessment}
                  disabled={assessment.attempts >= assessment.maxAttempts}
                  className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-lg shadow-lg mx-auto"
                >
                  <Award className="h-6 w-6" />
                  <span>
                    {assessment.attempts > 0 ? `Retake Assessment (${assessment.attempts}/${assessment.maxAttempts})` : 'Start Assessment'}
                  </span>
                </button>
                
                {assessment.attempts >= assessment.maxAttempts && (
                  <p className="text-red-600 text-sm mt-4">
                    Maximum attempts reached. Please contact your instructor for assistance.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Assessment Header */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
                <p className="text-gray-600">Question {currentQuestion + 1} of {assessment.questions}</p>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{formatTime(timeRemaining)}</div>
                  <div className="text-sm text-gray-600">Time Remaining</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{Math.round(progressPercentage)}%</div>
                  <div className="text-sm text-gray-600">Progress</div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6 shadow-lg">
            {currentMockQuestion && (
              <>
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                      {currentMockQuestion.category}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    {currentMockQuestion.text}
                  </h2>
                </div>

                <div className="space-y-3 mb-8">
                  {currentMockQuestion.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => answerQuestion(currentQuestion, index)}
                      className={`w-full text-left p-4 border-2 rounded-xl transition-all hover:shadow-sm ${
                        answers[currentQuestion] === index
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          answers[currentQuestion] === index
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {answers[currentQuestion] === index && (
                            <div className="w-3 h-3 bg-white rounded-full" />
                          )}
                        </div>
                        <span className="text-gray-900">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <button
                onClick={previousQuestion}
                disabled={currentQuestion === 0}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {answers.filter(a => a !== null).length} of {assessment.questions} answered
                </span>
                
                {currentQuestion === assessment.questions - 1 ? (
                  <button
                    onClick={handleSubmitAssessment}
                    disabled={answers.some(a => a === null)}
                    className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Submit Assessment</span>
                  </button>
                ) : (
                  <button
                    onClick={nextQuestion}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <span>Next</span>
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}