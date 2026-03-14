from collections import Counter

from flask import Blueprint, request, jsonify

from database.db import db
from models.technician_data import TechnicianData, ChatHistory
from utils.auth_middleware import junior_only
from services.chatbot_service import get_chatbot_answer

junior_bp = Blueprint("junior", __name__, url_prefix="/api/junior")


@junior_bp.route("/chat", methods=["POST"])
@junior_only
def chat(current_user):
    data = request.get_json() or {}
    question = (data.get("question") or "").strip()

    if not question:
        return jsonify({"status": "error", "message": "Question is required"}), 400

    # Pull the most recent 50 knowledge entries as context
    knowledge = (
        TechnicianData.query
        .filter(TechnicianData.transcription_text.isnot(None))
        .order_by(TechnicianData.created_at.desc())
        .limit(50)
        .all()
    )
    context = [
        {
            "technician": td.technician.name if td.technician else "Unknown",
            "transcription": td.transcription_text,
            "tags": td.tags or [],
            "date": td.created_at.isoformat(),
        }
        for td in knowledge
    ]

    answer, source = get_chatbot_answer(question, context)

    history = ChatHistory(user_id=current_user.id, question=question, answer=answer)
    db.session.add(history)
    db.session.commit()

    return jsonify({
        "status": "success",
        "data": {
            "chat_id": history.id,
            "question": question,
            "answer": answer,
            "source": source,
        },
    }), 200


@junior_bp.route("/common-problems", methods=["GET"])
@junior_only
def get_common_problems(current_user):
    """Return the most commonly raised problems from the knowledge base."""
    # Gather problem tags from technician data
    problems = []
    recent_data = (
        TechnicianData.query
        .order_by(TechnicianData.created_at.desc())
        .limit(30)
        .all()
    )
    for td in recent_data:
        if td.tags:
            for tag in td.tags:
                if isinstance(tag, dict) and tag.get("type") == "problem":
                    label = tag.get("label", "").strip()
                    if label:
                        problems.append(label)

    # Deduplicate and keep top 5
    counted = Counter(problems).most_common(5)
    top_problems = [label for label, _ in counted]

    # Fallback defaults
    if not top_problems:
        top_problems = [
            "Boiler pressure dropping",
            "Robotic arm misalignment",
            "Cooling fluid leak Assembly B",
        ]

    return jsonify({"status": "success", "data": {"common_problems": top_problems}}), 200
