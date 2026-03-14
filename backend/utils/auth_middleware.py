import jwt
from functools import wraps

from flask import request, jsonify, current_app

from models.user import User


def _decode_token():
    """Extract and decode JWT from Authorization header. Returns (user, error_response)."""
    auth_header = request.headers.get("Authorization", "")
    parts = auth_header.split()

    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None, (jsonify({"status": "error", "message": "Authorization token missing or malformed"}), 401)

    token = parts[1]
    try:
        payload = jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None, (jsonify({"status": "error", "message": "Token has expired"}), 401)
    except jwt.InvalidTokenError:
        return None, (jsonify({"status": "error", "message": "Invalid token"}), 401)

    user = User.query.get(payload.get("user_id"))
    if not user:
        return None, (jsonify({"status": "error", "message": "User not found"}), 401)

    return user, None


def token_required(f):
    """Require any authenticated user."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user, err = _decode_token()
        if err:
            return err
        return f(user, *args, **kwargs)
    return decorated


def admin_only(f):
    """Require admin role."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user, err = _decode_token()
        if err:
            return err
        if user.role != "admin":
            return jsonify({"status": "error", "message": "Admin access required"}), 403
        return f(user, *args, **kwargs)
    return decorated


def senior_only(f):
    """Require senior or admin role."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user, err = _decode_token()
        if err:
            return err
        if user.role not in ("senior", "admin"):
            return jsonify({"status": "error", "message": "Senior technician access required"}), 403
        return f(user, *args, **kwargs)
    return decorated


def junior_only(f):
    """Require junior or admin role."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user, err = _decode_token()
        if err:
            return err
        if user.role not in ("junior", "admin"):
            return jsonify({"status": "error", "message": "Junior technician access required"}), 403
        return f(user, *args, **kwargs)
    return decorated
