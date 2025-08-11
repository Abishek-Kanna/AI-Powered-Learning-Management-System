from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

class Database:
    def __init__(self):
        self.client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017/"))
        self.db = self.client["mcq_homemade"]
        
        # Collections
        self.users = self.db["users"]
        self.quizzes = self.db["quizzes"]
        self.flashcards = self.db["flashcards"]
        self.materials = self.db["study_materials"]
        
    # User management
    def create_user(self, user_data):
        """Create a new user account"""
        if self.users.find_one({"username": user_data["username"]}):
            raise ValueError("Username already exists")
        
        user_data["created_at"] = datetime.now()
        user_data["last_login"] = datetime.now()
        result = self.users.insert_one(user_data)
        return result.inserted_id
    
    # Quiz management
    def save_quiz_attempt(self, user_id, quiz_data):
        """Save a quiz attempt"""
        quiz_data["user_id"] = user_id
        quiz_data["completed_at"] = datetime.now()
        return self.quizzes.insert_one(quiz_data)
    
    # Flashcard management
    def save_flashcard_session(self, user_id, session_data):
        """Save flashcard session results"""
        session_data["user_id"] = user_id
        session_data["completed_at"] = datetime.now()
        return self.flashcards.insert_one(session_data)
    
    # Study material management
    def save_generated_material(self, material_data):
        """Save generated study materials"""
        return self.materials.insert_one(material_data)

# Singleton database instance
db = Database()