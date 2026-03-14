from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify

from database.db import db
from models.user import User
from models.technician_data import TechnicianData, ChatHistory
from utils.auth_middleware import admin_only

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


# ── Users ──────────────────────────────────────────────────────────────────────

@admin_bp.route("/users", methods=["GET"])
@admin_only
def get_users(current_user):
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({"status": "success", "data": [u.to_dict() for u in users]}), 200


@admin_bp.route("/create-user", methods=["POST"])
@admin_only
def create_user(current_user):
    data = request.get_json() or {}
    required = ["name", "email", "username", "password", "role"]
    for field in required:
        if not data.get(field):
            return jsonify({"status": "error", "message": f"'{field}' is required"}), 400

    if data["role"] not in ("admin", "senior", "junior"):
        return jsonify({"status": "error", "message": "Role must be admin, senior, or junior"}), 400

    if User.query.filter_by(email=data["email"].lower()).first():
        return jsonify({"status": "error", "message": "Email already exists"}), 409

    if User.query.filter_by(username=data["username"].lower()).first():
        return jsonify({"status": "error", "message": "Username already taken"}), 409

    user = User(
        name=data["name"].strip(),
        email=data["email"].strip().lower(),
        username=data["username"].strip().lower(),
        role=data["role"],
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    return jsonify({"status": "success", "data": {"user": user.to_dict()}}), 201


@admin_bp.route("/delete-user/<int:user_id>", methods=["DELETE"])
@admin_only
def delete_user(current_user, user_id):
    if current_user.id == user_id:
        return jsonify({"status": "error", "message": "You cannot delete your own account"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({"status": "success", "message": "User deleted successfully"}), 200


# ── Knowledge / data ───────────────────────────────────────────────────────────

@admin_bp.route("/technician-data", methods=["GET"])
@admin_only
def get_technician_data(current_user):
    records = TechnicianData.query.order_by(TechnicianData.created_at.desc()).all()
    return jsonify({"status": "success", "data": [r.to_dict() for r in records]}), 200


@admin_bp.route("/chat-history", methods=["GET"])
@admin_only
def get_chat_history(current_user):
    records = ChatHistory.query.order_by(ChatHistory.timestamp.desc()).all()
    return jsonify({"status": "success", "data": [r.to_dict() for r in records]}), 200


# ── Dashboard stats ────────────────────────────────────────────────────────────

@admin_bp.route("/stats", methods=["GET"])
@admin_only
def get_stats(current_user):
    total_voice_logs = TechnicianData.query.count()
    total_queries = ChatHistory.query.count()
    resolved = ChatHistory.query.filter(ChatHistory.answer != "").count()
    resolution_rate = f"{int((resolved / total_queries * 100) if total_queries > 0 else 0)}%"

    # Downtime saved estimate: 30 min per resolved query this week
    week_ago = datetime.utcnow() - timedelta(days=7)
    weekly_resolved = ChatHistory.query.filter(
        ChatHistory.timestamp >= week_ago, ChatHistory.answer != ""
    ).count()

    return jsonify({
        "status": "success",
        "data": {
            "knowledge_graph_nodes": total_voice_logs,
            "resolution_rate_via_agent": resolution_rate,
            "downtime_saved_this_week_hours": round(weekly_resolved * 0.5, 1),
            "active_voice_logs": total_voice_logs,
            "total_users": User.query.count(),
            "total_chat_queries": total_queries,
        },
    }), 200


@admin_bp.route("/knowledge-trend", methods=["GET"])
@admin_only
def get_knowledge_trend(current_user):
    today = datetime.utcnow().date()
    trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        count = TechnicianData.query.filter(
            db.func.date(TechnicianData.created_at) == day
        ).count()
        trend.append({"day": 7 - i, "date": day.strftime("%a"), "value": count})

    return jsonify({"status": "success", "data": {"trend": trend}}), 200


@admin_bp.route("/top-machines", methods=["GET"])
@admin_only
def get_top_machines(current_user):
    keywords = ["CNC", "Boiler", "Robotic", "Conveyor", "Pump", "Sensor", "Assembly", "Valve"]
    machine_counts: dict = {}

    for chat in ChatHistory.query.all():
        for kw in keywords:
            if kw.lower() in chat.question.lower():
                machine_counts[kw] = machine_counts.get(kw, 0) + 1

    top = sorted(machine_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    result = [{"machine_name": name, "query_count": count} for name, count in top]

    # Fallback hardcoded data when DB is empty
    if not result:
        result = [
            {"machine_name": "CNC Machine Alpha", "query_count": 0},
            {"machine_name": "Boiler System 2", "query_count": 0},
            {"machine_name": "Robotic Arm Assembly B", "query_count": 0},
        ]

    return jsonify({"status": "success", "data": result}), 200
