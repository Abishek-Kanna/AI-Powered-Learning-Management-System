import sys
import os
import json
import time
from ollama import Client

# Test Ollama connection
try:
    client = Client(host='http://localhost:11434')
    print("Ollama connection successful")
except Exception as e:
    print(f"Failed to connect to Ollama: {e}")
    sys.exit(1)

def load_quiz_and_user_answers(quiz_path, user_answers_path):
    with open(quiz_path, 'r', encoding='utf-8') as f:
        quiz_data = json.load(f)

    with open(user_answers_path, 'r', encoding='utf-8') as f:
        user_answers_data = json.load(f)

    # Extract the answers array from the user answers data
    user_answers = user_answers_data.get('answers', [])
    
    return quiz_data, user_answers  # Return the full answer objects

def explain_wrong_answers(quiz_data, user_answers):
    wrong_questions = []
    
    for i, (q, user_ans_obj) in enumerate(zip(quiz_data, user_answers)):
        user_selected_answer = user_ans_obj.get('selectedAnswer', '')
        is_correct = user_ans_obj.get('isCorrect', False)
        
        # Only explain wrong answers
        if not is_correct:
            wrong_questions.append({
                "index": i + 1,
                "question": q["question"],
                "user_answer": user_selected_answer,
                "correct_answer": q["answer"],  # This is the letter (A, B, C, D)
                "options": q["options"]
            })

    explanations = []
    for q in wrong_questions:
        # Get the actual text of the correct answer
        correct_answer_text = q['options'].get(q['correct_answer'], 'Unknown')
        user_answer_text = q['user_answer'] if q['user_answer'] else 'No answer provided'
        
        prompt = f"""
You are an AI tutor helping a student who got the following multiple-choice question wrong.

Question:
{q['question']}

Options:
A) {q['options']['A']}
B) {q['options']['B']}
C) {q['options']['C']}
D) {q['options']['D']}

Student's Answer: {user_answer_text}
Correct Answer: {q['correct_answer']}) {correct_answer_text}

Provide a clear explanation of why the correct answer is right and why the student's answer is wrong. 
Explain the underlying concept in a simple, easy-to-understand way.
"""
        try:
            response = client.chat(model="gemma3", messages=[  # Using gemma3 as you specified
                {"role": "user", "content": prompt}
            ])
            explanation = response["message"]["content"]
            q["explanation"] = explanation.strip()
            explanations.append(q)
        except Exception as e:
            print(f"Error generating explanation for question {q['index']}: {e}")
            q["explanation"] = "Sorry, I couldn't generate an explanation for this question at the moment."
            explanations.append(q)

    return explanations

def main():
    if len(sys.argv) != 3:
        print("Usage: python ai_tutor.py <quiz_json_path> <user_answers_json_path>")
        sys.exit(1)
    
    quiz_path = sys.argv[1]
    user_answers_path = sys.argv[2]

    print(f"Quiz path: {quiz_path}")
    print(f"User answers path: {user_answers_path}")
    
    if not os.path.isfile(quiz_path):
        print(f"Quiz file not found: {quiz_path}")
        sys.exit(1)
        
    if not os.path.isfile(user_answers_path):
        print(f"User answers file not found: {user_answers_path}")
        sys.exit(1)

    print("Loading quiz and user answers...")
    try:
        quiz_data, user_answers = load_quiz_and_user_answers(quiz_path, user_answers_path)
    except Exception as e:
        print(f"Error loading files: {e}")
        sys.exit(1)

    print("Analyzing wrong answers and generating explanations...")
    explanations = explain_wrong_answers(quiz_data, user_answers)

    # Create output folder
    os.makedirs("tutor_explanations", exist_ok=True)

    # Use base filename with timestamp to avoid conflicts
    base_name = os.path.splitext(os.path.basename(quiz_path))[0]
    timestamp = int(time.time())
    output_path = os.path.join("tutor_explanations", f"{base_name}_{timestamp}_tutor_explanations.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(explanations, f, indent=2, ensure_ascii=False)

    print(f"Explanations saved to: {output_path}")
    print(f"Generated explanations for {len(explanations)} wrong answers.")

if __name__ == "__main__":
    main()