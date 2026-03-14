import os

from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename

from database.db import db
from models.technician_data import TechnicianData
from utils.auth_middleware import senior_only
from services.speech_service import transcribe_audio

senior_bp = Blueprint("senior", __name__, url_prefix="/api/senior")

ALLOWED_EXTENSIONS = {"wav", "mp3", "mp4", "ogg", "webm", "m4a", "flac"}


def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@senior_bp.route("/upload-voice", methods=["POST"])
@senior_only
def upload_voice(current_user):
    if "audio" not in request.files:
        return jsonify({"status": "error", "message": "No audio file provided (field name: 'audio')"}), 400

    file = request.files["audio"]
    if not file.filename:
        return jsonify({"status": "error", "message": "No file selected"}), 400

    if not _allowed(file.filename):
        return jsonify({"status": "error", "message": f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    upload_dir = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_dir, exist_ok=True)

    safe_name = secure_filename(f"user{current_user.id}_{file.filename}")
    file_path = os.path.join(upload_dir, safe_name)
    file.save(file_path)

    transcription, tags = transcribe_audio(file_path)

    record = TechnicianData(
        technician_id=current_user.id,
        voice_file_path=file_path,
        transcription_text=transcription,
        tags=tags,
    )
    db.session.add(record)
    db.session.commit()

    return jsonify({
        "status": "success",
        "data": {
            "record_id": record.id,
            "transcription": transcription,
            "tags": tags,
        },
    }), 200


@senior_bp.route("/save-insight", methods=["POST"])
@senior_only
def save_insight(current_user):
    """Save a manually entered or confirmed transcription insight."""
    data = request.get_json() or {}
    transcription = (data.get("transcription") or "").strip()

    if not transcription:
        return jsonify({"status": "error", "message": "Transcription text is required"}), 400

    record = TechnicianData(
        technician_id=current_user.id,
        voice_file_path=None,
        transcription_text=transcription,
        tags=data.get("tags", []),
    )
    db.session.add(record)
    db.session.commit()

    return jsonify({"status": "success", "data": {"record": record.to_dict()}}), 201


@senior_bp.route("/logs", methods=["GET"])
@senior_only
def get_logs(current_user):
    """Return the current senior technician's recent logs."""
    logs = (
        TechnicianData.query
        .filter_by(technician_id=current_user.id)
        .order_by(TechnicianData.created_at.desc())
        .limit(20)
        .all()
    )
    return jsonify({"status": "success", "data": [log.to_dict() for log in logs]}), 200
