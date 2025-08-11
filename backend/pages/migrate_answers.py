import os
import json
from db import db
from bson import ObjectId
import datetime

def migrate_answers():
    for filename in os.listdir('user_answers'):
        if filename.endswith('.json'):
            user_id = filename.split('.')[0]  # Assuming filename is userid.json
            with open(f'user_answers/{filename}') as f:
                answers = json.load(f)
            
            db.user_answers.insert_one({
                "user_id": ObjectId(user_id),
                "answers": answers,
                "migrated_at": datetime.now()
            })