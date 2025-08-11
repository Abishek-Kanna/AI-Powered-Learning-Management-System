import os
import sys
import json
from PIL import Image
import pytesseract
import fitz
from ollama import Client

def extract_text_blocks(pdf_path):
    # This function is correct, no changes needed here.
    doc = fitz.open(pdf_path)
    blocks = []
    for page_num, page in enumerate(doc):
        pix = page.get_pixmap(dpi=300)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        text = pytesseract.image_to_string(img)
        if text.strip():
            blocks.append({
                "page": page_num + 1,
                "bbox": None,
                "text": text.strip(),
                "type": "unknown"
            })
    return blocks

def classify_text_blocks_llama(blocks):
    # This function is correct, no changes needed here.
    client = Client(host='http://localhost:11434')
    labeled_blocks = []
    for block in blocks:
        prompt = f"""Classify this text block into ["title", "question", "option", "answer", "text", "header"]:\n{block['text']}\nRespond with only the label."""
        response = client.chat(model="gemma3", messages=[{"role": "user", "content": prompt}])
        label = response["message"]["content"].strip().lower()
        block["type"] = label if label in ["title", "question", "option", "answer", "text", "header"] else "text"
        labeled_blocks.append(block)
    return labeled_blocks

def main():
    # UPDATED: Now expects 2 arguments: pdf_path and subject
    if len(sys.argv) != 3:
        print("Usage: python extract.py <PDF_PATH> <SUBJECT>")
        sys.exit(1)

    pdf_path = os.path.abspath(sys.argv[1])
    subject = sys.argv[2] # The subject (e.g., "python") is now an argument

    if not os.path.isfile(pdf_path):
        print(f"Error: PDF not found at {pdf_path}")
        sys.exit(1)

    print(f"Extracting text from: {os.path.basename(pdf_path)}")
    blocks = extract_text_blocks(pdf_path)
    labeled = classify_text_blocks_llama(blocks)

    # UPDATED: The output directory now includes the subject subfolder
    output_dir = os.path.join(os.path.dirname(__file__), "extracted_text", subject)
    os.makedirs(output_dir, exist_ok=True)
    
    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    output_path = os.path.join(output_dir, f"{base_name}_labeled.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(labeled, f, indent=2, ensure_ascii=False)

    print(f"Success: Output saved to {output_path}")

if __name__ == "__main__":
    main()