import os
import sys
import subprocess
import json

class PipelineRunner:
    def __init__(self):
        self.backend_dir = os.path.dirname(os.path.abspath(__file__))
        self.ensure_directories()

    def ensure_directories(self):
        required_dirs = [
            "input_pdfs",
            "extracted_text",
            "generated_quizzes",
            "flashcards",
            "tutor_explanations",
            "user_answers"
        ]
        for dir_name in required_dirs:
            os.makedirs(os.path.join(self.backend_dir, dir_name), exist_ok=True)

    def run_script(self, script_name, args):
        script_path = os.path.join(self.backend_dir, script_name)
        command = ["python", script_path] + args
        result = subprocess.run(command, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"Error in {script_name}: {result.stderr}")
        return result.returncode == 0

    def execute_pipeline(self, input_pdf):
        try:
            pdf_path = os.path.join(self.backend_dir, input_pdf)
            if not os.path.isfile(pdf_path):
                return {"status": "error", "message": f"PDF not found: {pdf_path}"}

            base_name = os.path.splitext(os.path.basename(input_pdf))[0]
            safe_name = base_name.replace(" ", "_").replace(",", "")
            
            artifacts = {
                "extracted_json": f"extracted_text/{safe_name}_labeled.json",
                "context_txt": f"extracted_text/{safe_name}_llama_context.txt",
                "quiz_json": f"generated_quizzes/{safe_name}_quiz.json",
                "user_answers": "user_answers/user1.json"
            }

            print(json.dumps({"status": "processing", "step": "Extracting PDF"}))
            if not self.run_script("extract.py", [pdf_path]):
                return {"status": "error", "message": "Extraction failed"}

            print(json.dumps({"status": "processing", "step": "Generating context"}))
            if not self.run_script("context_generator.py", [artifacts["extracted_json"]]):
                return {"status": "error", "message": "Context generation failed"}

            print(json.dumps({"status": "processing", "step": "Generating quiz"}))
            if not self.run_script("quiz_generator.py", [artifacts["context_txt"]]):
                return {"status": "error", "message": "Quiz generation failed"}

            print(json.dumps({"status": "processing", "step": "Generating flashcards"}))
            self.run_script("flashcard_generator.py", [artifacts["context_txt"]])

            if os.path.exists(artifacts["quiz_json"]) and os.path.exists(artifacts["user_answers"]):
                print(json.dumps({"status": "processing", "step": "Running AI tutor"}))
                self.run_script("ai_tutor.py", [artifacts["quiz_json"], artifacts["user_answers"]])

            return {"status": "success", "quiz_path": artifacts["quiz_json"]}

        except Exception as e:
            return {"status": "error", "message": f"Pipeline failed: {str(e)}"}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Usage: python auto_pipeline.py <relative_pdf_path>"}))
        sys.exit(1)

    pipeline = PipelineRunner()
    result = pipeline.execute_pipeline(sys.argv[1])
    print(json.dumps(result))

if __name__ == "__main__":
    main()