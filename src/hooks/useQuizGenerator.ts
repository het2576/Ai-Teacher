import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface Quiz {
  topic: string;
  questions: QuizQuestion[];
}

export const useQuizGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateQuiz = async (topic: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<Quiz | null> => {
    try {
      setIsGenerating(true);
      setError(null);

      const prompt = `Generate a ${difficulty} level quiz about "${topic}" with 5 multiple choice questions.
      Format the response as a JSON object with the following structure:
      {
        "topic": "the quiz topic",
        "questions": [
          {
            "question": "the question text",
            "options": ["option1", "option2", "option3", "option4"],
            "correctAnswer": "the correct option",
            "explanation": "explanation why this is correct"
          }
        ]
      }`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid quiz format generated');
      
      const quiz = JSON.parse(jsonMatch[0]);
      setCurrentQuiz(quiz);
      return quiz;
    } catch (err) {
      console.error('Quiz generation failed:', err);
      setError('Failed to generate quiz. Please try again.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const checkAnswer = (questionIndex: number, selectedAnswer: string): boolean => {
    if (!currentQuiz) return false;
    return currentQuiz.questions[questionIndex].correctAnswer === selectedAnswer;
  };

  const getExplanation = (questionIndex: number): string => {
    if (!currentQuiz) return '';
    return currentQuiz.questions[questionIndex].explanation;
  };

  return {
    generateQuiz,
    checkAnswer,
    getExplanation,
    currentQuiz,
    isGenerating,
    error
  };
}; 
