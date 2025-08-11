from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

class Database:
    def __init__(self):
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
        db_name = "MCQ-Homemade"
        
        # --- DEBUG LOGS ---
        print("--- Python DB Connection ---")
        print(f"Attempting to connect to MONGO_URI: {mongo_uri}")
        print(f"Using database: {db_name}")
        # --- END DEBUG LOGS ---
        
        self.client = MongoClient(mongo_uri)
        self.db = self.client[db_name]
        
        # Collections
        self.users = self.db["users"]
        self.quizzes = self.db["quizzes"]
        self.flashcards = self.db["flashcards"]
        self.materials = self.db["materials"]
        
    def create_user(self, user_data):
        if self.users.find_one({"username": user_data["username"]}):
            raise ValueError("Username already exists")
        user_data["created_at"] = datetime.now()
        user_data["last_login"] = datetime.now()
        result = self.users.insert_one(user_data)
        return result.inserted_id
    
    def save_quiz_attempt(self, user_id, quiz_data):
        quiz_data["user_id"] = user_id
        quiz_data["completed_at"] = datetime.now()
        return self.quizzes.insert_one(quiz_data)
    
    def save_flashcard_session(self, user_id, session_data):
        session_data["user_id"] = user_id
        session_data["completed_at"] = datetime.now()
        return self.flashcards.insert_one(session_data)
    
    def save_generated_material(self, material_data):
        return self.materials.insert_one(material_data)

db = Database()