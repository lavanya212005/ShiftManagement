import os

from flask import Flask
from flask_cors import CORS

from config import config
from database.db import db
from routes.auth_routes import auth_bp
from routes.admin_routes import admin_bp
from routes.senior_routes import senior_bp
from routes.junior_routes import junior_bp


def create_app(config_name: str = "default") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Allow React dev server (port 5173) and any other origin in dev.
    # Tighten origins in production via environment variable CORS_ORIGINS.
    allowed_origins = os.getenv("CORS_ORIGINS", "*")
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

    # Initialise SQLAlchemy
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(senior_bp)
    app.register_blueprint(junior_bp)

    # Health-check endpoint (no auth required)
    @app.route("/api/health", methods=["GET"])
    def health():
        return {"status": "success", "message": "ShiftSync API is running"}, 200

    # Create tables and seed default users on first run
    with app.app_context():
        db.create_all()
        _seed_default_users()

    return app


# ── DB seeding ─────────────────────────────────────────────────────────────────

def _seed_default_users() -> None:
    """Insert the three demo accounts that mirror the frontend mock users."""
    from models.user import User  # local import avoids circular import at module level

    if User.query.count() > 0:
        return  # already seeded

    defaults = [
        {"name": "Super Admin",       "email": "admin@shiftsync.com",  "username": "admin",  "password": "password123", "role": "admin"},
        {"name": "Senior Tech Ravi",  "email": "ravi@shiftsync.com",   "username": "senior", "password": "password123", "role": "senior"},
        {"name": "Junior Tech Arjun", "email": "arjun@shiftsync.com",  "username": "junior", "password": "password123", "role": "junior"},
    ]

    for info in defaults:
        user = User(
            name=info["name"],
            email=info["email"],
            username=info["username"],
            role=info["role"],
        )
        user.set_password(info["password"])
        db.session.add(user)

    db.session.commit()
    print("[ShiftSync] Default users seeded (admin / senior / junior — password: password123)")


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    env = os.getenv("FLASK_ENV", "development")
    application = create_app(env)
    application.run(host="0.0.0.0", port=5000, debug=(env == "development"))
