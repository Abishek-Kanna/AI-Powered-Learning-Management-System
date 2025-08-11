import sys
import os
import json
from ollama import Client

client = Client(host='http://localhost:11434')

def generate_quiz(text, num_questions=10):
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
    
    # --- START: New robust JSON cleaning logic ---
    content = response['message']['content']
    
    # Find the start and end of the JSON list
    json_start = content.find('[')
    json_end = content.rfind(']') + 1

    if json_start != -1 and json_end != -1:
        json_str = content[json_start:json_end]
        try:
            # Validate that the extracted string is valid JSON
            json.loads(json_str)
            return json_str
        except json.JSONDecodeError:
            print("ERROR: Failed to decode JSON from the model's response.", file=sys.stderr)
            return None
    else:
        print("ERROR: No valid JSON list found in the model's response.", file=sys.stderr)
        return None
    # --- END: New robust JSON cleaning logic ---


def main():
    if len(sys.argv) < 3:
        print("Usage: python quiz_generator.py <context_txt_path> <subject> [num_questions]", file=sys.stderr)
        sys.exit(1)
    
    context_path = sys.argv[1]
    subject = sys.argv[2]

    if not os.path.isfile(context_path):
        print(f"File not found: {context_path}", file=sys.stderr)
        sys.exit(1)

    with open(context_path, "r", encoding="utf-8") as f:
        text = f.read()

    num_questions = 10
    if len(sys.argv) >= 4:
        try:
            num_questions = int(sys.argv[3])
        except ValueError:
            pass

    print(f"Generating {num_questions} quiz questions using Gemma3...")
    quiz_json = generate_quiz(text, num_questions=num_questions)

    # If quiz generation failed, exit gracefully
    if quiz_json is None:
        sys.exit(1)

    output_dir = os.path.join("generated_quizzes", subject)
    os.makedirs(output_dir, exist_ok=True)
    
    base_name = os.path.splitext(os.path.basename(context_path))[0].replace('_llama_context', '')
    output_path = os.path.join(output_dir, f"{base_name}_quiz.json")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(quiz_json)

    print(f"Quiz saved to: {output_path}")

if __name__ == "__main__":
    main()