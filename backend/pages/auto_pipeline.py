import os
import sys
import subprocess
import json
from datetime import datetime
from db import db
from bson import ObjectId

class PipelineRunner:
    def __init__(self):
        self.backend_dir = os.path.dirname(os.path.abspath(__file__))
        self.log_file = os.path.join(self.backend_dir, "pipeline_logs.txt")
        self.ensure_directories()
        self.init_logging()

    def init_logging(self):
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(f"\n\n=== New Pipeline Session {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")

    def log(self, message, status="INFO"):
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] [{status}] {message}"
        print(log_entry, flush=True)
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(log_entry + "\n")

    def ensure_directories(self):
        required_dirs = [
            "input_pdfs",
            "extracted_text",
            "generated_quizzes",
            "generated_flashcards",
            "tutor_explanations",
        ]
        for dir_name in required_dirs:
            dir_path = os.path.join(self.backend_dir, dir_name)
            os.makedirs(dir_path, exist_ok=True)

    def run_script(self, script_name, args, timeout=300):
        script_path = os.path.join(self.backend_dir, script_name)
        command = ["python", script_path] + args
        self.log(f"Executing: {' '.join(command)}")
        try:
            result = subprocess.run(command, capture_output=True, text=True, check=False, timeout=timeout)
            if result.returncode != 0:
                self.log(f"Script failed: {script_name}\nError: {result.stderr}", "ERROR")
                return False
            self.log(f"Script completed: {script_name}")
            return True
        except Exception as e:
            self.log(f"Unexpected script error: {str(e)}", "CRITICAL")
            return False

    def validate_file(self, path, description):
        if not os.path.exists(path):
            self.log(f"Missing {description} file: {path}", "ERROR")
            return False
        return True

    def cleanup_artifacts(self, artifacts):
        for filepath in artifacts.values():
            if os.path.exists(filepath):
                os.remove(filepath)

    def execute_pipeline(self, input_pdf, material_id):
        artifacts = {}
        try:
            self.log(f"Starting pipeline for PDF: {input_pdf} with Material ID: {material_id}")
            pdf_path = os.path.join(self.backend_dir, input_pdf)
            
            if not os.path.isfile(pdf_path):
                raise ValueError(f"PDF not found: {pdf_path}")

            base_name = os.path.splitext(os.path.basename(input_pdf))[0]
            safe_name = base_name.replace(" ", "_").replace(",", "")
            subject = os.path.basename(os.path.dirname(input_pdf))

            artifacts = {
                "extracted_json": os.path.join(self.backend_dir, f"extracted_text/{subject}/{safe_name}_labeled.json"),
                "context_txt": os.path.join(self.backend_dir, f"extracted_text/{subject}/{safe_name}_llama_context.txt"),
                "quiz_json": os.path.join(self.backend_dir, f"generated_quizzes/{subject}/{safe_name}_quiz.json"),
                "flashcards_json": os.path.join(self.backend_dir, f"generated_flashcards/{subject}/{safe_name}_flashcards.json")
            }
            for path in artifacts.values():
                os.makedirs(os.path.dirname(path), exist_ok=True)

            if not self.run_script("extract.py", [pdf_path, subject]) or not self.validate_file(artifacts["extracted_json"], "extracted text"):
                raise ValueError("PDF extraction failed")

            if not self.run_script("context_generator.py", [artifacts["extracted_json"]]) or not self.validate_file(artifacts["context_txt"], "context text"):
                raise ValueError("Context generation failed")

            if not self.run_script("quiz_generator.py", [artifacts["context_txt"], subject, "10"]) or not self.validate_file(artifacts["quiz_json"], "quiz"):
                raise ValueError("Quiz generation failed")
                
            self.run_script("flashcard_generator.py", [artifacts["context_txt"], "10"])

            self.log("Attempting to finalize material record in database...")
            try:
                update_data = {
                    "status": "completed",
                    "completed_at": datetime.now()
                }
                with open(artifacts["quiz_json"], "r", encoding="utf-8") as f:
                    update_data["quiz_content"] = json.load(f)
                
                query_filter = {"_id": ObjectId(material_id)}
                print(f"Executing DB update with filter: {query_filter}")

                result = db.materials.update_one(
                    query_filter,
                    {"$set": update_data}
                )

                if result.modified_count == 0:
                    raise Exception("Material document was not found or not modified in the database.")

                self.log(f"Database update successful. Matched: {result.matched_count}, Modified: {result.modified_count}")

            except Exception as e:
                self.log(f"DATABASE UPDATE FAILED: {str(e)}", "CRITICAL")
                raise ValueError(f"Database update failed: {str(e)}")

            self.log(f"Pipeline completed for {input_pdf}")
            return {"status": "success", "material_id": str(material_id)}

        except Exception as e:
            error_message = f"Pipeline failed: {str(e)}"
            self.log(error_message, "CRITICAL")
            self.cleanup_artifacts(artifacts)
            
            db.materials.update_one(
                {"_id": ObjectId(material_id)},
                {"$set": {"status": "failed", "error": str(e), "failed_at": datetime.now()}}
            )
            return {"status": "error", "message": error_message}

def main():
    if len(sys.argv) != 3:
        print(json.dumps({
            "status": "error",
            "message": "Usage: python auto_pipeline.py <relative_pdf_path> <material_id>"
        }))
        sys.exit(2) 

    pdf_path_arg = sys.argv[1]
    material_id_arg = sys.argv[2]
    
    pipeline = PipelineRunner()
    result = pipeline.execute_pipeline(pdf_path_arg, material_id_arg)
    print(json.dumps(result))

if __name__ == "__main__":
    main()