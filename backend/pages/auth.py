# backend/auth.py
from db import db
from datetime import datetime
import hashlib
import os
from bson import ObjectId
from fastapi import HTTPException
import jwt
from typing import Optional

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
JWT_ALGORITHM = "HS256"

class AuthManager:
    @staticmethod
    def register_user(username: str, email: str, password: str, role: str):
        """Register a new user with proper validation"""
        # Validation checks
        if not all([username, email, password, role]):
            raise HTTPException(status_code=400, detail="All fields are required")
        
        if role not in ["student", "teacher"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        
        if len(password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

        # Check if user exists
        if db.users.find_one({"$or": [{"username": username}, {"email": email}]}):
            raise HTTPException(status_code=400, detail="Username or email already exists")

        # Hash password
        salt = os.urandom(32)
        key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt,
            100000
        )
        
        user_data = {
            "username": username,
            "email": email,
            "role": role,
            "salt": salt.hex(),
            "key": key.hex(),
            "created_at": datetime.now(),
            "last_login": None
        }
        
        result = db.users.insert_one(user_data)
        return str(result.inserted_id)

    @staticmethod
    def login_user(username: str, password: str):
        """Authenticate user and return JWT token"""
        user = db.users.find_one({"username": username})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password
        key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            bytes.fromhex(user["salt"]),
            100000
        )
        
        if key.hex() != user["key"]:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Update last login
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.now()}}
        )

        # Generate JWT token
        token = jwt.encode({
            "id": str(user["_id"]),
            "username": user["username"],
            "role": user["role"],
            "exp": datetime.now() + timedelta(days=7)
        }, JWT_SECRET, algorithm=JWT_ALGORITHM)

        return {
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "username": user["username"],
                "role": user["role"],
                "email": user["email"]
            }
        }

    @staticmethod
    def verify_token(token: str) -> Optional[dict]:
        """Verify JWT token and return payload if valid"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.PyJWTError:
            return None