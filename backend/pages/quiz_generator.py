import sys
import os
from ollama import Client

client = Client(host='http://localhost:11434')

def generate_quiz(text, num_questions=10):
    # This function is correct, no changes needed.
    prompt = f"""
You are an expert education assistant.
Generate a quiz with {num_questions} multiple choice questions based on the educational content below.
For each, provide:
- The question text
- Four answer options labeled A, B, C, D
- The correct answer letter

Content:
{text}

Respond ONLY in JSON format as a list of dicts. Each dict should have:
- "question" (str)
- "options" (dict with keys 'A', 'B', 'C', 'D')
- "answer" (str, one of 'A', 'B', 'C', 'D').
    """
    response = client.chat(model="gemma3", messages=[
        {"role": "user", "content": prompt}
    ])
    
    content = response['message']['content'].strip()
    if content.startswith("```json"):
        content = content.replace("```json", "").strip()
    if content.endswith("```"):
        content = content[:-3].strip()

    return content

def main():
    # UPDATED: Now expects 3 arguments
    if len(sys.argv) < 3:
        print("Usage: python quiz_generator.py <context_txt_path> <subject> [num_questions]")
        sys.exit(1)
    
    context_path = sys.argv[1]
    subject = sys.argv[2] # The subject is now an argument

    if not os.path.isfile(context_path):
        print(f"File not found: {context_path}")
        sys.exit(1)

    with open(context_path, "r", encoding="utf-8") as f:
        text = f.read()

    num_questions = 10
    if len(sys.argv) >= 4:
        try:
            num_questions = int(sys.argv[3])
        except ValueError:
            print("Invalid num_questions value, using default (10).")

    print(f"Generating {num_questions} quiz questions using Gemma3...")
    quiz_json = generate_quiz(text, num_questions=num_questions)

    # UPDATED: Output path now includes the subject subfolder
    output_dir = os.path.join("generated_quizzes", subject)
    os.makedirs(output_dir, exist_ok=True)
    
    base_name = os.path.splitext(os.path.basename(context_path))[0].replace('_llama_context', '')
    output_path = os.path.join(output_dir, f"{base_name}_quiz.json")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(quiz_json)

    print(f"Quiz saved to: {output_path}")

if __name__ == "__main__":
    main()