import sys
import os
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

    content = response['message']['content'].strip()
    if content.startswith("```json"):
        content = content.replace("```json", "").strip()
    if content.endswith("```"):
        content = content[:-3].strip()

    return content

def main():
    if len(sys.argv) < 2:
        print("Usage: python flashcard_generator.py <context_txt_path> [num_flashcards]")
        sys.exit(1)
    
    context_path = sys.argv[1]
    if not os.path.isfile(context_path):
        print(f"File not found: {context_path}")
        sys.exit(1)

    with open(context_path, "r", encoding="utf-8") as f:
        text = f.read()

    # Default number of flashcards
    num_flashcards = 10
    if len(sys.argv) >= 3:
        try:
            num_flashcards = int(sys.argv[2])
        except ValueError:
            print("Invalid num_flashcards value, using default (10).")

    print(f"Loaded context from {context_path}")
    print(f"Generating {num_flashcards} flashcards using Gemma3...")

    flashcard_json = generate_flashcards(text, num_flashcards=num_flashcards)

    # Construct output path
    os.makedirs("generated_flashcards", exist_ok=True)
    base_name = os.path.splitext(os.path.basename(context_path))[0]
    output_path = os.path.join("generated_flashcards", f"{base_name}_flashcards.json")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(flashcard_json)

    print(f"Flashcards saved to: {output_path}")

if __name__ == "__main__":
    main()
