import React, { useState } from 'react';
import { useQuizGenerator } from '../hooks/useQuizGenerator';
import {
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizSectionProps {
  topic: string;
  onComplete: (score: number) => void;
}

export const QuizSection: React.FC<QuizSectionProps> = ({ topic, onComplete }) => {
  const {
    generateQuiz,
    checkAnswer,
    getExplanation,
    currentQuiz,
    isGenerating,
    error
  } = useQuizGenerator();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const handleStartQuiz = async () => {
    await generateQuiz(topic);
    setCurrentQuestionIndex(0);
    setScore(0);
    setQuizCompleted(false);
  };

  const handleAnswerSelect = (answer: string) => {
    if (showExplanation) return;
    setSelectedAnswer(answer);
    setShowExplanation(true);

    const isCorrect = checkAnswer(currentQuestionIndex, answer);
    if (isCorrect) setScore(prev => prev + 1);
  };

  const handleNextQuestion = () => {
    if (!currentQuiz) return;

    setSelectedAnswer(null);
    setShowExplanation(false);

    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setQuizCompleted(true);
      onComplete(score);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4 text-red-700">
        <p>{error}</p>
        <button
          onClick={handleStartQuiz}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-2">Generating quiz...</span>
      </div>
    );
  }

  if (!currentQuiz) {
    return (
      <div className="text-center p-8">
        <GraduationCap className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-4">Ready to test your knowledge?</h3>
        <button
          onClick={handleStartQuiz}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Start Quiz
        </button>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="text-center p-8">
        <div className="mb-4">
          <Brain className="w-16 h-16 text-indigo-600 mx-auto" />
          <h3 className="text-2xl font-semibold mt-4">Quiz Completed!</h3>
          <p className="text-lg text-gray-600 mt-2">
            Your score: {score}/{currentQuiz.questions.length}
          </p>
        </div>
        <button
          onClick={handleStartQuiz}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const currentQuestion = currentQuiz.questions[currentQuestionIndex];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">
          Question {currentQuestionIndex + 1}/{currentQuiz.questions.length}
        </h3>
        <span className="text-gray-600">Score: {score}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white rounded-lg p-6 shadow-md"
        >
          <p className="text-lg mb-4">{currentQuestion.question}</p>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                disabled={showExplanation}
                className={`w-full p-4 rounded-lg text-left transition ${
                  showExplanation
                    ? option === currentQuestion.correctAnswer
                      ? 'bg-green-100 text-green-700'
                      : option === selectedAnswer
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-50 text-gray-700'
                    : selectedAnswer === option
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  {showExplanation && option === currentQuestion.correctAnswer && (
                    <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
                  )}
                  {showExplanation && option === selectedAnswer && option !== currentQuestion.correctAnswer && (
                    <XCircle className="w-5 h-5 mr-2 text-red-600" />
                  )}
                  {option}
                </div>
              </button>
            ))}
          </div>

          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-4 bg-blue-50 rounded-lg"
            >
              <p className="text-blue-700">{getExplanation(currentQuestionIndex)}</p>
              <button
                onClick={handleNextQuestion}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {currentQuestionIndex < currentQuiz.questions.length - 1 ? 'Next Question' : 'Complete Quiz'}
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}; 