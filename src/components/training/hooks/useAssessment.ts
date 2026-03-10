import { useState, useCallback } from 'react';
import { Assessment, Quiz } from '../types';

export interface AssessmentSession {
  assessment: Assessment;
  currentQuestion: number;
  answers: (number | null)[];
  timeRemaining: number;
  isActive: boolean;
  score?: number;
}

export const useAssessment = () => {
  const [session, setSession] = useState<AssessmentSession | null>(null);

  const startAssessment = useCallback((assessment: Assessment) => {
    const questions = generateQuestions(assessment.questions, assessment.adaptiveQuestions);
    
    setSession({
      assessment: {
        ...assessment,
        status: 'in-progress',
      },
      currentQuestion: 0,
      answers: new Array(assessment.questions).fill(null),
      timeRemaining: assessment.timeLimit * 60, // Convert to seconds
      isActive: true,
    });

    // Start timer
    const timer = setInterval(() => {
      setSession(prev => {
        if (!prev || prev.timeRemaining <= 0) {
          clearInterval(timer);
          return prev;
        }
        return {
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        };
      });
    }, 1000);
  }, []);

  const answerQuestion = useCallback((questionIndex: number, answer: number) => {
    setSession(prev => {
      if (!prev) return null;
      
      const newAnswers = [...prev.answers];
      newAnswers[questionIndex] = answer;
      
      return {
        ...prev,
        answers: newAnswers,
      };
    });
  }, []);

  const nextQuestion = useCallback(() => {
    setSession(prev => {
      if (!prev) return null;
      
      const nextIndex = prev.currentQuestion + 1;
      if (nextIndex >= prev.assessment.questions) {
        return prev; // Stay on last question
      }
      
      return {
        ...prev,
        currentQuestion: nextIndex,
      };
    });
  }, []);

  const previousQuestion = useCallback(() => {
    setSession(prev => {
      if (!prev) return null;
      
      const prevIndex = Math.max(0, prev.currentQuestion - 1);
      
      return {
        ...prev,
        currentQuestion: prevIndex,
      };
    });
  }, []);

  const submitAssessment = useCallback(() => {
    if (!session) return null;

    const score = calculateScore(session.answers);
    const passed = score >= session.assessment.passingScore;
    
    const result = {
      ...session.assessment,
      score,
      status: passed ? 'passed' : 'failed' as const,
      attempts: session.assessment.attempts + 1,
    };

    setSession(null);
    return result;
  }, [session]);

  const generateQuestions = (count: number, adaptive: boolean): Quiz[] => {
    // In a real implementation, this would fetch from an API or generate based on content
    const sampleQuestions: Quiz[] = [
      {
        id: '1',
        question: 'What is the primary goal of customer success?',
        options: [
          'Increase sales revenue',
          'Ensure customer satisfaction and retention',
          'Reduce support tickets',
          'Improve product features'
        ],
        correctAnswer: 1,
        explanation: 'Customer success focuses on ensuring customers achieve their desired outcomes.',
        difficulty: 4,
        aiGenerated: true,
      },
      {
        id: '2',
        question: 'Which metric best indicates customer health?',
        options: [
          'Support ticket count',
          'Product usage frequency',
          'Customer satisfaction score',
          'All of the above'
        ],
        correctAnswer: 3,
        explanation: 'A combination of metrics provides the best view of customer health.',
        difficulty: 6,
        aiGenerated: true,
      },
    ];

    return sampleQuestions.slice(0, count);
  };

  const calculateScore = (answers: (number | null)[]): number => {
    const correctAnswers = answers.filter((answer, index) => {
      // In a real implementation, this would check against actual correct answers
      return answer !== null && Math.random() > 0.3; // Simulate 70% correct rate
    }).length;

    return Math.round((correctAnswers / answers.length) * 100);
  };

  return {
    session,
    startAssessment,
    answerQuestion,
    nextQuestion,
    previousQuestion,
    submitAssessment,
  };
};