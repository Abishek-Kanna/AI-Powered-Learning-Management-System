# backend/llama_context_generator.py

import json
import sys
from ollama import Client

client = Client(host='http://localhost:11434')

def load_blocks(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def generate_context(text):
    prompt = f"""
You are an expert education assistant. The following is extracted text from a subject PDF. atleast 5 subtopics about the fundamentals of the concept extracted. send only this and don't send anything else and don't send code even if the topic is coding.
Please identify important concepts as bullet points. For each bullet, provide a detailed paragraph explanation in simple educational language.
Provide me atleast 5 or more than that as subtopics specifically the fundamentals of the concept with keypoints. 
Text:
{text}

Respond in this format:

• Concept 1  
  points+Explanation...

• Concept 2  
  points+Explanation...
  .
  .
  .
  .
• Concept ( n number of times )
    points+Explanation...
    """
    response = client.chat(model="gemma3", messages=[
        {"role": "user", "content": prompt}
    ])
    return response['message']['content']

def main(json_path):
    print(f"Reading: {json_path}")
    blocks = load_blocks(json_path)

    combined_text = "\n".join(block["text"] for block in blocks if block["type"] in ["title", "text", "answer"])
    if not combined_text.strip():
        print("No valid content found to process.")
        return

    print("Generating context using LLaMA...")
    result = generate_context(combined_text)

    out_path = json_path.replace("_labeled.json", "_llama_context.txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(result)

    print(f"Saved context: {out_path}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python llama_context_generator.py <labeled_json_path>")
    else:
        main(sys.argv[1])
