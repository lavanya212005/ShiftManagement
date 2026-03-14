import datetime

import jwt
from flask import Blueprint, request, jsonify, current_app

from database.db import db
from models.user import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"status": "error", "message": "Username and password are required"}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({"status": "error", "message": "Invalid username or password"}), 401

    expires = datetime.datetime.utcnow() + datetime.timedelta(
        hours=current_app.config["JWT_ACCESS_TOKEN_EXPIRES_HOURS"]
    )
    token = jwt.encode(
        {"user_id": user.id, "role": user.role, "exp": expires},
        current_app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )

    return jsonify({
        "status": "success",
        "data": {
            "token": token,
            "user": user.to_dict(),
        },
    }), 200


@auth_bp.route("/register", methods=["POST"])
def register():
    """Open registration endpoint. Protected by admin_only in admin_routes for admin-created users."""
    data = request.get_json() or {}
    required = ["name", "email", "username", "password", "role"]
    for field in required:
        if not data.get(field):
            return jsonify({"status": "error", "message": f"'{field}' is required"}), 400

    if data["role"] not in ("admin", "senior", "junior"):
        return jsonify({"status": "error", "message": "Role must be admin, senior, or junior"}), 400

    if User.query.filter_by(email=data["email"].lower()).first():
        return jsonify({"status": "error", "message": "Email is already registered"}), 409

    if User.query.filter_by(username=data["username"].lower()).first():
        return jsonify({"status": "error", "message": "Username is already taken"}), 409

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
