import sys
import os
import json
from ollama import Client

client = Client(host='http://localhost:11434')

def generate_flashcards(text, num_flashcards=10):
    prompt = f"""
You are a helpful education assistant.

Based on the educational content below, generate {num_flashcards} flashcards.
Each flashcard should include:
- A concise question (like a concept, term, or key idea)
- A brief but informative answer or explanation

Content:
{text}

Respond ONLY in JSON format as a list of dicts. Each dict should have:
- "question" (str)
- "answer" (str)
    """
    response = client.chat(model="gemma3", messages=[
        {"role": "user", "content": prompt}
    ])

    content = response['message']['content']
    
    json_start = content.find('[')
    json_end = content.rfind(']') + 1

    if json_start != -1 and json_end != -1:
        json_str = content[json_start:json_end]
        try:
            json.loads(json_str)
            return json_str
        except json.JSONDecodeError:
            print("ERROR: Failed to decode JSON from the model's response.", file=sys.stderr)
            return None
    else:
        print("ERROR: No valid JSON list found in the model's response.", file=sys.stderr)
        return None

def main():
    # --- CHANGE 1: Update argument handling to require a subject ---
    if len(sys.argv) < 3:
        print("Usage: python flashcard_generator.py <context_txt_path> <subject> [num_flashcards]", file=sys.stderr)
        sys.exit(1)
    
    context_path = sys.argv[1]
    subject = sys.argv[2] # Get the subject from the new argument

    if not os.path.isfile(context_path):
        print(f"File not found: {context_path}", file=sys.stderr)
        sys.exit(1)

    with open(context_path, "r", encoding="utf-8") as f:
        text = f.read()

    num_flashcards = 10
    if len(sys.argv) >= 4: # Optional num_flashcards is now the 4th argument
        try:
            num_flashcards = int(sys.argv[3])
        except ValueError:
            pass

    print(f"Generating {num_flashcards} flashcards for subject '{subject}' using Gemma3...")
    flashcard_json = generate_flashcards(text, num_flashcards=num_flashcards)

    if flashcard_json is None:
        sys.exit(1)

    # --- CHANGE 2: Use the subject to build the correct output path ---
    # The output directory now includes the subject subfolder
    output_dir = os.path.join("generated_flashcards", subject)
    os.makedirs(output_dir, exist_ok=True)

    base_name = os.path.splitext(os.path.basename(context_path))[0].replace('_llama_context', '')
    
    # The final path will be inside the correct subject folder
    output_path = os.path.join(output_dir, f"{base_name}_flashcards.json")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(flashcard_json)

    print(f"Flashcards saved to: {output_path}")

if __name__ == "__main__":
    main()