import sys
import os
import json
import time
from ollama import Client
from db import db
from bson import ObjectId

try:
    client = Client(host='http://localhost:11434')
except Exception as e:
    print(f"Failed to connect to Ollama: {e}", file=sys.stderr)
    sys.exit(1)

def load_data_from_db(material_id, user_answers_path):
    # This function remains unchanged
    material = db.materials.find_one({"_id": ObjectId(material_id)}) #
    if not material:
        raise ValueError(f"Material with ID {material_id} not found in the database.")
    
    quiz_data = material.get('quiz_content') #
    if not quiz_data:
        raise ValueError(f"Quiz content not found in material {material_id}.")

    with open(user_answers_path, 'r', encoding='utf-8') as f:
        user_answers_data = json.load(f)
    
    user_answers = user_answers_data.get('answers', [])
    return material, quiz_data, user_answers

def explain_wrong_answers(quiz_data, user_answers):
    # This function remains unchanged
    wrong_questions = []
    for user_ans_obj in user_answers:
        if not user_ans_obj.get('isCorrect', False):
            q_index = user_ans_obj.get('questionIndex')
            if q_index is not None and 0 <= q_index < len(quiz_data):
                q = quiz_data[q_index]
                wrong_questions.append({
                    "index": q_index + 1,
                    "question": q["question"],
                    "user_answer": user_ans_obj.get('selectedOption'),
                    "correct_answer": q["answer"],
                    "options": q["options"]
                })

    explanations = []
    for q in wrong_questions:
        correct_answer_text = q['options'].get(q['correct_answer'], 'Unknown')
        user_answer_text = q['options'].get(q['user_answer'], 'No answer provided')
        
        prompt = f"""You are an AI tutor. A student got this question wrong.
Question: {q['question']}
Options:
A) {q['options']['A']}
B) {q['options']['B']}
C) {q['options']['C']}
D) {q['options']['D']}

Student's Answer: {q['user_answer']}) {user_answer_text}
Correct Answer: {q['correct_answer']}) {correct_answer_text}

Provide a clear explanation for why the correct answer is right and the student's answer is wrong. Do not use Markdown, asterisks, or any other formatting characters. Your entire response must be in plain text."""
        
        try:
            response = client.chat(model="gemma3", messages=[{"role": "user", "content": prompt}])
            q["explanation"] = response["message"]["content"].strip()
            explanations.append(q)
        except Exception as e:
            print(f"Error generating explanation for question {q['index']}: {e}", file=sys.stderr)
            q["explanation"] = "An error occurred while generating the explanation."
            explanations.append(q)
    return explanations

def main():
    # --- CHANGE 1: Expect a 4th argument (3 from Node + script name) ---
    if len(sys.argv) != 4:
        print("Usage: python ai_tutor.py <material_id> <user_answers_json_path> <attempt_id>", file=sys.stderr) #
        sys.exit(1)
    
    material_id = sys.argv[1]
    user_answers_path = sys.argv[2]
    # --- CHANGE 2: Get the attempt_id from the new argument ---
    attempt_id = sys.argv[3]
    
    if not os.path.isfile(user_answers_path):
        print(f"User answers file not found: {user_answers_path}", file=sys.stderr)
        sys.exit(1)

    try:
        material, quiz_data, user_answers = load_data_from_db(material_id, user_answers_path)
    except Exception as e:
        print(f"Error loading data: {e}", file=sys.stderr)
        sys.exit(1)

    explanations = explain_wrong_answers(quiz_data, user_answers)

    base_name = os.path.splitext(material.get("filename", "unknown_file"))[0] #
    output_dir = "tutor_explanations"
    os.makedirs(output_dir, exist_ok=True)
    # --- CHANGE 3: Use the attempt_id in the output filename ---
    output_path = os.path.join(output_dir, f"{base_name}_{attempt_id}_tutor_explanations.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(explanations, f, indent=2, ensure_ascii=False)

    print(f"Explanations saved to: {output_path}")

if __name__ == "__main__":
    try:
        client = Client(host='http://localhost:11434')
        main()
    except Exception as e:
        import traceback
        print(f"A critical error occurred in ai_tutor.py: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)