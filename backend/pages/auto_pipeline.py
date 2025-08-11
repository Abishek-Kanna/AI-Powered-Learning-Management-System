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
        with open(self.log_file, "a") as f:
            f.write(f"\n\n=== New Pipeline Session {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")

    def log(self, message, status="INFO"):
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] [{status}] {message}"
        print(log_entry, flush=True)
        with open(self.log_file, "a") as f:
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
            self.log(f"Ensured directory exists: {dir_path}")

    def run_script(self, script_name, args, timeout=300):
        script_path = os.path.join(self.backend_dir, script_name)
        command = ["python", script_path] + args
        
        self.log(f"Executing: {' '.join(command)}")
        start_time = datetime.now()
        
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            elapsed = (datetime.now() - start_time).total_seconds()
            
            if result.returncode != 0:
                self.log(f"Script failed: {script_name}\nError: {result.stderr}", "ERROR")
                return False
            
            self.log(f"Script completed: {script_name} (took {elapsed:.2f}s)")
            return True
            
        except subprocess.TimeoutExpired:
            self.log(f"Script timed out: {script_name}", "ERROR")
            return False
        except Exception as e:
            self.log(f"Unexpected script error: {str(e)}", "CRITICAL")
            return False

    def validate_file(self, path, description):
        if not os.path.exists(path):
            self.log(f"Missing {description} file: {path}", "ERROR")
            return False
        if os.path.getsize(path) == 0:
            self.log(f"Empty {description} file: {path}", "ERROR")
            return False
        return True

    def cleanup_artifacts(self, artifacts):
        """Remove partially generated files on failure"""
        for filepath in artifacts.values():
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
                    self.log(f"Cleaned up: {filepath}", "DEBUG")
            except Exception as e:
                self.log(f"Failed to cleanup {filepath}: {str(e)}", "WARNING")

    def execute_pipeline(self, input_pdf, user_id=None):
        artifacts = {}
        material_id = None
        
        try:
            self.log(f"Starting pipeline for: {input_pdf}")
            pdf_path = os.path.join(self.backend_dir, input_pdf)
            
            if not os.path.isfile(pdf_path):
                self.log(f"PDF not found: {pdf_path}", "ERROR")
                return {"status": "error", "message": f"PDF not found: {pdf_path}"}

            base_name = os.path.splitext(os.path.basename(input_pdf))[0]
            safe_name = base_name.replace(" ", "_").replace(",", "")
            subject = os.path.basename(os.path.dirname(input_pdf))

            # Initialize artifacts paths
            artifacts = {
                "extracted_json": f"extracted_text/{subject}/{safe_name}_labeled.json",
                "context_txt": f"extracted_text/{subject}/{safe_name}_llama_context.txt",
                "quiz_json": f"generated_quizzes/{subject}/{safe_name}_quiz.json",
                "flashcards_json": f"generated_flashcards/{subject}/{safe_name}_flashcards.json"
            }

            # Ensure subject directories exist
            for path in artifacts.values():
                os.makedirs(os.path.dirname(path), exist_ok=True)

            # Create database record
            try:
                material_data = {
                    "original_filename": os.path.basename(input_pdf),
                    "safe_name": safe_name,
                    "subject": subject,
                    "uploaded_at": datetime.now(),
                    "uploaded_by": ObjectId(user_id) if user_id else None,
                    "status": "processing",
                    "artifacts": artifacts
                }
                material_id = db.materials.insert_one(material_data).inserted_id
                self.log(f"Created material record: {material_id}")
            except Exception as e:
                self.log(f"MongoDB insert failed: {str(e)}", "CRITICAL")
                return {"status": "error", "message": "Database operation failed"}

            # PDF Extraction
            self.log("=== PDF EXTRACTION ===")
            if not self.run_script("extract.py", [pdf_path]):
                self.cleanup_artifacts(artifacts)
                db.materials.update_one(
                    {"_id": material_id},
                    {"$set": {"status": "failed", "error": "PDF extraction failed"}}
                )
                return {"status": "error", "message": "Extraction failed"}

            if not self.validate_file(artifacts["extracted_json"], "extracted text"):
                self.cleanup_artifacts(artifacts)
                db.materials.update_one(
                    {"_id": material_id},
                    {"$set": {"status": "failed", "error": "Extracted text validation failed"}}
                )
                return {"status": "error", "message": "Extracted text validation failed"}

            # Context Generation
            self.log("=== CONTEXT GENERATION ===")
            if not self.run_script("context_generator.py", [artifacts["extracted_json"]]):
                self.cleanup_artifacts(artifacts)
                db.materials.update_one(
                    {"_id": material_id},
                    {"$set": {"status": "failed", "error": "Context generation failed"}}
                )
                return {"status": "error", "message": "Context generation failed"}

            if not self.validate_file(artifacts["context_txt"], "context text"):
                self.cleanup_artifacts(artifacts)
                db.materials.update_one(
                    {"_id": material_id},
                    {"$set": {"status": "failed", "error": "Context validation failed"}}
                )
                return {"status": "error", "message": "Context validation failed"}

            # Quiz Generation
            self.log("=== QUIZ GENERATION ===")
            if not self.run_script("quiz_generator.py", [artifacts["context_txt"], "10"]):
                self.cleanup_artifacts(artifacts)
                db.materials.update_one(
                    {"_id": material_id},
                    {"$set": {"status": "failed", "error": "Quiz generation failed"}}
                )
                return {"status": "error", "message": "Quiz generation failed"}

            if not self.validate_file(artifacts["quiz_json"], "quiz"):
                self.cleanup_artifacts(artifacts)
                db.materials.update_one(
                    {"_id": material_id},
                    {"$set": {"status": "failed", "error": "Quiz validation failed"}}
                )
                return {"status": "error", "message": "Quiz validation failed"}

            # Flashcard Generation
            self.log("=== FLASHCARD GENERATION ===")
            if not self.run_script("flashcard_generator.py", [artifacts["context_txt"], "10"]):
                self.log("Flashcard generation failed (non-critical)", "WARNING")

            # Store quiz content in database
            update_data = {
                "status": "completed",
                "completed_at": datetime.now()
            }

            try:
                with open(artifacts["quiz_json"], "r") as f:
                    update_data["quiz_content"] = json.load(f)
                
                # Link to user's account if available
                if user_id:
                    db.users.update_one(
                        {"_id": ObjectId(user_id)},
                        {"$push": {"generated_materials": material_id}}
                    )
                
                db.materials.update_one(
                    {"_id": material_id},
                    {"$set": update_data}
                )
                
            except Exception as e:
                self.log(f"Failed to update quiz content: {str(e)}", "ERROR")
                # Non-critical failure

            self.log(f"Pipeline completed for {input_pdf}")
            return {
                "status": "success",
                "material_id": str(material_id),
                "quiz_path": artifacts["quiz_json"]
            }

        except Exception as e:
            self.log(f"Pipeline failed: {str(e)}", "CRITICAL")
            self.cleanup_artifacts(artifacts)
            
            if material_id:
                db.materials.update_one(
                    {"_id": material_id},
                    {"$set": {
                        "status": "failed",
                        "error": str(e),
                        "failed_at": datetime.now()
                    }}
                )
            return {"status": "error", "message": f"Pipeline failed: {str(e)}"}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "status": "error",
            "message": "Usage: python auto_pipeline.py <relative_pdf_path> [user_id]"
        }))
        sys.exit(1)

    user_id = sys.argv[2] if len(sys.argv) > 2 else None
    pipeline = PipelineRunner()
    result = pipeline.execute_pipeline(sys.argv[1], user_id)
    print(json.dumps(result))

if __name__ == "__main__":
    main()