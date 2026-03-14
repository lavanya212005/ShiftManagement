from datetime import datetime

from database.db import db


class TechnicianData(db.Model):
    __tablename__ = "technician_data"

    id = db.Column(db.Integer, primary_key=True)
    technician_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    voice_file_path = db.Column(db.String(500))
    transcription_text = db.Column(db.Text)
    tags = db.Column(db.JSON)  # list of {type: "problem"|"solution", label: str}
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    technician = db.relationship("User", backref="technician_data")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "technician_id": self.technician_id,
            "technician_name": self.technician.name if self.technician else None,
            "voice_file_path": self.voice_file_path,
            "transcription_text": self.transcription_text,
            "tags": self.tags or [],
            "created_at": self.created_at.isoformat(),
        }


class ChatHistory(db.Model):
    __tablename__ = "chat_history"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="chat_history")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else None,
            "question": self.question,
            "answer": self.answer,
            "timestamp": self.timestamp.isoformat(),
        }
