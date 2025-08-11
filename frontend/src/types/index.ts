// 📚 Flashcard type
export interface Flashcard {
  question: string;
  answer: string;
}

// ✅ Quiz-related types
export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string; // correct answer
}

export interface UserAnswer {
  questionIndex: number;
  selectedOption: string;
}

export interface QuizResult {
  score: number;
  total: number;
  wrongAnswers: WrongAnswerExplanation[];
}

export interface WrongAnswerExplanation {
  index: number;
  question: string;
  correct_answer: string;
  explanation: string;
  options: string[];
}

// 👤 User type (for Auth)
export interface User {
  id: string;
  name: string;
  role: 'student' | 'teacher';
  email: string;
}

// 📄 Study material block (used in labeled JSON)
export interface LabeledBlock {
  id: string;
  type: string; // e.g., "definition", "concept", "example", etc.
  content: string;
  label?: string;
}
