import React from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle, Award } from 'lucide-react';
import { Assessment } from '../../types';
import { useAssessment } from '../../hooks/useAssessment';

interface AssessmentCenterProps {
  assessments: Assessment[];
  onAssessmentComplete?: (assessmentId: string, result: Assessment) => void;
}

export default function AssessmentCenter({ assessments, onAssessmentComplete }: AssessmentCenterProps) {
  const { session, startAssessment, answerQuestion, nextQuestion, previousQuestion, submitAssessment } = useAssessment();

  const handleStartAssessment = (assessment: Assessment) => {
    if (assessment.attempts < assessment.maxAttempts || assessment.status === 'not-started') {
      startAssessment(assessment);
    }
  };

  const handleSubmitAssessment = () => {
    const result = submitAssessment();
    if (result && onAssessmentComplete) {
      onAssessmentComplete(result.id, result);
    }
  };

  // If there's an active assessment session, show the assessment interface
  if (session) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{session.assessment.title}</h2>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Question {session.currentQuestion + 1} of {session.assessment.questions}
              </div>
              <div className="text-sm text-gray-600">
                Time: {Math.floor(session.timeRemaining / 60)}:{(session.timeRemaining % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((session.currentQuestion + 1) / session.assessment.questions) * 100}%` }}
              />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Sample Question {session.currentQuestion + 1}
            </h3>
            <p className="text-gray-700 mb-6">
              What is the most important factor in customer success?
            </p>
            
            <div className="space-y-3">
              {['Understanding customer needs', 'Product knowledge', 'Communication skills', 'All of the above'].map((option, index) => (
                <button
                  key={index}
                  onClick={() => answerQuestion(session.currentQuestion, index)}
                  className={`w-full text-left p-4 border rounded-lg transition-colors ${
                    session.answers[session.currentQuestion] === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      session.answers[session.currentQuestion] === index
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {session.answers[session.currentQuestion] === index && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                      )}
                    </div>
                    <span>{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={previousQuestion}
              disabled={session.currentQuestion === 0}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            <div className="flex space-x-3">
              {session.currentQuestion < session.assessment.questions - 1 ? (
                <button
                  onClick={nextQuestion}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next Question
                </button>
              ) : (
                <button
                  onClick={handleSubmitAssessment}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Submit Assessment
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string, score?: number, passingScore?: number) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Award className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      case 'in-progress':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getButtonStyle = (status: string, attempts: number, maxAttempts: number) => {
    if (status === 'passed') {
      return 'bg-green-50 text-green-700 hover:bg-green-100';
    }
    if (status === 'failed' && attempts >= maxAttempts) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }
    if (status === 'in-progress') {
      return 'bg-blue-600 text-white hover:bg-blue-700';
    }
    return 'bg-blue-600 text-white hover:bg-blue-700';
  };

  const getButtonText = (status: string, attempts: number, maxAttempts: number) => {
    if (status === 'passed') return 'View Results';
    if (status === 'failed' && attempts >= maxAttempts) return 'Max Attempts Reached';
    if (status === 'in-progress') return 'Continue Assessment';
    if (attempts > 0) return `Retake (${attempts}/${maxAttempts})`;
    return 'Start Assessment';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Assessment Center</h1>
        <div className="text-sm text-gray-600">
          {assessments.filter(a => a.status === 'passed').length} of {assessments.length} passed
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {assessments.map((assessment) => (
          <div
            key={assessment.id}
            className={`rounded-lg border p-6 transition-all hover:shadow-sm ${getStatusColor(assessment.status)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon(assessment.status, assessment.score, assessment.passingScore)}
                <span className="text-sm font-medium text-gray-600">Assessment</span>
              </div>
              {assessment.status === 'failed' && assessment.attempts >= assessment.maxAttempts && (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">{assessment.title}</h3>
            <p className="text-gray-600 mb-4">{assessment.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-500">Questions:</span>
                <span className="ml-2 font-medium">{assessment.questions}</span>
              </div>
              <div>
                <span className="text-gray-500">Passing Score:</span>
                <span className="ml-2 font-medium">{assessment.passingScore}%</span>
              </div>
              <div>
                <span className="text-gray-500">Attempts:</span>
                <span className="ml-2 font-medium">{assessment.attempts}/{assessment.maxAttempts}</span>
              </div>
              {assessment.score !== undefined && (
                <div>
                  <span className="text-gray-500">Your Score:</span>
                  <span className={`ml-2 font-medium ${
                    assessment.score >= assessment.passingScore ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {assessment.score}%
                  </span>
                </div>
              )}
            </div>

            {assessment.status === 'passed' && (
              <div className="bg-green-100 border border-green-200 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">
                    Congratulations! You passed this assessment.
                  </span>
                </div>
              </div>
            )}

            {assessment.status === 'failed' && (
              <div className="bg-red-100 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800">
                    {assessment.attempts >= assessment.maxAttempts
                      ? 'Maximum attempts reached. Please contact your supervisor.'
                      : 'You can retake this assessment. Review the material and try again.'
                    }
                  </span>
                </div>
              </div>
            )}

            <button
              disabled={assessment.status === 'failed' && assessment.attempts >= assessment.maxAttempts}
              onClick={() => handleStartAssessment(assessment)}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${getButtonStyle(
                assessment.status,
                assessment.attempts,
                assessment.maxAttempts
              )}`}
            >
              {getButtonText(assessment.status, assessment.attempts, assessment.maxAttempts)}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}