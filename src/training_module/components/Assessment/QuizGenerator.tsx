import React, { useState } from 'react';
import { CheckCircle, XCircle, FileQuestion, RefreshCw, Loader2, Play } from 'lucide-react';
import { AIService } from '../../infrastructure/services/AIService';

interface QuizQuestion {
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizGeneratorProps {
  moduleTitle: string;
  moduleDescription: string;
  moduleContent?: string;
}

export default function QuizGenerator({ moduleTitle, moduleDescription, moduleContent }: QuizGeneratorProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const generateQuiz = async () => {
    setIsGenerating(true);
    try {
      const content = moduleContent || `${moduleTitle}: ${moduleDescription}`;
      console.log('📝 Generating quiz questions...');
      
      const response = await AIService.generateQuiz(content, 5);
      setQuestions(response);
      setSelectedAnswers(new Array(response.length).fill(null));
      console.log('✅ Quiz generated:', response.length, 'questions');
    } catch (error) {
      console.error('❌ Error generating quiz:', error);
      // Fallback: Generate sample questions
      const fallbackQuestions: QuizQuestion[] = [
        {
          text: `What is the main objective of ${moduleTitle}?`,
          options: [
            'To understand basic concepts',
            'To master advanced techniques',
            'To complete the training',
            'All of the above'
          ],
          correctAnswer: 3,
          explanation: 'The module covers multiple objectives including understanding concepts and mastering techniques.'
        },
        {
          text: 'Which skill is most important in this module?',
          options: [
            'Technical knowledge',
            'Practical application',
            'Problem solving',
            'All are equally important'
          ],
          correctAnswer: 3,
          explanation: 'All skills complement each other for effective learning.'
        },
        {
          text: 'What is the best approach to learn this content?',
          options: [
            'Practice regularly',
            'Read theory only',
            'Watch videos only',
            'Skip to assessment'
          ],
          correctAnswer: 0,
          explanation: 'Regular practice helps reinforce learning and build competency.'
        }
      ];
      
      setQuestions(fallbackQuestions);
      setSelectedAnswers(new Array(fallbackQuestions.length).fill(null));
      console.log('⚠️ Using fallback quiz questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const startQuiz = () => {
    setIsStarted(true);
    setCurrentQuestion(0);
    setShowResults(false);
    setScore(0);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const submitQuiz = () => {
    let correctCount = 0;
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correctCount++;
      }
    });
    setScore(Math.round((correctCount / questions.length) * 100));
    setShowResults(true);
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
        <FileQuestion className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Quiz Assessment</h3>
        <p className="text-gray-600 mb-6">
          Generate AI-powered quiz questions for {moduleTitle}
        </p>
        <button
          onClick={generateQuiz}
          disabled={isGenerating}
          className="flex items-center justify-center mx-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Generating Quiz...
            </>
          ) : (
            <>
              <FileQuestion className="h-5 w-5 mr-2" />
              Generate Quiz
            </>
          )}
        </button>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="text-center mb-6">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Quiz Ready!</h3>
          <p className="text-gray-600">
            {questions.length} questions generated for {moduleTitle}
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={startQuiz}
            className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Play className="h-5 w-5 mr-2" />
            Start Quiz
          </button>
          <button
            onClick={generateQuiz}
            disabled={isGenerating}
            className="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Regenerate
          </button>
        </div>
      </div>
    );
  }

  if (showResults) {
    const passed = score >= 70;
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="text-center mb-6">
          {passed ? (
            <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-4" />
          ) : (
            <XCircle className="h-20 w-20 text-red-600 mx-auto mb-4" />
          )}
          <h3 className="text-3xl font-bold text-gray-900 mb-2">
            {passed ? 'Congratulations!' : 'Keep Learning!'}
          </h3>
          <div className="text-5xl font-bold text-indigo-600 mb-2">{score}%</div>
          <p className="text-gray-600">
            You got {questions.filter((q, i) => selectedAnswers[i] === q.correctAnswer).length} out of {questions.length} questions correct
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {questions.map((q, index) => {
            const isCorrect = selectedAnswers[index] === q.correctAnswer;
            return (
              <div key={index} className={`p-4 rounded-lg border-2 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-2">Question {index + 1}: {q.text}</p>
                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Your answer:</strong> {selectedAnswers[index] !== null ? q.options[selectedAnswers[index]!] : 'No answer'}
                    </p>
                    {!isCorrect && (
                      <p className="text-sm text-gray-700 mb-1">
                        <strong>Correct answer:</strong> {q.options[q.correctAnswer]}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 italic">{q.explanation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              setIsStarted(false);
              setShowResults(false);
              setSelectedAnswers(new Array(questions.length).fill(null));
            }}
            className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Retake Quiz
          </button>
          <button
            onClick={generateQuiz}
            className="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            New Quiz
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const canSubmit = selectedAnswers.every(a => a !== null);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <span className="text-sm text-gray-600">
            {selectedAnswers.filter(a => a !== null).length} answered
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">{currentQ.text}</h3>
        <div className="space-y-3">
          {currentQ.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedAnswers[currentQuestion] === index
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-300 hover:border-indigo-400 bg-white'
              }`}
            >
              <div className="flex items-center">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                    selectedAnswers[currentQuestion] === index
                      ? 'border-indigo-600 bg-indigo-600'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedAnswers[currentQuestion] === index && (
                    <div className="w-3 h-3 rounded-full bg-white" />
                  )}
                </div>
                <span className="font-medium">{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={previousQuestion}
          disabled={currentQuestion === 0}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        {currentQuestion === questions.length - 1 ? (
          <button
            onClick={submitQuiz}
            disabled={!canSubmit}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Submit Quiz
          </button>
        ) : (
          <button
            onClick={nextQuestion}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

