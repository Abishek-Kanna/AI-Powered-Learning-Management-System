import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface Explanation {
  index: number;
  question: string;
  correct_answer: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  explanation: string;
}

const TutorInterface: React.FC = () => {
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🧠 You should replace this path with a dynamic one based on the user or selected quiz
    fetch('/tutor_explanations/sample_tutor_explanations.json')
      .then((res) => res.json())
      .then((data) => {
        setExplanations(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load explanations:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4">Loading tutor explanations...</div>;
  if (explanations.length === 0) return <div className="p-4">✅ No incorrect answers to explain!</div>;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">🤖 AI Tutor Feedback</h1>

      {explanations.map((explanation) => (
        <Card key={explanation.index}>
          <CardContent className="p-5 space-y-2">
            <h2 className="font-semibold text-lg">Q{explanation.index}. {explanation.question}</h2>
            <ul className="list-disc list-inside text-sm ml-4">
              {Object.entries(explanation.options).map(([key, value]) => (
                <li key={key} className={key === explanation.correct_answer ? 'font-semibold text-green-600' : ''}>
                  <strong>{key}.</strong> {value}
                </li>
              ))}
            </ul>
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">
                ✅ <strong>Correct Answer:</strong> {explanation.correct_answer}
              </p>
              <p className="mt-2 text-sm">{explanation.explanation}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TutorInterface;
